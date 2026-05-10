import csv
import io
import logging
from collections import Counter, defaultdict
from urllib.parse import quote

from django.conf import settings
from django.core.paginator import EmptyPage, Paginator
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.hashers import make_password, check_password
from django.core import signing
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.db.utils import OperationalError, ProgrammingError
from .models import Invitation, Event
from .serializers import (
    InvitationSerializer,
    InvitationCreateSerializer,
    CheckInSerializer,
    EventSerializer,
    SetSecurityPinSerializer,
)
from invitations.twilio_service import TwilioWhatsAppSender

logger = logging.getLogger(__name__)

SECURITY_TOKEN_MAX_AGE = 43200  # 12 hours in seconds


def media_storage_unavailable_response(detail: str) -> Response | None:
    if settings.IS_VERCEL and not settings.USE_S3_STORAGE:
        return Response(
            {'detail': detail},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


def _rate(numerator: int, denominator: int) -> float:
    return round((numerator / denominator * 100), 1) if denominator else 0.0


def _hour_label(hour: int) -> str:
    meridiem = 'AM' if hour < 12 else 'PM'
    display_hour = hour % 12 or 12
    return f'{display_hour}:00 {meridiem}'


def _generate_whatsapp_link(invitation: Invitation, event: Event) -> str:
    """Generate a WhatsApp share link for a guest invitation."""
    invitation_url = invitation.get_invitation_url()

    # Use event's WhatsApp message template if available, otherwise use default
    message_template = event.whatsapp_message_template.strip() if event.whatsapp_message_template else ''
    if not message_template:
        # Use placeholder template consistent with custom templates
        message_template = "{name} invited you! 🎉\nView your invitation: {link}"

    # Replace placeholders with actual values
    message_template = message_template.replace('{name}', invitation.name)
    message_template = message_template.replace('{link}', invitation_url)

    # Encode message for URL
    encoded_message = quote(message_template)

    # Return wa.me link with phone number if available
    if invitation.phone_number:
        # Remove any non-digit characters from phone number
        phone = ''.join(filter(str.isdigit, invitation.phone_number))
        return f"https://wa.me/{phone}?text={encoded_message}"
    else:
        # Fallback to wa.me without phone number
        return f"https://wa.me/?text={encoded_message}"


def _normalise_csv_header(value: str | None) -> str:
    return (value or '').strip().lower()


def _normalise_csv_row(row: dict) -> dict[str, str]:
    return {
        _normalise_csv_header(key): (value or '').strip()
        for key, value in row.items()
        if key is not None
    }


def _build_invitation_analytics(user):
    events = list(
        Event.objects.filter(owner=user).order_by('-date', '-created_at')
    )
    invitations = list(
        Invitation.objects.filter(event__owner=user)
        .select_related('event')
        .order_by('created_at')
    )

    invitations_by_event: dict[str, list[Invitation]] = defaultdict(list)
    tag_totals: dict[str, dict[str, int | str | float]] = {}
    hourly_counts: Counter[int] = Counter()

    total_opens = 0
    total_viewed = 0
    total_whatsapp_shares = 0
    total_link_shares = 0
    total_checked_in = 0

    for invitation in invitations:
        invitations_by_event[str(invitation.event_id)].append(invitation)
        total_opens += invitation.view_count
        total_whatsapp_shares += invitation.whatsapp_share_count
        total_link_shares += invitation.link_share_count

        if invitation.first_viewed_at or invitation.view_count > 0:
            total_viewed += 1

        if invitation.checked_in:
            total_checked_in += 1

        tag_label = invitation.tag.strip() or 'Uncategorized'
        bucket = tag_totals.setdefault(tag_label, {
            'tag': tag_label,
            'count': 0,
            'checked_in': 0,
        })
        bucket['count'] += 1
        if invitation.checked_in:
            bucket['checked_in'] += 1

        if invitation.checked_in_at:
            local_hour = timezone.localtime(invitation.checked_in_at).hour
            hourly_counts[local_hour] += 1

    total_sent = len(invitations)
    total_pending = total_sent - total_checked_in

    event_comparison = []
    for event in events:
        event_invitations = invitations_by_event.get(str(event.id), [])
        invitations_sent = len(event_invitations)
        viewed_invitations = sum(
            1 for invitation in event_invitations
            if invitation.first_viewed_at or invitation.view_count > 0
        )
        invitation_opens = sum(invitation.view_count for invitation in event_invitations)
        whatsapp_shares = sum(invitation.whatsapp_share_count for invitation in event_invitations)
        link_shares = sum(invitation.link_share_count for invitation in event_invitations)
        checked_in = sum(1 for invitation in event_invitations if invitation.checked_in)
        pending = invitations_sent - checked_in

        event_comparison.append({
            'event_id': str(event.id),
            'event_name': event.name,
            'event_date': str(event.date),
            'invitations_sent': invitations_sent,
            'viewed_invitations': viewed_invitations,
            'invitation_opens': invitation_opens,
            'whatsapp_shares': whatsapp_shares,
            'link_shares': link_shares,
            'total_shares': whatsapp_shares + link_shares,
            'checked_in': checked_in,
            'pending': pending,
            'view_rate': _rate(viewed_invitations, invitations_sent),
            'check_in_rate': _rate(checked_in, invitations_sent),
        })

    event_comparison.sort(
        key=lambda row: (row['invitations_sent'], row['event_date'], row['event_name']),
        reverse=True,
    )

    tag_breakdown = []
    for item in sorted(tag_totals.values(), key=lambda row: (row['count'], row['tag']), reverse=True):
        count = int(item['count'])
        checked_in = int(item['checked_in'])
        tag_breakdown.append({
            'tag': item['tag'],
            'count': count,
            'checked_in': checked_in,
            'pending': count - checked_in,
            'check_in_rate': _rate(checked_in, count),
        })

    hourly_distribution = [
        {'hour': hour, 'label': _hour_label(hour), 'count': hourly_counts.get(hour, 0)}
        for hour in range(24)
    ]
    peak_check_in_times = sorted(
        [item for item in hourly_distribution if item['count'] > 0],
        key=lambda item: (item['count'], -item['hour']),
        reverse=True,
    )[:5]

    return {
        'totals': {
            'total_events': len(events),
            'invitations_sent': total_sent,
            'invitation_opens': total_opens,
            'viewed_invitations': total_viewed,
            'whatsapp_shares': total_whatsapp_shares,
            'link_shares': total_link_shares,
            'total_shares': total_whatsapp_shares + total_link_shares,
            'checked_in': total_checked_in,
            'pending': total_pending,
            'check_in_rate': _rate(total_checked_in, total_sent),
            'view_rate': _rate(total_viewed, total_sent),
        },
        'funnel': {
            'created': total_sent,
            'viewed': total_viewed,
            'arrived': total_checked_in,
        },
        'guest_status': {
            'checked_in': total_checked_in,
            'pending': total_pending,
        },
        'tag_breakdown': tag_breakdown,
        'event_comparison': event_comparison,
        'peak_check_in_times': peak_check_in_times,
        'check_in_by_hour': hourly_distribution,
    }


class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer

    def get_queryset(self):
        if self.action in ('admin_undo_check_in', 'regenerate_images'):
            return Invitation.objects.all().select_related('event__owner__profile')
        queryset = Invitation.objects.filter(
            event__owner=self.request.user
        ).select_related('event__owner__profile').order_by('-created_at')

        event_id = self.request.query_params.get('event')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(seat_number__icontains=search) |
                Q(tag__icontains=search) |
                Q(phone_number__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page_size_param = request.query_params.get('page_size')
        if not page_size_param:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        try:
            page_size = min(max(int(page_size_param), 1), 100)
        except (TypeError, ValueError):
            return Response({'detail': 'page_size must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            page_number = max(int(request.query_params.get('page', 1)), 1)
        except (TypeError, ValueError):
            return Response({'detail': 'page must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        paginator = Paginator(queryset, page_size)
        try:
            page = paginator.page(page_number)
        except EmptyPage:
            page = paginator.page(paginator.num_pages or 1)

        serializer = self.get_serializer(page.object_list, many=True)
        payload = {
            'count': paginator.count,
            'page': page.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'results': serializer.data,
        }

        event_id = request.query_params.get('event')
        if event_id:
            event_queryset = Invitation.objects.filter(
                event_id=event_id,
                event__owner=request.user,
            )
            total = event_queryset.count()
            checked_in = event_queryset.filter(checked_in=True).count()
            payload['stats'] = {
                'total_invitations': total,
                'checked_in': checked_in,
                'pending': total - checked_in,
                'check_in_rate': _rate(checked_in, total),
            }

        return Response(payload)

    def get_permissions(self):
        if self.action in ('retrieve', 'check_in', 'track_share'):
            # Guests can view their invitation; check_in handles its own auth logic
            return []
        if self.action in ('admin_undo_check_in', 'regenerate_images'):
            # Only Django admin/staff users
            return [IsAdminUser()]
        # Everything else (list, create, update, destroy, stats) requires auth
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return InvitationCreateSerializer
        return InvitationSerializer

    def create(self, request, *args, **kwargs):
        storage_error = media_storage_unavailable_response(
            'Invitation image generation requires S3 storage on Vercel.'
            'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_STORAGE_BUCKET_NAME first.'
        )
        if storage_error is not None:
            return storage_error
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        response_serializer = InvitationSerializer(invitation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """
        Public endpoint — any guest can view their invitation by ID.
        Bypasses the owner-scoped queryset used for organizer actions.
        """
        invitation = get_object_or_404(
            Invitation.objects.select_related('event__owner__profile'),
            pk=kwargs['pk'],
        )
        if request.query_params.get('track_view') == '1':
            invitation.record_view()
        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[], authentication_classes=[])
    def track_share(self, request, pk=None):
        invitation = get_object_or_404(
            Invitation.objects.select_related('event__owner__profile'),
            pk=pk,
        )
        channel = str(request.data.get('channel', '')).strip().lower()

        if channel not in {'whatsapp', 'link'}:
            return Response(
                {'detail': 'channel must be either "whatsapp" or "link".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.record_share(channel)
        return Response({
            'channel': channel,
            'whatsapp_share_count': invitation.whatsapp_share_count,
            'link_share_count': invitation.link_share_count,
        })

    @action(detail=True, methods=['post'], permission_classes=[])
    def check_in(self, request, pk=None):
        """
        Check in a guest. Requires either a valid X-Security-Token header
        (scoped to the invitation's event) or an authenticated organizer who
        owns the event. Once checked in, cannot be undone by the guest.
        Only admin can undo via the admin panel.
        """
        invitation = get_object_or_404(Invitation, pk=pk)
        token = request.headers.get('X-Security-Token')

        if token:
            try:
                payload = signing.loads(token, salt='security-checkin', max_age=SECURITY_TOKEN_MAX_AGE)
            except signing.SignatureExpired:
                return Response({'detail': 'Security session expired. Please re-enter PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
            except signing.BadSignature:
                return Response({'detail': 'Invalid security token.'}, status=status.HTTP_401_UNAUTHORIZED)
            if str(payload['event_id']) != str(invitation.event_id):
                return Response({'detail': 'Token scoped to wrong event.'}, status=status.HTTP_403_FORBIDDEN)
            # organizer_id is included in the token payload for audit purposes
            # but is not enforced here — event_id scope is the security boundary
        elif request.user and request.user.is_authenticated:
            if invitation.event.owner != request.user:
                return Response({'detail': 'Not your event.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if invitation.checked_in:
            return Response(
                {'detail': 'Already checked in'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.checked_in = True
        invitation.checked_in_at = timezone.now()
        invitation.save()

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def admin_undo_check_in(self, request, pk=None):
        """
        Admin-only endpoint to undo a guest check-in.
        Requires Django staff/superuser status.
        """
        invitation = self.get_object()

        invitation.checked_in = False
        invitation.checked_in_at = None
        invitation.save()

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def regenerate_images(self, request, pk=None):
        """
        Admin-only endpoint to regenerate QR code and e-invite image.
        Requires Django staff/superuser status.
        """
        invitation = self.get_object()
        invitation.generate_qr_code()
        owner = invitation.event.owner
        show_watermark = not owner.profile.watermark_override and owner.profile.plan == 'free'
        invitation.generate_e_invite(show_watermark=show_watermark)
        invitation.save()
        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate_pending_images(self, request):
        """
        POST /api/invitations/generate_pending_images/
        Generates pending QR codes and e-invite images asynchronously.
        Accepts:
          - event: event UUID (required)
          - batch_size: number of invitations to process (default 10, max 20, optional)
        Returns:
          - processed: number of invitations processed in this call
          - remaining: number of invitations still pending
        """
        event_id = request.data.get('event')
        batch_size = request.data.get('batch_size', 10)

        if not event_id:
            return Response({'detail': 'Event is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate batch_size
        try:
            batch_size = int(batch_size)
            batch_size = max(1, min(batch_size, 20))  # clamp between 1 and 20
        except (TypeError, ValueError):
            batch_size = 10

        try:
            event = Event.objects.get(pk=event_id, owner=request.user)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Fetch pending invitations
        pending = Invitation.objects.filter(
            event=event,
            images_generated=False
        ).order_by('created_at')[:batch_size]

        processed = 0
        for invitation in pending:
            try:
                # Generate QR code if missing
                if not invitation.qr_code:
                    invitation.generate_qr_code()

                # Generate e-invite if missing
                if not invitation.e_invite_image:
                    show_watermark = True
                    try:
                        owner = invitation.event.owner
                        profile = owner.profile
                        show_watermark = not profile.watermark_override and profile.plan == 'free'
                    except Exception:
                        pass
                    invitation.generate_e_invite(show_watermark=show_watermark)

                # Save both fields if either was updated
                if not invitation.qr_code or not invitation.e_invite_image:
                    # If still missing after generation, skip this one
                    logger.warning(f'Invitation {invitation.id} missing images after generation: qr={bool(invitation.qr_code)}, e_invite={bool(invitation.e_invite_image)}')
                    continue

                # Save with both fields
                invitation.save(update_fields=['qr_code', 'e_invite_image'])

                # Refresh from DB to confirm save worked
                invitation.refresh_from_db()

                # Mark as generated only if both images are present
                if invitation.qr_code and invitation.e_invite_image:
                    Invitation.objects.filter(pk=invitation.pk).update(images_generated=True)
                    processed += 1
                else:
                    logger.warning(f'Failed to persist images for {invitation.id}')
            except Exception as e:
                logger.exception('Failed to generate images for invitation %s: %s', invitation.id, e)
                continue

        # Count remaining pending
        remaining = Invitation.objects.filter(
            event=event,
            images_generated=False
        ).count()

        return Response({
            'processed': processed,
            'remaining': remaining,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        POST /api/invitations/bulk_delete/
        Accepts:
          - event: event UUID
          - invitation_ids: list of invitation UUIDs
        Returns { deleted: N }
        """
        event_id = request.data.get('event')
        invitation_ids = request.data.get('invitation_ids')

        if not event_id:
            return Response({'detail': 'Event is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(invitation_ids, list) or not invitation_ids:
            return Response({'detail': 'invitation_ids must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(pk=event_id, owner=request.user)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = Invitation.objects.filter(
            event=event,
            id__in=invitation_ids,
        ).delete()
        return Response({'deleted': deleted}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        POST /api/invitations/bulk_import/
        Accepts a multipart form with:
          - event: event UUID
          - file: CSV with columns name, seat_number, tag, optional phone_number
        Returns { created: N, errors: [...] }
        """
        storage_error = media_storage_unavailable_response(
            'Bulk import requires Cloudinary storage on Vercel because each invitation '
            'writes QR code and e-invite media files.'
        )
        if storage_error is not None:
            return storage_error

        event_id = request.data.get('event')
        csv_file = request.FILES.get('file')

        if not event_id or not csv_file:
            return Response(
                {'detail': 'Both event and file are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event = Event.objects.get(pk=event_id, owner=request.user)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            text = csv_file.read().decode('utf-8-sig')  # utf-8-sig strips BOM from Excel exports
        except UnicodeDecodeError:
            return Response({'detail': 'File must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(text))
        required = {'name', 'seat_number', 'tag'}
        headers = {_normalise_csv_header(c) for c in (reader.fieldnames or [])}
        if not required.issubset(headers):
            return Response(
                {'detail': f'CSV must have columns: {", ".join(sorted(required))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        errors = []
        for i, row in enumerate(reader, start=2):  # row 1 is header
            row = _normalise_csv_row(row)
            name = row.get('name', '')
            seat = row.get('seat_number', '')
            tag = row.get('tag', '')
            phone_number = row.get('phone_number', '')
            if not name:
                errors.append(f'Row {i}: name is required.')
                continue
            try:
                with transaction.atomic():
                    inv = Invitation(
                        event=event,
                        name=name,
                        seat_number=seat,
                        tag=tag,
                        phone_number=phone_number,
                    )
                    inv._skip_image_generation = True
                    inv.save()
            except Exception as exc:
                logger.exception('Bulk import failed on row %s for event %s.', i, event.id)
                errors.append(f'Row {i}: could not create invitation ({exc}).')
                continue
            created += 1

        # Count total pending across the whole event (pre-existing + new)
        # so the frontend progress bar total matches what generate_pending_images will process.
        total_pending = Invitation.objects.filter(
            event=event, images_generated=False
        ).count()

        return Response({
            'created': created,
            'errors': errors,
            'pending_images': total_pending,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get invitation statistics.
        """
        try:
            qs = Invitation.objects.filter(event__owner=request.user)
            total = qs.count()
            checked_in = qs.filter(checked_in=True).count()
        except (OperationalError, ProgrammingError):
            return Response({
                'total_invitations': 0, 'checked_in': 0,
                'pending': 0, 'check_in_rate': 0,
                'warning': 'Database not initialized.'
            }, status=status.HTTP_200_OK)

        pending = total - checked_in

        return Response({
            'total_invitations': total,
            'checked_in': checked_in,
            'pending': pending,
            'check_in_rate': (checked_in / total * 100) if total > 0 else 0
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        try:
            return Response(_build_invitation_analytics(request.user))
        except (OperationalError, ProgrammingError):
            return Response({
                'totals': {
                    'total_events': 0,
                    'invitations_sent': 0,
                    'invitation_opens': 0,
                    'viewed_invitations': 0,
                    'whatsapp_shares': 0,
                    'link_shares': 0,
                    'total_shares': 0,
                    'checked_in': 0,
                    'pending': 0,
                    'check_in_rate': 0,
                    'view_rate': 0,
                },
                'funnel': {'created': 0, 'viewed': 0, 'arrived': 0},
                'guest_status': {'checked_in': 0, 'pending': 0},
                'tag_breakdown': [],
                'event_comparison': [],
                'peak_check_in_times': [],
                'check_in_by_hour': [],
                'warning': 'Database not initialized.',
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='analytics/export')
    def analytics_export(self, request):
        analytics = _build_invitation_analytics(request.user)
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(['YouAreInvited Analytics Report'])
        writer.writerow(['Generated At', timezone.now().isoformat()])
        writer.writerow([])
        writer.writerow(['Summary'])
        writer.writerow(['Metric', 'Value'])
        writer.writerow(['Total Events', analytics['totals']['total_events']])
        writer.writerow(['Invitations Sent', analytics['totals']['invitations_sent']])
        writer.writerow(['Invitation Opens', analytics['totals']['invitation_opens']])
        writer.writerow(['Viewed Invitations', analytics['totals']['viewed_invitations']])
        writer.writerow(['WhatsApp Shares', analytics['totals']['whatsapp_shares']])
        writer.writerow(['Link Shares', analytics['totals']['link_shares']])
        writer.writerow(['Checked In', analytics['totals']['checked_in']])
        writer.writerow(['Pending', analytics['totals']['pending']])
        writer.writerow(['View Rate %', analytics['totals']['view_rate']])
        writer.writerow(['Check-in Rate %', analytics['totals']['check_in_rate']])
        writer.writerow([])

        writer.writerow(['Event Comparison'])
        writer.writerow([
            'Event',
            'Date',
            'Invitations Sent',
            'Viewed Invitations',
            'Invitation Opens',
            'WhatsApp Shares',
            'Link Shares',
            'Total Shares',
            'Checked In',
            'Pending',
            'View Rate %',
            'Check-in Rate %',
        ])
        for row in analytics['event_comparison']:
            writer.writerow([
                row['event_name'],
                row['event_date'],
                row['invitations_sent'],
                row['viewed_invitations'],
                row['invitation_opens'],
                row['whatsapp_shares'],
                row['link_shares'],
                row['total_shares'],
                row['checked_in'],
                row['pending'],
                row['view_rate'],
                row['check_in_rate'],
            ])

        writer.writerow([])
        writer.writerow(['Guest Tag Breakdown'])
        writer.writerow(['Tag', 'Guests', 'Checked In', 'Pending', 'Check-in Rate %'])
        for row in analytics['tag_breakdown']:
            writer.writerow([
                row['tag'],
                row['count'],
                row['checked_in'],
                row['pending'],
                row['check_in_rate'],
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="youareinvited-analytics-report.csv"'
        return response

    @action(detail=False, methods=['post'])
    def bulk_send_whatsapp(self, request):
        """
        Bulk send WhatsApp invitation links to selected guests.

        - Pro accounts: Send via Twilio API (requires phone_number)
        - Free accounts: Generate wa.me/ links (manual send)

        POST /api/invitations/bulk_send_whatsapp/
        Accepts:
          - event: event UUID (required)
          - invitation_ids: list of invitation UUIDs (required)

        Returns:
          - invitation_count: number of invitations successfully processed
          - failed_count: number of invitations that failed to send
          - link_preview: example WhatsApp link (free) or Twilio SID (pro)
          - timestamp: ISO datetime string of when bulk send was executed
          - sent_via: 'twilio' (Pro accounts) or 'wa_me' (Free accounts)
        """
        event_id = request.data.get('event')
        invitation_ids = request.data.get('invitation_ids', [])

        if not event_id or not invitation_ids:
            return Response(
                {'detail': 'Both event and invitation_ids are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event = Event.objects.get(pk=event_id, owner=request.user)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check user's plan to determine send method
        user_plan = request.user.profile.plan if hasattr(request.user, 'profile') else 'free'
        send_via_twilio = user_plan == 'pro'

        # Fetch invitations for this event
        invitations = Invitation.objects.filter(
            event=event,
            id__in=invitation_ids
        )

        # Prepare message template
        message_template = event.whatsapp_message_template.strip() if event.whatsapp_message_template else ''
        if not message_template:
            message_template = "{name} invited you! 🎉\nView your invitation: {link}"

        # Track results
        now = timezone.now()
        updated_count = 0
        failed_count = 0
        preview_link = ''
        sent_via = 'wa_me'  # default

        if send_via_twilio:
            # Pro account: Send via Twilio
            sent_via = 'twilio'
            try:
                twilio_sender = TwilioWhatsAppSender()
            except ValueError as e:
                return Response(
                    {'detail': f'Twilio not configured: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                for invitation in invitations:
                    # Validate phone number exists
                    if not invitation.phone_number:
                        logger.warning(f"Skipping invitation {invitation.id}: no phone number provided")
                        failed_count += 1
                        continue

                    # Prepare personalized message
                    personalized_message = message_template.replace('{name}', invitation.name)
                    personalized_message = personalized_message.replace('{link}', invitation.get_invitation_url())

                    # Send via Twilio
                    success, response = twilio_sender.send_whatsapp_message(
                        invitation.phone_number,
                        personalized_message
                    )

                    if success:
                        invitation.whatsapp_sent_at = now
                        invitation.save(update_fields=['whatsapp_sent_at'])
                        updated_count += 1

                        # Use first successful send as preview
                        if not preview_link:
                            preview_link = f"Twilio SID: {response.get('sid', 'unknown')}"
                    else:
                        failed_count += 1
                        logger.error(f"Failed to send to {invitation.id}: {response.get('error')}")

        else:
            # Free account: Generate wa.me/ links
            with transaction.atomic():
                for invitation in invitations:
                    # Prepare personalized message
                    personalized_message = message_template.replace('{name}', invitation.name)
                    personalized_message = personalized_message.replace('{link}', invitation.get_invitation_url())

                    # Encode for wa.me/
                    encoded_message = quote(personalized_message)

                    # Generate wa.me link with phone number if available
                    if invitation.phone_number:
                        phone = ''.join(filter(str.isdigit, invitation.phone_number))
                        wa_link = f"https://wa.me/{phone}?text={encoded_message}"
                    else:
                        wa_link = f"https://wa.me/?text={encoded_message}"

                    # Update timestamp
                    invitation.whatsapp_sent_at = now
                    invitation.save(update_fields=['whatsapp_sent_at'])
                    updated_count += 1

                    # Use first link as preview
                    if not preview_link:
                        preview_link = wa_link

        return Response({
            'invitation_count': updated_count,
            'failed_count': failed_count,
            'link_preview': preview_link,
            'timestamp': now.isoformat(),
            'sent_via': sent_via,
        }, status=status.HTTP_200_OK)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(owner=self.request.user).select_related('owner__profile')

    def perform_create(self, serializer):
        profile = getattr(self.request.user, 'profile', None)
        default_template = getattr(profile, 'default_whatsapp_message_template', '').strip() if profile else ''
        whatsapp_template = serializer.validated_data.get('whatsapp_message_template', '').strip()

        if not whatsapp_template and default_template:
            serializer.save(
                owner=self.request.user,
                whatsapp_message_template=default_template,
            )
            return

        serializer.save(owner=self.request.user)

    def get_permissions(self):
        if self.action in ('public_info', 'verify_security_pin'):
            return []
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if request.FILES.get('background_image'):
            storage_error = media_storage_unavailable_response(
                'Template uploads require S3 storage on Vercel.'
                'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_STORAGE_BUCKET_NAME first.'
            )
            if storage_error is not None:
                return storage_error
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.FILES.get('background_image'):
            storage_error = media_storage_unavailable_response(
                'Template uploads require S3 storage on Vercel.'
                'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_STORAGE_BUCKET_NAME first.'
            )
            if storage_error is not None:
                return storage_error
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['get'], permission_classes=[], authentication_classes=[])
    def public_info(self, request, pk=None):
        event = get_object_or_404(Event.objects.select_related('owner__profile'), pk=pk)
        profile = getattr(event.owner, 'profile', None)

        if profile and profile.uses_event_branding():
            try:
                brand_logo_url = profile.brand_logo.url if profile.brand_logo else None
            except ValueError:
                brand_logo_url = None
            brand_name = profile.brand_name
            show_event_branding = True
        else:
            brand_logo_url = None
            brand_name = ''
            show_event_branding = False

        return Response({
            'id': str(event.id),
            'name': event.name,
            'date': str(event.date),
            'brand_name': brand_name,
            'brand_logo_url': brand_logo_url,
            'show_event_branding': show_event_branding,
        })

    @action(detail=True, methods=['post'], permission_classes=[], authentication_classes=[],
            throttle_classes=[AnonRateThrottle])
    def verify_security_pin(self, request, pk=None):
        event = get_object_or_404(Event, pk=pk)
        if event.security_pin is None:
            return Response({'detail': 'No security PIN configured for this event.'}, status=status.HTTP_403_FORBIDDEN)
        pin = request.data.get('pin')
        if pin is None:
            return Response({'detail': 'pin is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not check_password(pin, event.security_pin):
            return Response({'detail': 'Invalid PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
        token = signing.dumps(
            {'event_id': str(event.id), 'organizer_id': event.owner_id},
            salt='security-checkin'
        )
        return Response({'token': token})

    @action(detail=True, methods=['post'])
    def set_security_pin(self, request, pk=None):
        event = self.get_object()  # uses scoped queryset (owner=request.user)
        serializer = SetSecurityPinSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        pin = serializer.validated_data['pin']
        if pin is None:
            event.security_pin = None
            event.save()
            return Response({'security_pin_set': False})
        event.security_pin = make_password(pin)
        event.save()
        return Response({'security_pin_set': True})

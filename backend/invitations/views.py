import csv
import io

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.hashers import make_password, check_password
from django.core import signing
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from .models import Invitation, Event
from .permissions import IsAuthenticatedOrGuestDetail
from .serializers import (
    InvitationSerializer,
    InvitationCreateSerializer,
    CheckInSerializer,
    EventSerializer,
    SetSecurityPinSerializer,
)

SECURITY_TOKEN_MAX_AGE = 43200  # 12 hours in seconds


class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer

    def get_queryset(self):
        if self.action in ('admin_undo_check_in', 'regenerate_images'):
            return Invitation.objects.all().select_related('event__owner__profile')
        return Invitation.objects.filter(
            event__owner=self.request.user
        ).select_related('event__owner__profile')

    def get_permissions(self):
        if self.action in ('retrieve', 'check_in'):
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
        invitation = get_object_or_404(Invitation, pk=kwargs['pk'])
        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

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
    def bulk_import(self, request):
        """
        POST /api/invitations/bulk_import/
        Accepts a multipart form with:
          - event: event UUID
          - file: CSV with columns name, seat_number, tag
        Returns { created: N, errors: [...] }
        """
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
        if not required.issubset({c.strip().lower() for c in (reader.fieldnames or [])}):
            return Response(
                {'detail': f'CSV must have columns: {", ".join(sorted(required))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        errors = []
        for i, row in enumerate(reader, start=2):  # row 1 is header
            name = row.get('name', '').strip()
            seat = row.get('seat_number', '').strip()
            tag = row.get('tag', '').strip()
            if not name:
                errors.append(f'Row {i}: name is required.')
                continue
            Invitation.objects.create(event=event, name=name, seat_number=seat, tag=tag)
            created += 1

        return Response({'created': created, 'errors': errors}, status=status.HTTP_201_CREATED)

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


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_permissions(self):
        if self.action in ('public_info', 'verify_security_pin'):
            return []
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], permission_classes=[], authentication_classes=[])
    def public_info(self, request, pk=None):
        event = get_object_or_404(Event, pk=pk)
        return Response({
            'id': str(event.id),
            'name': event.name,
            'date': str(event.date),
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

from django.contrib.auth.models import User
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from invitations.models import Invitation, Event, KNOWN_EVENT_FEATURES


def _user_dict(user):
    """Serialize a User + UserProfile into the response shape."""
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'email': user.email,
        'plan': profile.plan if profile else 'free',
        'watermark_override': profile.watermark_override if profile else False,
        'event_count': getattr(user, 'event_count', 0),
        'invitation_count': getattr(user, 'invitation_count', 0),
        'created_at': user.date_joined.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAdminUser])
def superadmin_stats(request):
    """
    GET /api/superadmin/stats/
    Returns platform-wide counts. checkins_today uses UTC day boundaries.
    """
    today = timezone.now().date()
    checkins_today = Invitation.objects.filter(
        checked_in=True,
        checked_in_at__date=today,
    ).count()

    total_invitations = Invitation.objects.count()
    total_events = Event.objects.count()
    total_users = User.objects.count()
    total_checked_in = Invitation.objects.filter(checked_in=True).count()
    checkin_rate = (total_checked_in / total_invitations * 100) if total_invitations > 0 else 0

    return Response({
        'total_users': total_users,
        'total_events': total_events,
        'total_invitations': total_invitations,
        'checkins_today': checkins_today,
        'checkin_rate': round(checkin_rate, 1),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def superadmin_growth(request):
    """
    GET /api/superadmin/growth/
    Last 30 days of daily { date, new_users, new_events }. UTC day boundaries.
    All 30 days included — days with zero activity have counts of 0.
    """
    today = timezone.now().date()
    start = today - timedelta(days=29)

    user_counts = dict(
        User.objects.filter(date_joined__date__gte=start)
        .annotate(day=TruncDate('date_joined'))
        .values('day')
        .annotate(count=Count('id'))
        .values_list('day', 'count')
    )
    event_counts = dict(
        Event.objects.filter(created_at__date__gte=start)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .values_list('day', 'count')
    )

    growth = [
        {
            'date': (start + timedelta(days=i)).isoformat(),
            'new_users': user_counts.get(start + timedelta(days=i), 0),
            'new_events': event_counts.get(start + timedelta(days=i), 0),
        }
        for i in range(30)
    ]
    return Response(growth)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def superadmin_users(request):
    """
    GET /api/superadmin/users/
    All users with plan, watermark_override, event/invitation counts.
    No pagination — acceptable for v1 until user count exceeds ~500.
    """
    users = (
        User.objects.select_related('profile')
        .annotate(
            event_count=Count('events', distinct=True),
            invitation_count=Count('events__invitations', distinct=True),
        )
        .order_by('-date_joined')
    )
    return Response([_user_dict(u) for u in users])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def superadmin_user_detail(request, user_id):
    """
    PATCH /api/superadmin/users/{id}/ — update plan and/or watermark_override
    DELETE /api/superadmin/users/{id}/ — delete user and all associated data
    """
    try:
        user = User.objects.select_related('profile').get(pk=user_id)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        user.delete()  # CASCADE on FK removes events and invitations
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    profile = user.profile
    if 'plan' in request.data:
        if request.data['plan'] not in ('free', 'pro'):
            return Response(
                {'plan': 'Must be "free" or "pro".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.plan = request.data['plan']
    if 'watermark_override' in request.data:
        profile.watermark_override = bool(request.data['watermark_override'])
    profile.save()

    # Re-fetch with annotations for the response
    user = (
        User.objects.select_related('profile')
        .annotate(
            event_count=Count('events', distinct=True),
            invitation_count=Count('events__invitations', distinct=True),
        )
        .get(pk=user_id)
    )
    return Response(_user_dict(user))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def superadmin_user_events(request, user_id):
    """
    GET /api/superadmin/users/{id}/events/
    All events for a specific user with invitation counts.
    """
    if not User.objects.filter(pk=user_id).exists():
        return Response(status=status.HTTP_404_NOT_FOUND)

    events = (
        Event.objects.filter(owner_id=user_id)
        .annotate(invitation_count=Count('invitations'))
        .order_by('-created_at')
    )
    data = [
        {
            'id': str(e.id),
            'name': e.name,
            'date': e.date.isoformat(),
            'invitation_count': e.invitation_count,
            'has_template': e.has_template(),
        }
        for e in events
    ]
    return Response(data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def superadmin_event_detail(request, event_id):
    """
    GET  /api/superadmin/events/{uuid}/ — read event + current features
    PATCH /api/superadmin/events/{uuid}/ — merge-update event features
    """
    try:
        event = Event.objects.select_related('owner').get(pk=event_id)
    except Event.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    def _event_payload(e):
        return {
            'id': str(e.id),
            'name': e.name,
            'date': e.date.isoformat(),
            'owner_id': e.owner_id,
            'features': e.features,
        }

    if request.method == 'GET':
        return Response(_event_payload(event))

    # PATCH — validate and merge features
    if 'features' in request.data:
        incoming = request.data['features']
        if not isinstance(incoming, dict):
            return Response(
                {'features': 'Must be an object mapping feature keys to booleans.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        unknown = set(incoming.keys()) - set(KNOWN_EVENT_FEATURES.keys())
        if unknown:
            return Response(
                {'features': f'Unknown feature keys: {", ".join(sorted(unknown))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        event.features = {**event.features, **{k: bool(v) for k, v in incoming.items()}}
        event.save(update_fields=['features'])

    return Response(_event_payload(event))

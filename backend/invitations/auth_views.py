from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .account_serializers import AccountDeletionSerializer, AccountSettingsUpdateSerializer
from .models import Event, Invitation
from .serializers import EventSerializer, InvitationSerializer


def _brand_logo_url(profile):
    if not profile or not profile.brand_logo:
        return None

    try:
        return profile.brand_logo.url
    except ValueError:
        return None


def _user_payload(user):
    username = (user.username or user.email or '').strip()
    username_base = username.split('@', 1)[0] if '@' in username else username
    full_name = user.get_full_name().strip()
    raw_display_name = full_name or username_base or user.email or 'Organizer'
    normalized_display_name = raw_display_name.replace('.', ' ').replace('_', ' ').replace('-', ' ')
    display_name = ' '.join(part.capitalize() for part in normalized_display_name.split()) or 'Organizer'
    profile = getattr(user, 'profile', None)

    return {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'display_name': display_name,
        'avatar_initial': (username_base[:1] or 'U').upper(),
        'plan': profile.plan if profile else 'free',
        'brand_name': profile.brand_name if profile else '',
        'brand_logo_url': _brand_logo_url(profile),
        'show_event_branding': profile.show_branding_on_event_surfaces if profile else False,
    }


def _settings_payload(user):
    profile = getattr(user, 'profile', None)
    event_queryset = Event.objects.filter(owner=user)

    return {
        **_user_payload(user),
        'watermark_override': profile.watermark_override if profile else False,
        'default_whatsapp_message_template': (
            profile.default_whatsapp_message_template if profile else ''
        ),
        'total_events': event_queryset.count(),
        'protected_events': event_queryset.exclude(security_pin__isnull=True).exclude(security_pin='').count(),
        'frontend_url': settings.FRONTEND_URL,
        'backend_url': settings.BACKEND_URL,
        'media_storage': (
            's3' if settings.USE_S3_STORAGE else 'local'
        ) if not settings.IS_VERCEL or settings.USE_S3_STORAGE else 'unconfigured',
        'can_upload_brand_logo': (not settings.IS_VERCEL) or settings.USE_S3_STORAGE,
        'team_access_mode': 'security_pin_links',
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {'detail': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_email(email)
    except DjangoValidationError:
        return Response(
            {'detail': 'Enter a valid email address.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'An account with this email already exists.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_password(password)
    except DjangoValidationError as e:
        return Response(
            {'detail': e.messages},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=email, email=email, password=password)
    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response(
            {'detail': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'is_staff': user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        # Token invalid or already blacklisted — treat as already logged out
        pass
    return Response({'detail': 'Logged out.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(_user_payload(request.user))


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def account_settings(request):
    if request.method == 'GET':
        return Response(_settings_payload(request.user))

    if request.FILES.get('brand_logo') and settings.IS_VERCEL and not settings.USE_S3_STORAGE:
        return Response(
            {
                'detail': (
                    'Brand logo uploads require S3 storage on Vercel. '
                    'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_STORAGE_BUCKET_NAME first.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = AccountSettingsUpdateSerializer(
        request.user,
        data=request.data,
        partial=True,
        context={'user': request.user},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(_settings_payload(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_account_data(request):
    events = Event.objects.filter(owner=request.user)
    invitations = Invitation.objects.filter(event__owner=request.user).select_related('event')

    payload = {
        'exported_at': timezone.now().isoformat(),
        'account': _settings_payload(request.user),
        'events': EventSerializer(events, many=True).data,
        'invitations': InvitationSerializer(invitations, many=True).data,
    }
    response = Response(payload)
    response['Content-Disposition'] = (
        f'attachment; filename="youareinvited-account-export-{request.user.id}.json"'
    )
    return response


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    serializer = AccountDeletionSerializer(data=request.data, context={'user': request.user})
    serializer.is_valid(raise_exception=True)
    request.user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

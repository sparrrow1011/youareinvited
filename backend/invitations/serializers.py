import json
from rest_framework import serializers
from .models import Invitation


def _public_brand_payload(profile):
    if not profile or not profile.uses_event_branding():
        return {
            'show_event_branding': False,
            'brand_name': '',
            'brand_logo_url': None,
        }

    try:
        brand_logo_url = profile.brand_logo.url if profile.brand_logo else None
    except ValueError:
        brand_logo_url = None

    return {
        'show_event_branding': True,
        'brand_name': profile.brand_name,
        'brand_logo_url': brand_logo_url,
    }


class InvitationSerializer(serializers.ModelSerializer):
    event = serializers.UUIDField(source='event_id', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date = serializers.DateField(source='event.date', read_only=True)
    event_theme = serializers.CharField(source='event.theme', read_only=True)
    event_theme_data = serializers.JSONField(source='event.theme_data', read_only=True)
    event_has_template = serializers.SerializerMethodField()
    invitation_url = serializers.SerializerMethodField()
    whatsapp_share_url = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    brand_logo_url = serializers.SerializerMethodField()
    show_event_branding = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            'id',
            'event',
            'event_name',
            'event_date',
            'event_theme',
            'event_theme_data',
            'event_has_template',
            'name',
            'seat_number',
            'tag',
            'qr_code',
            'e_invite_image',
            'checked_in',
            'checked_in_at',
            'phone_number',
            'whatsapp_sent_at',
            'created_at',
            'updated_at',
            'invitation_url',
            'whatsapp_share_url',
            'brand_name',
            'brand_logo_url',
            'show_event_branding',
        ]
        read_only_fields = [
            'id', 'event', 'qr_code', 'e_invite_image',
            'checked_in_at', 'created_at', 'updated_at',
            'whatsapp_sent_at',
        ]

    def get_event_has_template(self, obj):
        return obj.event.has_template() if obj.event_id else False

    def get_invitation_url(self, obj):
        return obj.get_invitation_url()

    def get_whatsapp_share_url(self, obj):
        import urllib.parse
        invitation_url = obj.get_invitation_url()
        template = obj.event.whatsapp_message_template if obj.event_id else ''
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        brand_payload = _public_brand_payload(profile)
        if template:
            message = (
                template
                .replace('{{brand_name}}', brand_payload['brand_name'])
                .replace('{{name}}', obj.name)
                .replace('{{seat_number}}', obj.seat_number)
                .replace('{{tag}}', obj.tag)
                .replace('{{link}}', invitation_url)
            )
        else:
            greeting = (
                f"{brand_payload['brand_name']} invited you! 🎉"
                if brand_payload['show_event_branding'] and brand_payload['brand_name']
                else "You're invited! 🎉"
            )
            message = (
                f"{greeting}\n\n"
                f"Name: {obj.name}\nSeat: {obj.seat_number}\n\n"
                f"View your invitation: {invitation_url}"
            )
        return f"https://wa.me/?text={urllib.parse.quote(message)}"

    def get_brand_name(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['brand_name']

    def get_brand_logo_url(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['brand_logo_url']

    def get_show_event_branding(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['show_event_branding']


class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['name', 'seat_number', 'tag', 'event', 'phone_number', 'whatsapp_sent_at']


class CheckInSerializer(serializers.Serializer):
    checked_in = serializers.BooleanField(read_only=True)
    checked_in_at = serializers.DateTimeField(read_only=True)


from .models import Event


class SetSecurityPinSerializer(serializers.Serializer):
    pin = serializers.RegexField(r'^\d{4,6}$', allow_null=True)


class EventSerializer(serializers.ModelSerializer):
    has_security_pin = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin', 'whatsapp_message_template',
            'theme', 'theme_data',
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def get_has_security_pin(self, obj):
        return obj.security_pin is not None

    def _parse_zone(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return None
        return value

    def validate_qr_zone(self, value):
        return self._parse_zone(value)

    def validate_name_zone(self, value):
        return self._parse_zone(value)

    def validate_tag_zone(self, value):
        return self._parse_zone(value)

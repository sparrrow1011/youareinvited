import json
from rest_framework import serializers
from .models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    event = serializers.UUIDField(source='event_id', read_only=True)
    invitation_url = serializers.SerializerMethodField()
    whatsapp_share_url = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            'id',
            'event',
            'name',
            'seat_number',
            'tag',
            'qr_code',
            'e_invite_image',
            'checked_in',
            'checked_in_at',
            'created_at',
            'updated_at',
            'invitation_url',
            'whatsapp_share_url',
        ]
        read_only_fields = [
            'id', 'event', 'qr_code', 'e_invite_image',
            'checked_in_at', 'created_at', 'updated_at',
        ]

    def get_invitation_url(self, obj):
        return obj.get_invitation_url()

    def get_whatsapp_share_url(self, obj):
        invitation_url = obj.get_invitation_url()
        message = f"You're invited! 🎉\n\nName: {obj.name}\nSeat: {obj.seat_number}\n\nView your invitation: {invitation_url}"
        import urllib.parse
        return f"https://wa.me/?text={urllib.parse.quote(message)}"


class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['name', 'seat_number', 'tag', 'event']


class CheckInSerializer(serializers.Serializer):
    checked_in = serializers.BooleanField(read_only=True)
    checked_in_at = serializers.DateTimeField(read_only=True)


from .models import Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at']

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

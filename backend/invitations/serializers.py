import json
from rest_framework import serializers
from .models import Invitation, EventScheduleItem


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
    event_start_time = serializers.TimeField(source='event.start_time', read_only=True)
    event_venue_name = serializers.CharField(source='event.venue_name', read_only=True)
    event_venue_address = serializers.CharField(source='event.venue_address', read_only=True)
    event_google_maps_url = serializers.CharField(source='event.google_maps_url', read_only=True)
    event_parking_info = serializers.CharField(source='event.parking_info', read_only=True)
    event_hotel_info = serializers.CharField(source='event.hotel_info', read_only=True)
    event_travel_note = serializers.CharField(source='event.travel_note', read_only=True)
    event_theme = serializers.CharField(source='event.theme', read_only=True)
    event_theme_data = serializers.JSONField(source='event.theme_data', read_only=True)
    event_features = serializers.JSONField(source='event.features', read_only=True)
    event_schedule_items = serializers.SerializerMethodField()
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
            'event_start_time',
            'event_venue_name',
            'event_venue_address',
            'event_google_maps_url',
            'event_parking_info',
            'event_hotel_info',
            'event_travel_note',
            'event_theme',
            'event_theme_data',
            'event_features',
            'event_schedule_items',
            'event_has_template',
            'name',
            'seat_number',
            'tag',
            'table_number',
            'group_label',
            'qr_code',
            'e_invite_image',
            'checked_in',
            'checked_in_at',
            'rsvp_attending',
            'rsvp_responded_at',
            'rsvp_guest_count',
            'meal_preference',
            'allergies',
            'needs_parking',
            'needs_hotel_info',
            'rsvp_note',
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
            'whatsapp_sent_at', 'rsvp_responded_at',
        ]

    def get_event_has_template(self, obj):
        return obj.event.has_template() if obj.event_id else False

    def get_event_schedule_items(self, obj):
        return EventScheduleItemSerializer(obj.event.schedule_items.all(), many=True).data

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

        # Include phone number in wa.me link if available
        encoded_message = urllib.parse.quote(message)
        if obj.phone_number:
            phone = ''.join(filter(str.isdigit, obj.phone_number))
            return f"https://wa.me/{phone}?text={encoded_message}"
        else:
            return f"https://wa.me/?text={encoded_message}"

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
        read_only_fields = ['whatsapp_sent_at']
        extra_kwargs = {
            'name': {'required': True, 'allow_blank': False},
            'seat_number': {'required': False, 'allow_blank': True},
            'tag': {'required': False, 'allow_blank': True},
            'phone_number': {'required': False, 'allow_blank': True, 'allow_null': True},
        }


class CheckInSerializer(serializers.Serializer):
    checked_in = serializers.BooleanField(read_only=True)
    checked_in_at = serializers.DateTimeField(read_only=True)


class RSVPSerializer(serializers.Serializer):
    attending = serializers.BooleanField()
    guest_count = serializers.IntegerField(min_value=1, max_value=20, required=False, default=1)
    meal_preference = serializers.CharField(max_length=120, allow_blank=True, required=False, default='')
    allergies = serializers.CharField(max_length=500, allow_blank=True, required=False, default='')
    needs_parking = serializers.BooleanField(required=False, default=False)
    needs_hotel_info = serializers.BooleanField(required=False, default=False)
    note = serializers.CharField(max_length=500, allow_blank=True, required=False, default='')


from .models import Event


class SetSecurityPinSerializer(serializers.Serializer):
    pin = serializers.RegexField(r'^\d{4,6}$', allow_null=True)


class EventScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventScheduleItem
        fields = ['id', 'time', 'title', 'description', 'sort_order']
        read_only_fields = ['id']


class EventSerializer(serializers.ModelSerializer):
    has_security_pin = serializers.SerializerMethodField()
    schedule_items = EventScheduleItemSerializer(many=True, required=False)
    # background_image uses the default ImageField for writes (so uploads are
    # saved) and to_representation converts it to a URL for reads.

    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'start_time', 'venue_name', 'venue_address', 'google_maps_url',
            'parking_info', 'hotel_info', 'travel_note',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin', 'whatsapp_message_template',
            'theme', 'theme_data', 'schedule_items', 'features',
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def get_has_security_pin(self, obj):
        return obj.security_pin is not None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert the ImageField to a URL string (or None)
        try:
            data['background_image'] = instance.background_image.url if instance.background_image else None
        except Exception:
            data['background_image'] = None
        return data

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

    def create(self, validated_data):
        schedule_items = validated_data.pop('schedule_items', [])
        event = super().create(validated_data)
        self._replace_schedule_items(event, schedule_items)
        return event

    def update(self, instance, validated_data):
        schedule_items = validated_data.pop('schedule_items', None)
        event = super().update(instance, validated_data)
        if schedule_items is not None:
            self._replace_schedule_items(event, schedule_items)
        return event

    def _replace_schedule_items(self, event, schedule_items):
        if schedule_items is None:
            return

        event.schedule_items.all().delete()
        EventScheduleItem.objects.bulk_create([
            EventScheduleItem(
                event=event,
                time=item['time'],
                title=item['title'],
                description=item.get('description', ''),
                sort_order=item.get('sort_order', index),
            )
            for index, item in enumerate(schedule_items)
        ])

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class AccountSettingsUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(required=False, max_length=150, allow_blank=False)
    email = serializers.EmailField(required=False)
    brand_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    brand_logo = serializers.ImageField(required=False, allow_null=True)
    show_event_branding = serializers.BooleanField(required=False)
    clear_brand_logo = serializers.BooleanField(required=False, default=False)
    default_whatsapp_message_template = serializers.CharField(required=False, allow_blank=True, max_length=500)
    current_password = serializers.CharField(required=False, write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(required=False, write_only=True, trim_whitespace=False)

    def validate_display_name(self, value):
        normalized = ' '.join(value.split())
        if not normalized:
            raise serializers.ValidationError('Display name cannot be blank.')
        return normalized

    def validate_email(self, value):
        normalized = value.strip().lower()
        user = self.context['user']
        if User.objects.filter(email=normalized).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate_brand_name(self, value):
        return ' '.join(value.split())

    def validate_default_whatsapp_message_template(self, value):
        return value.strip()

    def validate(self, attrs):
        if 'watermark_override' in self.initial_data:
            raise serializers.ValidationError({
                'watermark_override': 'Watermark access is controlled by superadmin.',
            })

        current_password = attrs.get('current_password')
        new_password = attrs.get('new_password')

        if current_password or new_password:
            if not current_password or not new_password:
                raise serializers.ValidationError({
                    'new_password': 'Both current_password and new_password are required.',
                })

            user = self.context['user']
            if not user.check_password(current_password):
                raise serializers.ValidationError({
                    'current_password': 'Current password is incorrect.',
                })

            validate_password(new_password, user)

        return attrs

    def update(self, instance, validated_data):
        profile = instance.profile

        display_name = validated_data.pop('display_name', None)
        email = validated_data.pop('email', None)
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('current_password', None)

        brand_logo = validated_data.pop('brand_logo', serializers.empty)
        clear_brand_logo = validated_data.pop('clear_brand_logo', False)

        if display_name is not None:
            parts = display_name.split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        if email is not None:
            instance.email = email
            instance.username = email

        if new_password:
            instance.set_password(new_password)

        if display_name is not None or email is not None or new_password:
            instance.save()

        for field in ('brand_name', 'default_whatsapp_message_template'):
            if field in validated_data:
                setattr(profile, field, validated_data[field])

        if 'show_event_branding' in validated_data:
            profile.show_branding_on_event_surfaces = validated_data['show_event_branding']

        if clear_brand_logo and profile.brand_logo:
            profile.brand_logo.delete(save=False)
            profile.brand_logo = None

        if brand_logo is not serializers.empty:
            if profile.brand_logo:
                profile.brand_logo.delete(save=False)
            profile.brand_logo = brand_logo

        profile.save()
        return instance

    def create(self, validated_data):
        raise NotImplementedError


class AccountDeletionSerializer(serializers.Serializer):
    password = serializers.CharField(trim_whitespace=False)

    def validate_password(self, value):
        user = self.context['user']
        if not user.check_password(value):
            raise serializers.ValidationError('Password is incorrect.')
        return value

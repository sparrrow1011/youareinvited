from django.contrib import admin
from .models import Invitation, UserProfile, Event, EventGiftLink


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['name', 'seat_number', 'tag', 'rsvp_status', 'checked_in', 'checked_in_at', 'created_at']
    list_filter = ['rsvp_attending', 'rsvp_responded_at', 'checked_in', 'tag', 'created_at']
    search_fields = ['name', 'seat_number', 'tag']
    readonly_fields = ['id', 'qr_code', 'e_invite_image', 'checked_in_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Guest Information', {
            'fields': ('name', 'seat_number', 'tag')
        }),
        ('Generated Content', {
            'fields': ('qr_code', 'e_invite_image')
        }),
        ('Check-in Status', {
            'fields': ('checked_in', 'checked_in_at')
        }),
        ('RSVP Status', {
            'fields': ('rsvp_attending', 'rsvp_responded_at')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['regenerate_images', 'mark_as_checked_in', 'undo_check_in']

    def rsvp_status(self, obj):
        if not obj.rsvp_responded_at:
            return 'No RSVP'
        return 'Coming' if obj.rsvp_attending else 'Not coming'
    rsvp_status.short_description = 'RSVP'
    
    def regenerate_images(self, request, queryset):
        for invitation in queryset:
            invitation.generate_qr_code()
            invitation.generate_e_invite()
            invitation.save()
        self.message_user(request, f"Regenerated images for {queryset.count()} invitations.")
    regenerate_images.short_description = "Regenerate QR codes and e-invites"
    
    def mark_as_checked_in(self, request, queryset):
        from django.utils import timezone
        count = queryset.filter(checked_in=False).update(
            checked_in=True,
            checked_in_at=timezone.now()
        )
        self.message_user(request, f"Marked {count} invitations as checked in.")
    mark_as_checked_in.short_description = "Mark as checked in"
    
    def undo_check_in(self, request, queryset):
        count = queryset.update(checked_in=False, checked_in_at=None)
        self.message_user(request, f"Undid check-in for {count} invitations.")
    undo_check_in.short_description = "Undo check-in"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'brand_name', 'plan', 'watermark_override', 'created_at']
    list_editable = ['plan', 'watermark_override']
    search_fields = ['user__email', 'brand_name']


class EventGiftLinkInline(admin.TabularInline):
    model = EventGiftLink
    extra = 0
    fields = ['title', 'url', 'description', 'is_active', 'sort_order']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'date', 'guest_app_template', 'created_at']
    search_fields = ['name', 'owner__email']
    fields = [
        'name', 'owner', 'date', 'start_time', 'description',
        'venue_name', 'venue_address', 'google_maps_url',
        'parking_info', 'hotel_info', 'travel_note',
        'background_image', 'qr_zone', 'name_zone', 'tag_zone',
        'security_pin', 'whatsapp_message_template',
        'theme', 'theme_data', 'guest_app_template', 'features',
    ]
    inlines = [EventGiftLinkInline]

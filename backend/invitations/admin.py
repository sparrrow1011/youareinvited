from django.contrib import admin
from .models import Invitation


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['name', 'seat_number', 'tag', 'checked_in', 'checked_in_at', 'created_at']
    list_filter = ['checked_in', 'tag', 'created_at']
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
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['regenerate_images', 'mark_as_checked_in', 'undo_check_in']
    
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

from django.db import models
from django.db.models import F
import uuid
import logging
import qrcode
from io import BytesIO
from django.conf import settings
from django.core.files import File
from django.utils.text import slugify
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def user_brand_logo_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'png'
    username = instance.user.username.split('@', 1)[0] if instance.user.username else str(instance.user_id)
    return f"{slugify(username) or instance.user_id}/profile/brand-logo.{ext}"


def _safe_username(user):
    """Return a slugified, filesystem-safe version of the username."""
    raw = user.username.split('@', 1)[0] if user.username else str(user.pk)
    return slugify(raw) or str(user.pk)


def event_template_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
    return f"{_safe_username(instance.owner)}/{slugify(instance.name)}/template/background.{ext}"


def invitation_qr_path(instance, filename):
    owner = instance.event.owner
    return f"{_safe_username(owner)}/{slugify(instance.event.name)}/qr/{instance.id}.png"


def invitation_einvite_path(instance, filename):
    owner = instance.event.owner
    return f"{_safe_username(owner)}/{slugify(instance.event.name)}/invites/{instance.id}.png"


class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    brand_name = models.CharField(max_length=120, blank=True, default='')
    brand_logo = models.ImageField(upload_to=user_brand_logo_path, blank=True, null=True)
    show_branding_on_event_surfaces = models.BooleanField(default=False)
    watermark_override = models.BooleanField(default=False)
    default_whatsapp_message_template = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.plan})"

    def has_brand_identity(self):
        return bool(self.brand_name.strip() or self.brand_logo)

    def uses_event_branding(self):
        return self.show_branding_on_event_surfaces and self.has_brand_identity()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=200)
    date = models.DateField()
    description = models.CharField(max_length=500, blank=True, default='')
    background_image = models.ImageField(
        upload_to=event_template_path, blank=True, null=True
    )
    qr_zone = models.JSONField(null=True, blank=True)
    name_zone = models.JSONField(null=True, blank=True)
    tag_zone = models.JSONField(null=True, blank=True)
    security_pin = models.CharField(max_length=128, null=True, blank=True)
    whatsapp_message_template = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def has_template(self):
        return bool(
            self.background_image
            and self.qr_zone
            and self.name_zone
            and self.tag_zone
        )


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        'Event',
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    name = models.CharField(max_length=200)
    seat_number = models.CharField(max_length=50)
    tag = models.CharField(max_length=100)
    qr_code = models.ImageField(upload_to=invitation_qr_path, blank=True)
    e_invite_image = models.ImageField(upload_to=invitation_einvite_path, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    first_viewed_at = models.DateTimeField(null=True, blank=True)
    last_viewed_at = models.DateTimeField(null=True, blank=True)
    whatsapp_share_count = models.PositiveIntegerField(default=0)
    link_share_count = models.PositiveIntegerField(default=0)
    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'checked_in']),
            models.Index(fields=['event', 'first_viewed_at']),
            models.Index(fields=['event', 'checked_in_at']),
        ]

    def __str__(self):
        return f"{self.name} - Seat {self.seat_number}"

    def get_invitation_url(self):
        # Guest view page
        return f"{settings.FRONTEND_URL}/invitation/{self.id}"

    def get_security_checkin_url(self):
        return f"{settings.FRONTEND_URL}/security/event/{self.event_id}/checkin?invitation={self.id}"

    def generate_qr_code(self):
        """Generate QR code for the invitation - points to security check-in"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(self.get_security_checkin_url())
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Save to model
        filename = f'qr_{self.id}.png'
        self.qr_code.save(filename, File(buffer), save=False)
        buffer.close()

    def record_view(self):
        now = timezone.now()
        updates = {
            'view_count': F('view_count') + 1,
            'last_viewed_at': now,
        }
        if not self.first_viewed_at:
            updates['first_viewed_at'] = now

        type(self).objects.filter(pk=self.pk).update(**updates)
        self.refresh_from_db(fields=['view_count', 'first_viewed_at', 'last_viewed_at'])

    def record_share(self, channel: str):
        if channel not in {'whatsapp', 'link'}:
            raise ValueError('Unsupported share channel.')

        share_field = 'whatsapp_share_count' if channel == 'whatsapp' else 'link_share_count'
        type(self).objects.filter(pk=self.pk).update(**{share_field: F(share_field) + 1})
        self.refresh_from_db(fields=[share_field])

    def generate_e_invite(self, show_watermark: bool = True):
        """Generate e-invite image. Uses uploaded template if available, else dark-theme card."""
        if self.event_id and self.event.has_template():
            img = self._generate_from_template(show_watermark)
        else:
            img = self._generate_default_card(show_watermark)

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        filename = f'invite_{self.id}.png'
        self.e_invite_image.save(filename, File(buffer), save=False)
        buffer.close()

    @staticmethod
    def _open_storage_image(field_file) -> Image:
        """
        Read an image through Django's storage backend so both local files and
        remote backends like Cloudinary work without special URL handling.
        """
        field_file.open('rb')
        try:
            image = Image.open(field_file)
            image.load()
        finally:
            field_file.close()
        return image

    def _generate_from_template(self, show_watermark: bool) -> Image:
        """Composite guest data onto the organizer's uploaded background image."""
        bg = self._open_storage_image(self.event.background_image).convert('RGB')
        width, height = bg.size
        draw = ImageDraw.Draw(bg)

        def load_font(size):
            try:
                return ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size
                )
            except Exception:
                return ImageFont.load_default()

        def zone_to_pixels(zone):
            x = int(zone['x_pct'] * width)
            y = int(zone['y_pct'] * height)
            w = int(zone['w_pct'] * width)
            h = int(zone['h_pct'] * height)
            return x, y, w, h

        def fit_text(text, max_w, max_h):
            """Return (font, text_w, text_h) auto-sized to fill the zone box."""
            size = max(max_h, 8)
            font = load_font(size)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            if text_w > max_w:
                size = max(int(size * max_w / text_w * 0.92), 8)
                font = load_font(size)
                bbox = draw.textbbox((0, 0), text, font=font)
                text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            return font, text_w, text_h

        # Draw name — auto-sized to fill the zone box height
        nz = self.event.name_zone
        nx, ny, nw, nh = zone_to_pixels(nz)
        color = nz.get('color', '#ffffff')
        font, text_w, text_h = fit_text(self.name, nw, nh)
        draw.text(
            (nx + (nw - text_w) // 2, ny + (nh - text_h) // 2),
            self.name, fill=color, font=font,
        )

        # Draw tag — auto-sized to fill the zone box height
        tz = self.event.tag_zone
        tx, ty, tw, th = zone_to_pixels(tz)
        tag_color = tz.get('color', '#a8dadc')
        tag_text = f"Category: {self.tag}"
        tag_font, tag_text_w, tag_text_h = fit_text(tag_text, tw, th)
        draw.text(
            (tx + (tw - tag_text_w) // 2, ty + (th - tag_text_h) // 2),
            tag_text, fill=tag_color, font=tag_font,
        )

        # Draw QR code — fetch from URL (Cloudinary storage has no .path property)
        if self.qr_code:
            try:
                qz = self.event.qr_zone
                qx, qy, qw, qh = zone_to_pixels(qz)
                qr_img = self._open_storage_image(self.qr_code).convert('RGB')
                qr_img = qr_img.resize((qw, qh))
                bg.paste(qr_img, (qx, qy))
            except Exception as e:
                logger.error("Error placing QR code from template for invitation %s: %s", self.id, e)

        # Watermark
        if show_watermark:
            small_font = load_font(16)
            wm_text = "Made with YouAreInvited.com"
            wm_bbox = draw.textbbox((0, 0), wm_text, font=small_font)
            wm_w = wm_bbox[2] - wm_bbox[0]
            draw.text(
                ((width - wm_w) // 2, height - 30),
                wm_text, fill='#ffffff', font=small_font
            )

        return bg

    def _generate_default_card(self, show_watermark: bool) -> Image:
        """Generate the original hardcoded dark-theme invitation card."""
        width, height = 800, 1200
        img = Image.new('RGB', (width, height), color='#1a1a2e')
        draw = ImageDraw.Draw(img)
        profile = getattr(getattr(self.event, 'owner', None), 'profile', None) if self.event_id else None

        border_width = 20
        draw.rectangle(
            [border_width, border_width, width - border_width, height - border_width],
            outline='#16213e', width=3
        )
        inner_border = 40
        draw.rectangle(
            [inner_border, inner_border, width - inner_border, height - inner_border],
            outline='#0f3460', width=2
        )

        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except Exception:
            title_font = name_font = detail_font = small_font = ImageFont.load_default()

        title = "YOU'RE INVITED"
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        draw.text(((width - (title_bbox[2] - title_bbox[0])) / 2, 100), title, fill='#e94560', font=title_font)

        draw.line([(width / 2 - 150, 180), (width / 2 + 150, 180)], fill='#0f3460', width=2)

        name_bbox = draw.textbbox((0, 0), self.name, font=name_font)
        draw.text(((width - (name_bbox[2] - name_bbox[0])) / 2, 250), self.name, fill='#ffffff', font=name_font)

        seat_text = f"Seat Number: {self.seat_number}"
        seat_bbox = draw.textbbox((0, 0), seat_text, font=detail_font)
        draw.text(((width - (seat_bbox[2] - seat_bbox[0])) / 2, 330), seat_text, fill='#a8dadc', font=detail_font)

        tag_text = f"Category: {self.tag}"
        tag_bbox = draw.textbbox((0, 0), tag_text, font=detail_font)
        draw.text(((width - (tag_bbox[2] - tag_bbox[0])) / 2, 380), tag_text, fill='#a8dadc', font=detail_font)

        draw.line([(width / 2 - 150, 450), (width / 2 + 150, 450)], fill='#0f3460', width=2)

        if self.qr_code:
            try:
                qr_img = self._open_storage_image(self.qr_code)
                qr_img = qr_img.resize((300, 300))
                qr_bg = Image.new('RGB', (320, 320), 'white')
                qr_bg.paste(qr_img, (10, 10))
                img.paste(qr_bg, (240, 520))
            except Exception as e:
                logger.error("Error adding QR code: %s", e)

        scan_text = "Scan to view your invitation"
        scan_bbox = draw.textbbox((0, 0), scan_text, font=small_font)
        draw.text(((width - (scan_bbox[2] - scan_bbox[0])) / 2, 870), scan_text, fill='#ffffff', font=small_font)

        if profile and profile.uses_event_branding():
            brand_name = profile.brand_name.strip()
            badge_y = 935
            badge_h = 78
            logo_size = 44
            gap = 16
            horizontal_padding = 22
            text_w = 0
            logo_img = None

            if profile.brand_logo:
                try:
                    logo_img = self._open_storage_image(profile.brand_logo).convert('RGBA')
                    logo_img.thumbnail((logo_size, logo_size))
                except Exception as e:
                    logger.error("Error loading organizer brand logo for invitation %s: %s", self.id, e)
                    logo_img = None

            if brand_name:
                brand_bbox = draw.textbbox((0, 0), brand_name, font=small_font)
                text_w = brand_bbox[2] - brand_bbox[0]

            content_w = text_w
            if logo_img:
                content_w += logo_img.width
            if logo_img and brand_name:
                content_w += gap

            badge_w = max(content_w + horizontal_padding * 2, 160)
            badge_x = int((width - badge_w) / 2)
            draw.rounded_rectangle(
                [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                radius=28,
                fill='#16213e',
                outline='#2b4672',
                width=2,
            )

            content_x = badge_x + int((badge_w - content_w) / 2)
            if logo_img:
                logo_y = badge_y + int((badge_h - logo_img.height) / 2)
                img.paste(logo_img, (content_x, logo_y), logo_img)
                content_x += logo_img.width + (gap if brand_name else 0)

            if brand_name:
                text_bbox = draw.textbbox((0, 0), brand_name, font=small_font)
                text_h = text_bbox[3] - text_bbox[1]
                draw.text(
                    (content_x, badge_y + int((badge_h - text_h) / 2)),
                    brand_name,
                    fill='#f3f6fb',
                    font=small_font,
                )

        if show_watermark:
            footer_text = "Made with YouAreInvited.com"
        else:
            footer_text = "We look forward to celebrating with you!"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
        draw.text(((width - (footer_bbox[2] - footer_bbox[0])) / 2, 1050), footer_text, fill='#a8dadc', font=small_font)

        return img

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.generate_qr_code()

        super().save(*args, **kwargs)

        if not self.e_invite_image:
            show_watermark = True
            if self.event_id:
                try:
                    owner = self.event.owner
                    profile = owner.profile
                    show_watermark = not profile.watermark_override and profile.plan == 'free'
                except Exception:
                    pass
            self.generate_e_invite(show_watermark=show_watermark)
            super().save(update_fields=['e_invite_image'])

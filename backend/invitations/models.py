from django.db import models
import uuid
import logging
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image, ImageDraw, ImageFont
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    watermark_override = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.plan})"


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
        upload_to='event_invitation/templates/', blank=True, null=True
    )
    qr_zone = models.JSONField(null=True, blank=True)
    name_zone = models.JSONField(null=True, blank=True)
    tag_zone = models.JSONField(null=True, blank=True)
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
    qr_code = models.ImageField(upload_to='event_invitation/qr_codes/', blank=True)
    e_invite_image = models.ImageField(upload_to='event_invitation/e_invites/', blank=True)
    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - Seat {self.seat_number}"

    def get_invitation_url(self):
        # Guest view page
        return f"https://invitation-system-psi.vercel.app/invitation/{self.id}"

    def get_security_checkin_url(self):
        # Security check-in page (for QR codes)
        return f"https://invitation-system-psi.vercel.app/security/check-in/{self.id}"
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

    def generate_e_invite(self, show_watermark: bool = True):
        """Generate e-invite image with QR code"""
        # Create a beautiful invitation card
        width, height = 800, 1200
        img = Image.new('RGB', (width, height), color='#1a1a2e')
        draw = ImageDraw.Draw(img)

        # Draw decorative border
        border_width = 20
        draw.rectangle(
            [border_width, border_width, width-border_width, height-border_width],
            outline='#16213e',
            width=3
        )
        
        # Draw inner border with gradient effect
        inner_border = 40
        draw.rectangle(
            [inner_border, inner_border, width-inner_border, height-inner_border],
            outline='#0f3460',
            width=2
        )

        # Try to use a nice font, fallback to default
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            title_font = ImageFont.load_default()
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()
            small_font = ImageFont.load_default()

        # Add title
        title = "YOU'RE INVITED"
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((width - title_width) / 2, 100), title, fill='#e94560', font=title_font)

        # Add decorative line
        line_y = 180
        draw.line([(width/2 - 150, line_y), (width/2 + 150, line_y)], fill='#0f3460', width=2)

        # Add guest name
        name_bbox = draw.textbbox((0, 0), self.name, font=name_font)
        name_width = name_bbox[2] - name_bbox[0]
        draw.text(((width - name_width) / 2, 250), self.name, fill='#ffffff', font=name_font)

        # Add seat information
        seat_text = f"Seat Number: {self.seat_number}"
        seat_bbox = draw.textbbox((0, 0), seat_text, font=detail_font)
        seat_width = seat_bbox[2] - seat_bbox[0]
        draw.text(((width - seat_width) / 2, 330), seat_text, fill='#a8dadc', font=detail_font)

        # Add tag
        tag_text = f"Category: {self.tag}"
        tag_bbox = draw.textbbox((0, 0), tag_text, font=detail_font)
        tag_width = tag_bbox[2] - tag_bbox[0]
        draw.text(((width - tag_width) / 2, 380), tag_text, fill='#a8dadc', font=detail_font)

        # Add decorative line
        line_y2 = 450
        draw.line([(width/2 - 150, line_y2), (width/2 + 150, line_y2)], fill='#0f3460', width=2)

        # Add QR code if it exists
        if self.qr_code:
            try:
                qr_img = Image.open(self.qr_code.path)
                qr_img = qr_img.resize((300, 300))
                
                # Create white background for QR
                qr_bg = Image.new('RGB', (320, 320), 'white')
                qr_bg.paste(qr_img, (10, 10))
                
                img.paste(qr_bg, (240, 520))
            except Exception as e:
                logger.error("Error adding QR code to e-invite for invitation %s: %s", self.id, e)

        # Add scan instruction
        scan_text = "Scan to view your invitation"
        scan_bbox = draw.textbbox((0, 0), scan_text, font=small_font)
        scan_width = scan_bbox[2] - scan_bbox[0]
        draw.text(((width - scan_width) / 2, 870), scan_text, fill='#ffffff', font=small_font)

        # Add footer / watermark
        if show_watermark:
            footer_text = "Made with YouAreInvited.com"
        else:
            footer_text = "We look forward to celebrating with you!"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
        footer_width = footer_bbox[2] - footer_bbox[0]
        draw.text(((width - footer_width) / 2, 1050), footer_text, fill='#a8dadc', font=small_font)

        # Save to BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Save to model
        filename = f'invite_{self.id}.png'
        self.e_invite_image.save(filename, File(buffer), save=False)
        buffer.close()

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

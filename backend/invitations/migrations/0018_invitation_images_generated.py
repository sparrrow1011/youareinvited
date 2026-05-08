# Generated migration for async bulk import image generation

from django.db import migrations, models


def set_existing_images_generated(apps, schema_editor):
    """
    For existing invitations that have both images generated,
    mark images_generated=True.
    """
    from django.db.models import Q
    Invitation = apps.get_model('invitations', 'Invitation')
    # Invitations with non-empty qr_code AND non-empty e_invite_image
    Invitation.objects.exclude(qr_code='').exclude(e_invite_image='').update(images_generated=True)


class Migration(migrations.Migration):

    dependencies = [
        ("invitations", "0017_invitation_phone_number_invitation_whatsapp_sent_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="invitation",
            name="images_generated",
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.RunPython(set_existing_images_generated),
    ]

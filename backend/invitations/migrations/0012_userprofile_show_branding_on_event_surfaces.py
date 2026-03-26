from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0011_userprofile_settings_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='show_branding_on_event_surfaces',
            field=models.BooleanField(default=False),
        ),
    ]

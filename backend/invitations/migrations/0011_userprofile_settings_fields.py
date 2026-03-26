from django.db import migrations, models

import invitations.models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0010_s3_upload_to_paths'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='brand_logo',
            field=models.ImageField(blank=True, null=True, upload_to=invitations.models.user_brand_logo_path),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='brand_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='default_whatsapp_message_template',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]

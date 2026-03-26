from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0012_userprofile_show_branding_on_event_surfaces'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitation',
            name='first_viewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invitation',
            name='last_viewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invitation',
            name='link_share_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='invitation',
            name='view_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='invitation',
            name='whatsapp_share_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddIndex(
            model_name='invitation',
            index=models.Index(fields=['event', 'checked_in'], name='invitation_event_6d57df_idx'),
        ),
        migrations.AddIndex(
            model_name='invitation',
            index=models.Index(fields=['event', 'first_viewed_at'], name='invitation_event_4d9e36_idx'),
        ),
        migrations.AddIndex(
            model_name='invitation',
            index=models.Index(fields=['event', 'checked_in_at'], name='invitation_event_16c73a_idx'),
        ),
    ]

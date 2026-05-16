from django.db import migrations, models
import invitations.models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0026_eventgiftlink'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='theme_hero_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=invitations.models.event_theme_hero_path,
            ),
        ),
        migrations.AddField(
            model_name='event',
            name='theme_secondary_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=invitations.models.event_theme_secondary_path,
            ),
        ),
    ]

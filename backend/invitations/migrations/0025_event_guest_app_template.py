from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0024_event_features'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='guest_app_template',
            field=models.CharField(
                choices=[('classic', 'Classic'), ('spotlight', 'Spotlight')],
                default='classic',
                max_length=32,
            ),
        ),
    ]

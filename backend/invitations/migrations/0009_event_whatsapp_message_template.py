from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0008_event_security_pin'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='whatsapp_message_template',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]

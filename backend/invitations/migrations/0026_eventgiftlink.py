import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0025_event_guest_app_template'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventGiftLink',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=120)),
                ('url', models.URLField(max_length=1000)),
                ('description', models.CharField(blank=True, default='', max_length=240)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gift_links', to='invitations.event')),
            ],
            options={
                'ordering': ['sort_order', 'created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='eventgiftlink',
            index=models.Index(fields=['event', 'is_active', 'sort_order'], name='invitations_event_i_d72f32_idx'),
        ),
    ]

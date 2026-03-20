import datetime
import os
from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_default_event_and_backfill(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Event = apps.get_model('invitations', 'Event')
    Invitation = apps.get_model('invitations', 'Invitation')
    UserProfile = apps.get_model('invitations', 'UserProfile')

    email = os.environ.get('SEED_ADMIN_EMAIL', 'admin@youareinvited.com')
    password = os.environ.get('SEED_ADMIN_PASSWORD', 'changeme123')

    # Get or create superuser
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email,
            'is_staff': True,
            'is_superuser': True,
            'password': make_password(password),
        }
    )

    # Create or get UserProfile for the superuser
    UserProfile.objects.get_or_create(
        user=user,
        defaults={'plan': 'pro', 'watermark_override': True}
    )

    # Create default event
    event, _ = Event.objects.get_or_create(
        owner=user,
        name='Default Event',
        defaults={'date': datetime.date.today()}
    )

    # Backfill all invitations without an event
    Invitation.objects.filter(event__isnull=True).update(event=event)


def reverse_backfill(apps, schema_editor):
    Event = apps.get_model('invitations', 'Event')
    Invitation = apps.get_model('invitations', 'Invitation')
    default_event = Event.objects.filter(name='Default Event').first()
    if default_event:
        Invitation.objects.filter(event=default_event).update(event=None)


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0005_invitation_event'),
    ]

    operations = [
        migrations.RunPython(create_default_event_and_backfill, reverse_backfill),
    ]

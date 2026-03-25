"""
Management command: seed

Usage:
    python manage.py seed              # create seed data (idempotent)
    python manage.py seed --flush      # wipe invitations/events/users first, then seed

Creates:
    - 1 superuser (platform admin, accessible via Django /admin and super-admin app)
    - 3 organizer accounts (1 pro, 2 free)
    - 2-3 events per organizer
    - 5-10 invitations per event (no image generation — fast)
"""

import datetime
import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from invitations.models import UserProfile, Event, Invitation

SUPERUSER_EMAIL = 'admin@youareinvited.com'
SUPERUSER_PASSWORD = 'admin1234!'

ORGANIZERS = [
    {
        'email': 'sara@example.com',
        'password': 'Password123!',
        'plan': 'pro',
        'watermark_override': True,
    },
    {
        'email': 'james@example.com',
        'password': 'Password123!',
        'plan': 'free',
        'watermark_override': False,
    },
    {
        'email': 'amira@example.com',
        'password': 'Password123!',
        'plan': 'free',
        'watermark_override': False,
    },
]

EVENTS = {
    'sara@example.com': [
        {
            'name': 'Sara & Tom Wedding',
            'date': datetime.date(2026, 6, 14),
            'description': 'Garden ceremony at Rosewood Estate',
        },
        {
            'name': 'Sara\'s Baby Shower',
            'date': datetime.date(2026, 8, 3),
            'description': '',
        },
    ],
    'james@example.com': [
        {
            'name': 'James 40th Birthday Bash',
            'date': datetime.date(2026, 5, 20),
            'description': 'Rooftop party, dress code: smart casual',
        },
        {
            'name': 'Company Retreat 2026',
            'date': datetime.date(2026, 9, 15),
            'description': 'Annual team offsite',
        },
        {
            'name': 'Tech Meetup — Q3',
            'date': datetime.date(2026, 7, 8),
            'description': '',
        },
    ],
    'amira@example.com': [
        {
            'name': 'Amira\'s Graduation Dinner',
            'date': datetime.date(2026, 6, 28),
            'description': 'Celebration dinner at Al Raha Beach',
        },
        {
            'name': 'Family Eid Gathering',
            'date': datetime.date(2026, 4, 10),
            'description': '',
        },
    ],
}

GUEST_NAMES = [
    'Khalid Al-Rashid', 'Fatima Hassan', 'Omar Yusuf', 'Layla Nasser',
    'Mohammed Al-Farsi', 'Noor Ahmed', 'Zainab Ibrahim', 'Tariq Salem',
    'Hana Al-Mansoori', 'Yousef Khalil', 'Rania Mubarak', 'Saad Al-Zahra',
    'Dina Elhaj', 'Faris Qasim', 'Mariam Jaber', 'Bilal Siddiqui',
    'Aisha Al-Khatib', 'Wael Nassar', 'Sana Hamdan', 'Kareem Mostafa',
]

TAGS = ['VIP', 'Family', 'Friend', 'Colleague', 'General']


def make_seat(index: int) -> str:
    row = chr(65 + (index // 10))  # A, B, C …
    col = (index % 10) + 1
    return f'{row}{col}'


class Command(BaseCommand):
    help = 'Seed the database with demo users, events, and invitations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete all invitations, events, and non-superuser accounts before seeding',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing seed data…')
            Invitation.objects.all().delete()
            Event.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.WARNING('  Flushed.'))

        # ── Superuser ──────────────────────────────────────────────────
        superuser, created = User.objects.get_or_create(
            email=SUPERUSER_EMAIL,
            defaults={
                'username': SUPERUSER_EMAIL,
                'is_staff': True,
                'is_superuser': True,
            },
        )
        superuser.set_password(SUPERUSER_PASSWORD)
        superuser.is_staff = True
        superuser.is_superuser = True
        superuser.save()
        verb = 'Created' if created else 'Updated'
        self.stdout.write(f'  {verb} superuser: {SUPERUSER_EMAIL}')

        profile = UserProfile.objects.get_or_create(user=superuser)[0]
        profile.plan = 'pro'
        profile.watermark_override = True
        profile.save()

        # ── Organizers ─────────────────────────────────────────────────
        organizer_users = {}
        for org in ORGANIZERS:
            user, created = User.objects.get_or_create(
                email=org['email'],
                defaults={'username': org['email']},
            )
            if created:
                user.set_password(org['password'])
                user.save()
                self.stdout.write(f'  Created organizer: {org["email"]} ({org["plan"]})')
            else:
                self.stdout.write(f'  Organizer already exists: {org["email"]}')

            profile = UserProfile.objects.get_or_create(user=user)[0]
            profile.plan = org['plan']
            profile.watermark_override = org['watermark_override']
            profile.save()

            organizer_users[org['email']] = user

        # ── Events & Invitations ───────────────────────────────────────
        total_invitations = 0
        for email, event_defs in EVENTS.items():
            owner = organizer_users[email]
            for ev_def in event_defs:
                event, ev_created = Event.objects.get_or_create(
                    owner=owner,
                    name=ev_def['name'],
                    defaults={
                        'date': ev_def['date'],
                        'description': ev_def['description'],
                    },
                )
                if ev_created:
                    self.stdout.write(f'    Event: {event.name}')
                else:
                    self.stdout.write(f'    Event (exists): {event.name}')
                    continue  # don't re-seed invitations for existing events

                guest_count = random.randint(5, 10)
                guests = random.sample(GUEST_NAMES, min(guest_count, len(GUEST_NAMES)))
                for i, name in enumerate(guests):
                    tag = random.choice(TAGS)
                    checked_in = random.random() < 0.4  # ~40% checked in
                    # Create without triggering image generation (skip save signal)
                    inv = Invitation(
                        name=name,
                        seat_number=make_seat(i),
                        tag=tag,
                        event=event,
                        checked_in=checked_in,
                    )
                    # Use update_fields bypass: save without triggering QR/e-invite generation
                    inv.save()
                    total_invitations += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Seed complete. '
            f'{len(ORGANIZERS)} organizers, '
            f'{sum(len(v) for v in EVENTS.values())} events, '
            f'~{total_invitations} invitations.'
        ))
        self.stdout.write('')
        self.stdout.write('  Superuser login:')
        self.stdout.write(f'    Email:    {SUPERUSER_EMAIL}')
        self.stdout.write(f'    Password: {SUPERUSER_PASSWORD}')
        self.stdout.write('')
        self.stdout.write('  Organizer logins (password: Password123!):')
        for org in ORGANIZERS:
            self.stdout.write(f'    {org["email"]}  ({org["plan"]})')

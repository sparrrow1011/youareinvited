from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from invitations.models import Event, Invitation, UserProfile


# Patch targets for Invitation image-generation methods that require Cloudinary
_PATCH_QR = patch('invitations.models.Invitation.generate_qr_code', lambda self: None)
_PATCH_EINVITE = patch('invitations.models.Invitation.generate_e_invite', lambda self, **kw: None)


def make_user(email, password='X9mK#vPqL2!', is_staff=False):
    user = User.objects.create_user(
        username=email, email=email, password=password, is_staff=is_staff
    )
    UserProfile.objects.get_or_create(user=user)
    return user


def auth_headers(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


class SuperAdminAuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = make_user('staff@test.com', is_staff=True)
        self.regular = make_user('regular@test.com', is_staff=False)

    def test_no_token_returns_401(self):
        res = self.client.get('/api/superadmin/stats/')
        self.assertIn(res.status_code, (401, 403))

    def test_non_staff_returns_403(self):
        res = self.client.get('/api/superadmin/stats/', **auth_headers(self.regular))
        self.assertEqual(res.status_code, 403)

    def test_staff_returns_200(self):
        res = self.client.get('/api/superadmin/stats/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 200)

    def test_wrong_token_returns_401(self):
        res = self.client.get('/api/superadmin/stats/', HTTP_AUTHORIZATION='Bearer bad.token.here')
        self.assertIn(res.status_code, (401, 403))


class SuperAdminStatsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        User.objects.all().delete()
        self.staff = make_user('staff@test.com', is_staff=True)
        self.user = make_user('organizer@test.com')
        self.event = Event.objects.create(
            owner=self.user, name='Test Event', date='2026-06-01'
        )

    def test_stats_response_shape(self):
        res = self.client.get('/api/superadmin/stats/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for key in ('total_users', 'total_events', 'total_invitations', 'checkins_today', 'checkin_rate'):
            self.assertIn(key, data, f"Missing key: {key}")

    @_PATCH_QR
    @_PATCH_EINVITE
    def test_stats_counts_are_correct(self):
        Invitation.objects.create(
            event=self.event, name='Guest A', seat_number='A1', tag='VIP',
            checked_in=True, checked_in_at=timezone.now(),
        )
        res = self.client.get('/api/superadmin/stats/', **auth_headers(self.staff))
        data = res.json()
        # staff user + organizer = 2 users
        self.assertEqual(data['total_users'], 2)
        self.assertEqual(data['total_events'], 1)
        self.assertEqual(data['total_invitations'], 1)
        self.assertEqual(data['checkins_today'], 1)


class SuperAdminGrowthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = make_user('staff@test.com', is_staff=True)

    def test_growth_returns_30_days(self):
        res = self.client.get('/api/superadmin/growth/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 30)

    def test_growth_has_required_keys(self):
        res = self.client.get('/api/superadmin/growth/', **auth_headers(self.staff))
        first = res.json()[0]
        for key in ('date', 'new_users', 'new_events'):
            self.assertIn(key, first)

    def test_growth_no_gaps_for_inactive_days(self):
        res = self.client.get('/api/superadmin/growth/', **auth_headers(self.staff))
        data = res.json()
        for entry in data:
            self.assertGreaterEqual(entry['new_users'], 0)
            self.assertGreaterEqual(entry['new_events'], 0)


class SuperAdminUsersTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        User.objects.all().delete()
        self.staff = make_user('staff@test.com', is_staff=True)
        self.user = make_user('user@test.com')

    def test_users_list_returns_all_users(self):
        res = self.client.get('/api/superadmin/users/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 200)
        # staff + regular = 2
        self.assertEqual(len(res.json()), 2)
        user_data = res.json()[0]
        for key in ('id', 'email', 'plan', 'watermark_override', 'event_count', 'invitation_count', 'created_at'):
            self.assertIn(key, user_data)

    def test_patch_plan(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'plan': 'pro'},
            format='json',
            **auth_headers(self.staff),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['plan'], 'pro')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.plan, 'pro')

    def test_patch_watermark_override(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'watermark_override': True},
            format='json',
            **auth_headers(self.staff),
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['watermark_override'])

    def test_patch_invalid_plan_returns_400(self):
        res = self.client.patch(
            f'/api/superadmin/users/{self.user.id}/',
            {'plan': 'enterprise'},
            format='json',
            **auth_headers(self.staff),
        )
        self.assertEqual(res.status_code, 400)

    def test_delete_user(self):
        res = self.client.delete(f'/api/superadmin/users/{self.user.id}/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())

    @_PATCH_QR
    @_PATCH_EINVITE
    def test_delete_cascades_events_and_invitations(self):
        event = Event.objects.create(owner=self.user, name='Cascade Test', date='2026-07-01')
        Invitation.objects.create(event=event, name='Guest', seat_number='B1', tag='Gen')
        self.client.delete(f'/api/superadmin/users/{self.user.id}/', **auth_headers(self.staff))
        self.assertEqual(Event.objects.filter(pk=event.pk).count(), 0)

    @_PATCH_QR
    @_PATCH_EINVITE
    def test_user_events(self):
        event = Event.objects.create(owner=self.user, name='My Event', date='2026-08-01')
        Invitation.objects.create(event=event, name='Guest', seat_number='C3', tag='VIP')
        res = self.client.get(f'/api/superadmin/users/{self.user.id}/events/', **auth_headers(self.staff))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['invitation_count'], 1)
        self.assertIn('has_template', data[0])

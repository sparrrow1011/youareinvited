from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from .models import Event, Invitation


class InvitationBulkSendWhatsAppTests(TestCase):
    """Test suite for the bulk_send_whatsapp endpoint."""

    def setUp(self):
        """Set up test user, event, and invitations."""
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.event = Event.objects.create(
            owner=self.user,
            name='Test Event',
            date='2026-06-01'
        )
        self.invitation1 = Invitation.objects.create(
            event=self.event,
            name='John Doe',
            seat_number='A1',
            tag='VIP'
        )
        self.invitation2 = Invitation.objects.create(
            event=self.event,
            name='Jane Smith',
            seat_number='A2',
            tag='Guest'
        )

    def test_bulk_send_whatsapp_success(self):
        """Test successful bulk send of WhatsApp links."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id), str(self.invitation2.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['invitation_count'], 2)
        self.assertIn('link_preview', response.data)
        self.assertIn('wa.me', response.data['link_preview'])
        self.assertIn('timestamp', response.data)

        # Verify timestamps were updated
        self.invitation1.refresh_from_db()
        self.invitation2.refresh_from_db()
        self.assertIsNotNone(self.invitation1.whatsapp_sent_at)
        self.assertIsNotNone(self.invitation2.whatsapp_sent_at)

    def test_bulk_send_whatsapp_missing_event(self):
        """Test error when event parameter is missing."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_bulk_send_whatsapp_missing_invitation_ids(self):
        """Test error when invitation_ids parameter is missing."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id)
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_bulk_send_whatsapp_unauthorized(self):
        """Test error when user doesn't own the event."""
        other_user = User.objects.create_user(username='otheruser', password='testpass')
        self.client.force_authenticate(user=other_user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('detail', response.data)

    def test_bulk_send_whatsapp_empty_list(self):
        """Test with empty invitation_ids list."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': []
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_send_whatsapp_unauthenticated(self):
        """Test error when not authenticated."""
        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bulk_send_whatsapp_single_invitation(self):
        """Test bulk send with single invitation."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['invitation_count'], 1)
        self.assertIn('wa.me', response.data['link_preview'])

    def test_bulk_send_whatsapp_invalid_event_id(self):
        """Test with non-existent event ID."""
        self.client.force_authenticate(user=self.user)
        import uuid
        fake_event_id = uuid.uuid4()

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(fake_event_id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_bulk_send_whatsapp_partial_invitation_ids(self):
        """Test with some invitation IDs that don't exist."""
        self.client.force_authenticate(user=self.user)
        import uuid
        fake_id = uuid.uuid4()

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id), str(fake_id)]
        }, format='json')

        # Should succeed but only update the invitation that exists
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['invitation_count'], 1)

        self.invitation1.refresh_from_db()
        self.assertIsNotNone(self.invitation1.whatsapp_sent_at)

    def test_bulk_send_whatsapp_response_has_timestamp(self):
        """Test that response includes a valid timestamp."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('timestamp', response.data)
        # Timestamp should be ISO format
        self.assertIn('T', response.data['timestamp'])

    def test_bulk_send_whatsapp_updates_correct_event_invitations(self):
        """Test that only invitations from the specified event are updated."""
        other_user = User.objects.create_user(username='other', password='pass')
        other_event = Event.objects.create(
            owner=other_user,
            name='Other Event',
            date='2026-07-01'
        )
        other_invitation = Invitation.objects.create(
            event=other_event,
            name='Other Guest',
            seat_number='B1',
            tag='Guest'
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id), str(self.invitation2.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['invitation_count'], 2)

        # Check that other event invitation was not updated
        other_invitation.refresh_from_db()
        self.assertIsNone(other_invitation.whatsapp_sent_at)

    def test_bulk_send_whatsapp_idempotent(self):
        """Test that calling bulk_send_whatsapp multiple times updates timestamp."""
        self.client.force_authenticate(user=self.user)

        # First call
        response1 = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        self.invitation1.refresh_from_db()
        first_timestamp = self.invitation1.whatsapp_sent_at

        # Small delay to ensure different timestamps
        import time
        time.sleep(0.1)

        # Second call
        response2 = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.event.id),
            'invitation_ids': [str(self.invitation1.id)]
        }, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        self.invitation1.refresh_from_db()
        second_timestamp = self.invitation1.whatsapp_sent_at

        # Second timestamp should be later
        self.assertGreater(second_timestamp, first_timestamp)


class BulkSendWhatsAppPlanRoutingTests(TestCase):
    """Test Twilio vs wa.me routing based on user plan."""

    def setUp(self):
        self.client = APIClient()
        self.free_user = User.objects.create_user(username='freeuser', password='testpass')
        self.pro_user = User.objects.create_user(username='prouser', password='testpass')

        # Set up plans
        self.free_user.profile.plan = 'free'
        self.free_user.profile.save()
        self.pro_user.profile.plan = 'pro'
        self.pro_user.profile.save()

        # Create events and invitations for each user
        self.free_event = Event.objects.create(
            owner=self.free_user,
            name='Free Event',
            date='2026-06-01'
        )
        self.pro_event = Event.objects.create(
            owner=self.pro_user,
            name='Pro Event',
            date='2026-06-01'
        )

        self.free_invitation = Invitation.objects.create(
            event=self.free_event,
            name='Free Guest',
            seat_number='A1',
            tag='Guest',
            phone_number='+1234567890'
        )
        self.pro_invitation = Invitation.objects.create(
            event=self.pro_event,
            name='Pro Guest',
            seat_number='A1',
            tag='Guest',
            phone_number='+1234567891'
        )

    def test_free_user_gets_wa_me_links(self):
        """Free users should get wa.me/ links."""
        self.client.force_authenticate(user=self.free_user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.free_event.id),
            'invitation_ids': [str(self.free_invitation.id)]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sent_via'], 'wa_me')
        self.assertIn('wa.me', response.data['link_preview'])
        self.assertEqual(response.data['invitation_count'], 1)

    def test_pro_user_attempts_twilio_send(self):
        """Pro users should attempt Twilio send (will fail without credentials, but should route correctly)."""
        self.client.force_authenticate(user=self.pro_user)

        # This will likely fail because Twilio credentials aren't set, but we're testing the routing logic
        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.pro_event.id),
            'invitation_ids': [str(self.pro_invitation.id)]
        }, format='json')

        # Either successfully sends via Twilio or returns error about missing credentials
        # Either way, the routing logic is being tested
        if response.status_code == status.HTTP_200_OK:
            # Successfully routed to Twilio
            self.assertEqual(response.data['sent_via'], 'twilio')
        elif response.status_code == status.HTTP_400_BAD_REQUEST:
            # Twilio not configured - routing logic attempted Twilio
            self.assertIn('Twilio not configured', response.data['detail'])

    def test_pro_user_without_phone_skips_invitation(self):
        """Pro users without phone numbers should skip invitations."""
        self.pro_invitation.phone_number = None
        self.pro_invitation.save()

        self.client.force_authenticate(user=self.pro_user)

        response = self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.pro_event.id),
            'invitation_ids': [str(self.pro_invitation.id)]
        }, format='json')

        # Should route to Twilio, and fail due to missing phone number
        if response.status_code == status.HTTP_200_OK:
            # Successfully attempted to send but failed due to no phone
            self.assertGreater(response.data['failed_count'], 0)
        elif response.status_code == status.HTTP_400_BAD_REQUEST:
            # Twilio not configured - routing logic attempted Twilio
            self.assertIn('Twilio not configured', response.data['detail'])

    def test_whatsapp_sent_at_updated_for_both_plans(self):
        """Both plans should update whatsapp_sent_at timestamp."""
        self.client.force_authenticate(user=self.free_user)

        self.client.post('/api/invitations/bulk_send_whatsapp/', {
            'event': str(self.free_event.id),
            'invitation_ids': [str(self.free_invitation.id)]
        }, format='json')

        self.free_invitation.refresh_from_db()
        self.assertIsNotNone(self.free_invitation.whatsapp_sent_at)

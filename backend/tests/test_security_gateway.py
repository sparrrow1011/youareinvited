import pytest
from invitations.models import Event, Invitation

@pytest.mark.django_db
def test_event_has_security_pin_field(user):
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    assert event.security_pin is None  # null by default


@pytest.mark.django_db
def test_invitation_qr_url_uses_event_scoped_route(user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    url = invitation.get_security_checkin_url()
    assert f"/security/event/{event.id}/checkin" in url
    assert f"invitation={invitation.id}" in url

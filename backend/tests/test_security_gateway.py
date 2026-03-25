import pytest
from invitations.models import Event, Invitation
from invitations.serializers import EventSerializer, SetSecurityPinSerializer


@pytest.fixture(autouse=True)
def clear_cache():
    from django.core.cache import cache
    cache.clear()


@pytest.mark.django_db
def test_event_has_security_pin_field(user):
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    assert event.security_pin is None  # null by default


def test_set_security_pin_serializer_valid():
    s = SetSecurityPinSerializer(data={"pin": "1234"})
    assert s.is_valid()


def test_set_security_pin_serializer_rejects_non_numeric():
    s = SetSecurityPinSerializer(data={"pin": "abcd"})
    assert not s.is_valid()


def test_set_security_pin_serializer_rejects_too_short():
    s = SetSecurityPinSerializer(data={"pin": "123"})
    assert not s.is_valid()


def test_set_security_pin_serializer_rejects_too_long():
    s = SetSecurityPinSerializer(data={"pin": "1234567"})
    assert not s.is_valid()


def test_set_security_pin_serializer_accepts_null():
    s = SetSecurityPinSerializer(data={"pin": None})
    assert s.is_valid()


def test_set_security_pin_serializer_rejects_empty_string():
    s = SetSecurityPinSerializer(data={"pin": ""})
    assert not s.is_valid()


def test_set_security_pin_serializer_rejects_missing_pin():
    s = SetSecurityPinSerializer(data={})
    assert not s.is_valid()


@pytest.mark.django_db
def test_event_serializer_has_security_pin_field(user):
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    data = EventSerializer(event).data
    assert "has_security_pin" in data
    assert data["has_security_pin"] is False


@pytest.mark.django_db
def test_event_serializer_has_security_pin_true_when_set(user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01",
                                  security_pin=make_password("1234"))
    data = EventSerializer(event).data
    assert data["has_security_pin"] is True


@pytest.mark.django_db
def test_invitation_qr_url_uses_event_scoped_route(user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    url = invitation.get_security_checkin_url()
    assert f"/security/event/{event.id}/checkin" in url
    assert f"invitation={invitation.id}" in url


# ── EventViewSet: public_info ──────────────────────────────────────────────────

@pytest.mark.django_db
def test_public_info_returns_event_name_and_date(api_client, user):
    event = Event.objects.create(owner=user, name="Gala Night", date="2025-12-01")
    response = api_client.get(f"/api/events/{event.id}/public_info/")
    assert response.status_code == 200
    assert response.data["name"] == "Gala Night"
    assert "id" in response.data

@pytest.mark.django_db
def test_public_info_returns_404_for_unknown_event(api_client):
    import uuid
    response = api_client.get(f"/api/events/{uuid.uuid4()}/public_info/")
    assert response.status_code == 404

# ── EventViewSet: verify_security_pin ─────────────────────────────────────────

@pytest.mark.django_db
def test_verify_security_pin_returns_token_on_success(api_client, user):
    from django.contrib.auth.hashers import make_password
    from django.core import signing
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01",
                                  security_pin=make_password("1234"))
    response = api_client.post(f"/api/events/{event.id}/verify_security_pin/",
                                {"pin": "1234"}, format="json")
    assert response.status_code == 200
    assert "token" in response.data
    payload = signing.loads(response.data["token"], salt="security-checkin", max_age=43200)
    assert payload["event_id"] == str(event.id)


@pytest.mark.django_db
def test_verify_security_pin_returns_400_when_pin_missing(api_client, user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01",
                                  security_pin=make_password("1234"))
    response = api_client.post(f"/api/events/{event.id}/verify_security_pin/",
                                {}, format="json")
    assert response.status_code == 400

@pytest.mark.django_db
def test_verify_security_pin_returns_401_on_wrong_pin(api_client, user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01",
                                  security_pin=make_password("1234"))
    response = api_client.post(f"/api/events/{event.id}/verify_security_pin/",
                                {"pin": "9999"}, format="json")
    assert response.status_code == 401

@pytest.mark.django_db
def test_verify_security_pin_returns_403_when_no_pin_configured(api_client, user):
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    response = api_client.post(f"/api/events/{event.id}/verify_security_pin/",
                                {"pin": "1234"}, format="json")
    assert response.status_code == 403

# ── EventViewSet: set_security_pin ────────────────────────────────────────────

@pytest.mark.django_db
def test_set_security_pin_stores_hashed_pin(auth_client, user):
    from django.contrib.auth.hashers import check_password
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    response = auth_client.post(f"/api/events/{event.id}/set_security_pin/",
                                 {"pin": "1234"}, format="json")
    assert response.status_code == 200
    assert response.data["security_pin_set"] is True
    event.refresh_from_db()
    assert check_password("1234", event.security_pin)

@pytest.mark.django_db
def test_set_security_pin_clears_pin_when_null(auth_client, user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01",
                                  security_pin=make_password("1234"))
    response = auth_client.post(f"/api/events/{event.id}/set_security_pin/",
                                 {"pin": None}, format="json")
    assert response.status_code == 200
    assert response.data["security_pin_set"] is False
    event.refresh_from_db()
    assert event.security_pin is None

@pytest.mark.django_db
def test_set_security_pin_requires_auth(api_client, user):
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    response = api_client.post(f"/api/events/{event.id}/set_security_pin/",
                                {"pin": "1234"}, format="json")
    assert response.status_code == 401

# ── InvitationViewSet: check_in ────────────────────────────────────────────────

@pytest.mark.django_db
def test_check_in_with_valid_security_token(api_client, user):
    from django.core import signing
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    token = signing.dumps({"event_id": str(event.id), "organizer_id": user.id},
                           salt="security-checkin")
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                                HTTP_X_SECURITY_TOKEN=token)
    assert response.status_code == 200
    assert response.data["checked_in"] is True

@pytest.mark.django_db
def test_check_in_with_organizer_auth(auth_client, user):
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    response = auth_client.post(f"/api/invitations/{invitation.id}/check_in/")
    assert response.status_code == 200
    assert response.data["checked_in"] is True

@pytest.mark.django_db
def test_check_in_without_auth_returns_401(api_client, user):
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/")
    assert response.status_code == 401

@pytest.mark.django_db
def test_check_in_with_wrong_event_token_returns_403(api_client, user, other_user):
    from django.core import signing
    event_a = Event.objects.create(owner=user, name="Event A", date="2025-12-01")
    event_b = Event.objects.create(owner=other_user, name="Event B", date="2025-12-01")
    invitation = Invitation.objects.create(event=event_a, name="Alice", seat_number="A1", tag="VIP")
    # Token scoped to event_b, but invitation belongs to event_a
    token = signing.dumps({"event_id": str(event_b.id), "organizer_id": other_user.id},
                           salt="security-checkin")
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                                HTTP_X_SECURITY_TOKEN=token)
    assert response.status_code == 403

@pytest.mark.django_db
def test_check_in_with_expired_token_returns_401(api_client, user):
    from django.core import signing
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    # Sign with a very old timestamp by monkeypatching time — or use a bad signature
    bad_token = "this.is.not.a.valid.token"
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                                HTTP_X_SECURITY_TOKEN=bad_token)
    assert response.status_code == 401

@pytest.mark.django_db
def test_check_in_organizer_cannot_check_in_other_organizers_guest(auth_client, user, other_user):
    event = Event.objects.create(owner=other_user, name="Other Event", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    response = auth_client.post(f"/api/invitations/{invitation.id}/check_in/")
    assert response.status_code == 403

@pytest.mark.django_db
def test_check_in_returns_400_if_already_checked_in(api_client, user):
    from django.core import signing
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")
    token = signing.dumps({"event_id": str(event.id), "organizer_id": user.id},
                           salt="security-checkin")
    # First check-in
    api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                     HTTP_X_SECURITY_TOKEN=token)
    # Second check-in — should return 400
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                                HTTP_X_SECURITY_TOKEN=token)
    assert response.status_code == 400


@pytest.mark.django_db
def test_check_in_with_signature_expired_returns_401(api_client, user, monkeypatch):
    from django.core import signing
    event = Event.objects.create(owner=user, name="Gala", date="2025-12-01")
    invitation = Invitation.objects.create(event=event, name="Alice", seat_number="A1", tag="VIP")

    def mock_loads(*args, **kwargs):
        raise signing.SignatureExpired("expired")

    monkeypatch.setattr(signing, "loads", mock_loads)
    response = api_client.post(f"/api/invitations/{invitation.id}/check_in/",
                                HTTP_X_SECURITY_TOKEN="any.token.value")
    assert response.status_code == 401
    assert "expired" in response.data["detail"].lower()

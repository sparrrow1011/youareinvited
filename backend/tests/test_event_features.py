import pytest
from invitations.models import Event, KNOWN_EVENT_FEATURES


@pytest.fixture
def bare_event(user):
    """Event with no features enabled (default)."""
    return Event.objects.create(owner=user, name='Test Event', date='2026-12-01')


@pytest.mark.django_db
def test_has_feature_returns_false_by_default(bare_event):
    assert bare_event.has_feature('gallery') is False


@pytest.mark.django_db
def test_has_feature_returns_true_when_enabled(bare_event):
    bare_event.features = {'gallery': True}
    bare_event.save()
    bare_event.refresh_from_db()
    assert bare_event.has_feature('gallery') is True


@pytest.mark.django_db
def test_has_feature_returns_false_for_unknown_key(bare_event):
    bare_event.features = {'gallery': True}
    assert bare_event.has_feature('unknown_feature') is False


@pytest.mark.django_db
def test_features_field_defaults_to_empty_dict(bare_event):
    assert bare_event.features == {}


def test_known_event_features_contains_gallery():
    assert 'gallery' in KNOWN_EVENT_FEATURES


# ── SERIALIZER TESTS ──────────────────────────────────────────────────────────
from django.test import override_settings
from invitations.models import Invitation


@pytest.fixture
def gallery_event(user):
    return Event.objects.create(
        owner=user, name='Gallery Event', date='2026-12-01', features={'gallery': True}
    )


@pytest.fixture
def gallery_invitation(gallery_event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(name='Carol', event=gallery_event, checked_in=True)


@pytest.mark.django_db
def test_event_serializer_exposes_features(auth_client, gallery_event):
    response = auth_client.get(f'/api/events/{gallery_event.id}/')
    assert response.status_code == 200
    assert response.data['features'] == {'gallery': True}


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_invitation_serializer_exposes_event_features(auth_client, gallery_invitation):
    response = auth_client.get(f'/api/invitations/{gallery_invitation.id}/')
    assert response.status_code == 200
    assert response.data['event_features'] == {'gallery': True}


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_invitation_serializer_event_features_empty_by_default(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    bare_event = Event.objects.create(owner=user, name='Bare', date='2026-12-01')
    inv = Invitation.objects.create(name='Dan', event=bare_event)
    response = auth_client.get(f'/api/invitations/{inv.id}/')
    assert response.status_code == 200
    assert response.data['event_features'] == {}

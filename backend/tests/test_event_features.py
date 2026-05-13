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


# ── SUPERADMIN ENDPOINT ────────────────────────────────────────────────────────


@pytest.fixture
def admin_client(db):
    from django.contrib.auth.models import User
    from rest_framework.test import APIClient
    admin = User.objects.create_superuser(
        username='sa', email='sa@example.com', password='pass', is_staff=True
    )
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.mark.django_db
def test_superadmin_can_get_event_features(admin_client, bare_event):
    response = admin_client.get(f'/api/superadmin/events/{bare_event.id}/')
    assert response.status_code == 200
    assert response.data['features'] == {}
    assert response.data['id'] == str(bare_event.id)


@pytest.mark.django_db
def test_superadmin_can_enable_gallery(admin_client, bare_event):
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'gallery': True}},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['features'] == {'gallery': True}
    bare_event.refresh_from_db()
    assert bare_event.has_feature('gallery') is True


@pytest.mark.django_db
def test_superadmin_patch_merges_existing_features(admin_client, bare_event):
    bare_event.features = {'gallery': True}
    bare_event.save()
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'gallery': False}},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['features']['gallery'] is False


@pytest.mark.django_db
def test_superadmin_rejects_unknown_feature_key(admin_client, bare_event):
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'nonexistent': True}},
        format='json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_superadmin_event_not_found_returns_404(admin_client):
    response = admin_client.get('/api/superadmin/events/00000000-0000-0000-0000-000000000000/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_non_admin_cannot_access_superadmin_event_endpoint(api_client, bare_event):
    response = api_client.get(f'/api/superadmin/events/{bare_event.id}/')
    assert response.status_code in (401, 403)

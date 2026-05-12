import io
import pytest
from django.test import override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from invitations.models import Event, Invitation, EventPhoto


def _make_jpeg(size=(10, 10)):
    """Create a minimal valid JPEG file for upload tests."""
    buf = io.BytesIO()
    Image.new('RGB', size, color='red').save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile('photo.jpg', buf.read(), content_type='image/jpeg')


@pytest.fixture
def event(user):
    return Event.objects.create(owner=user, name='Summer Party', date='2026-09-01')


@pytest.fixture
def checked_in_invitation(event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Alice', seat_number='A1', tag='VIP', event=event, checked_in=True
    )


@pytest.fixture
def not_checked_in_invitation(event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Bob', seat_number='B1', tag='VIP', event=event, checked_in=False
    )


# ── LIST ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_checked_in_guest_can_list_photos(api_client, event, checked_in_invitation):
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_not_checked_in_guest_cannot_list_photos(api_client, event, not_checked_in_invitation):
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(not_checked_in_invitation.id)},
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_missing_invitation_param_returns_403(api_client, event):
    response = api_client.get(f'/api/events/{event.id}/photos/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_wrong_event_invitation_returns_403(api_client, user, event, checked_in_invitation, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    other_event = Event.objects.create(owner=user, name='Other Event', date='2026-10-01')
    response = api_client.get(
        f'/api/events/{other_event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 403


# ── UPLOAD ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_checked_in_guest_can_upload_photo(api_client, event, checked_in_invitation):
    image = _make_jpeg()
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    assert response.status_code == 201
    assert 'id' in response.data
    assert 'image_url' in response.data
    assert 'uploaded_at' in response.data
    assert EventPhoto.objects.filter(event=event).count() == 1


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_not_checked_in_guest_cannot_upload(api_client, event, not_checked_in_invitation):
    image = _make_jpeg()
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={not_checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    assert response.status_code == 403
    assert EventPhoto.objects.count() == 0


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_without_image_field_returns_400(api_client, event, checked_in_invitation):
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {},
        format='multipart',
    )
    assert response.status_code == 400


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_oversized_file_returns_400(api_client, event, checked_in_invitation):
    # Create a file larger than 10 MB
    buf = io.BytesIO(b'x' * (10 * 1024 * 1024 + 1))
    big_file = SimpleUploadedFile('big.jpg', buf.read(), content_type='image/jpeg')
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': big_file},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'Image must be' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_non_image_content_type_returns_400(api_client, event, checked_in_invitation):
    bad_file = SimpleUploadedFile('doc.pdf', b'%PDF-1.4', content_type='application/pdf')
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': bad_file},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'JPEG, PNG' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_spoofed_content_type_returns_400(api_client, event, checked_in_invitation):
    """A file with correct Content-Type but invalid image bytes should be rejected."""
    fake_image = SimpleUploadedFile('not_real.jpg', b'this is not an image', content_type='image/jpeg')
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': fake_image},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'valid image' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_uploaded_photo_appears_in_list(api_client, event, checked_in_invitation):
    image = _make_jpeg()
    api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_cannot_upload_photo(auth_client, event):
    image = _make_jpeg()
    response = auth_client.post(
        f'/api/events/{event.id}/photos/',
        {'image': image},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'guest invitation' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_can_list_photos_without_invitation(auth_client, event, checked_in_invitation):
    from rest_framework.test import APIClient
    # Upload as guest (unauthenticated client)
    guest_client = APIClient()
    image = _make_jpeg()
    guest_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    # List as owner (no invitation param needed)
    response = auth_client.get(f'/api/events/{event.id}/photos/')
    assert response.status_code == 200
    assert len(response.data) == 1


# ── DELETE ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_can_delete_photo(auth_client, user, event, checked_in_invitation):
    image = _make_jpeg()
    photo = EventPhoto.objects.create(
        event=event, uploaded_by=checked_in_invitation, image=image
    )
    response = auth_client.delete(f'/api/events/{event.id}/photos/{photo.id}/')
    assert response.status_code == 204
    assert EventPhoto.objects.filter(pk=photo.id).count() == 0


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_non_owner_cannot_delete_photo(api_client, other_user, event, checked_in_invitation):
    from rest_framework.test import APIClient
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    image = _make_jpeg()
    photo = EventPhoto.objects.create(
        event=event, uploaded_by=checked_in_invitation, image=image
    )
    response = other_client.delete(f'/api/events/{event.id}/photos/{photo.id}/')
    assert response.status_code in (403, 404)
    assert EventPhoto.objects.filter(pk=photo.id).count() == 1


# ── DOWNLOAD ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_can_download_zip(auth_client, event, checked_in_invitation):
    image = _make_jpeg()
    photo = EventPhoto.objects.create(event=event, uploaded_by=checked_in_invitation, image=image)
    response = auth_client.get(f'/api/events/{event.id}/photos-download/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/zip'
    assert 'attachment' in response['Content-Disposition']
    # Verify it's a valid ZIP containing the photo
    import zipfile as zf
    import io
    zip_bytes = io.BytesIO(response.content)
    with zf.ZipFile(zip_bytes, 'r') as z:
        names = z.namelist()
    assert len(names) == 1
    assert str(photo.id) in names[0]


@pytest.mark.django_db
def test_download_empty_album_returns_404(auth_client, event):
    response = auth_client.get(f'/api/events/{event.id}/photos-download/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_non_owner_cannot_download_zip(other_user, event):
    from rest_framework.test import APIClient
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    response = other_client.get(f'/api/events/{event.id}/photos-download/')
    assert response.status_code in (403, 404)


# ── VENUE QR ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_owner_can_get_venue_qr(auth_client, event):
    response = auth_client.get(f'/api/events/{event.id}/photo-qr/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'image/png'


@pytest.mark.django_db
def test_unauthenticated_cannot_get_venue_qr(api_client, event):
    response = api_client.get(f'/api/events/{event.id}/photo-qr/')
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_non_owner_cannot_get_venue_qr(other_user, event):
    from rest_framework.test import APIClient
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    response = other_client.get(f'/api/events/{event.id}/photo-qr/')
    assert response.status_code in (403, 404)

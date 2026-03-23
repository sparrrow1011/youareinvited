import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from invitations.models import Event


@pytest.mark.django_db
def test_list_events_returns_only_owners_events(auth_client, user, other_user):
    Event.objects.create(owner=user, name='My Event', date='2026-06-01')
    Event.objects.create(owner=other_user, name='Other Event', date='2026-07-01')

    response = auth_client.get('/api/events/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['name'] == 'My Event'


@pytest.mark.django_db
def test_create_event_assigns_current_user_as_owner(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'New Event',
        'date': '2026-09-01',
    }, format='json')
    assert response.status_code == 201
    assert response.data['owner'] == user.id


@pytest.mark.django_db
def test_unauthenticated_cannot_list_events(api_client):
    response = api_client.get('/api/events/')
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_invitation_list_scoped_to_owner(auth_client, user, other_user, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event1 = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    event2 = Event.objects.create(owner=other_user, name='Theirs', date='2026-06-01')
    Invitation.objects.create(name='My Guest', seat_number='A1', tag='VIP', event=event1)
    Invitation.objects.create(name='Their Guest', seat_number='B1', tag='VIP', event=event2)

    response = auth_client.get('/api/invitations/')
    assert response.status_code == 200
    names = [inv['name'] for inv in response.data]
    assert 'My Guest' in names
    assert 'Their Guest' not in names
    assert response.data[0]['event'] == str(event1.id)


@pytest.mark.django_db
def test_stats_scoped_to_owner(auth_client, user, other_user, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event1 = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    event2 = Event.objects.create(owner=other_user, name='Theirs', date='2026-06-01')
    Invitation.objects.create(name='My Guest', seat_number='A1', tag='VIP', event=event1)
    Invitation.objects.create(name='Their Guest', seat_number='B1', tag='VIP', event=event2)

    response = auth_client.get('/api/invitations/stats/')
    assert response.status_code == 200
    assert response.data['total_invitations'] == 1
    assert response.data['checked_in'] == 0


@pytest.mark.django_db
def test_create_invitation_requires_event(auth_client, user, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    response = auth_client.post('/api/invitations/', {
        'name': 'Jane Doe',
        'seat_number': 'B2',
        'tag': 'Family',
        'event': str(event.id),
    }, format='json')
    assert response.status_code == 201
    assert response.data['name'] == 'Jane Doe'
    assert response.data['event'] == str(event.id)


import io
from PIL import Image as PILImage


def make_upload_file():
    img = PILImage.new('RGB', (800, 1200), color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile('template.png', buf.read(), content_type='image/png')


@pytest.mark.django_db
def test_upload_template_saves_zones(auth_client, user, monkeypatch):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    # Monkeypatch Cloudinary storage to avoid real uploads
    monkeypatch.setattr(
        'cloudinary_storage.storage.MediaCloudinaryStorage.save',
        lambda self, name, content, max_length=None: f'event_invitation/templates/{name}'
    )
    monkeypatch.setattr(
        'cloudinary_storage.storage.MediaCloudinaryStorage.url',
        lambda self, name: f'https://res.cloudinary.com/test/{name}'
    )
    payload = {
        'background_image': make_upload_file(),
        'qr_zone': '{"x_pct": 0.3, "y_pct": 0.4, "w_pct": 0.4, "h_pct": 0.25}',
        'name_zone': '{"x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.8, "h_pct": 0.1, "font_size": 40, "color": "#fff"}',
        'tag_zone': '{"x_pct": 0.1, "y_pct": 0.32, "w_pct": 0.8, "h_pct": 0.08, "font_size": 28, "color": "#a8dadc"}',
    }
    response = auth_client.patch(
        f'/api/events/{event.id}/',
        payload,
        format='multipart'
    )
    assert response.status_code == 200
    event.refresh_from_db()
    assert event.qr_zone is not None
    assert event.qr_zone['x_pct'] == 0.3


@pytest.mark.django_db
def test_upload_template_works_with_local_file_storage(auth_client, user, tmp_path):
    event = Event.objects.create(owner=user, name='Local Media Event', date='2026-06-01')
    payload = {
        'background_image': make_upload_file(),
        'qr_zone': '{"x_pct": 0.3, "y_pct": 0.4, "w_pct": 0.4, "h_pct": 0.25}',
        'name_zone': '{"x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.8, "h_pct": 0.1, "font_size": 40, "color": "#fff"}',
        'tag_zone': '{"x_pct": 0.1, "y_pct": 0.32, "w_pct": 0.8, "h_pct": 0.08, "font_size": 28, "color": "#a8dadc"}',
    }
    local_storage = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }

    with override_settings(STORAGES=local_storage, MEDIA_ROOT=tmp_path, MEDIA_URL='/media/'):
        response = auth_client.patch(
            f'/api/events/{event.id}/',
            payload,
            format='multipart'
        )

    assert response.status_code == 200
    assert '/media/event_invitation/templates/' in response.data['background_image']
    event.refresh_from_db()
    assert event.background_image.name.startswith('event_invitation/templates/')


@pytest.mark.django_db
def test_create_invitation_with_local_template_returns_201(auth_client, user, tmp_path):
    local_storage = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }

    with override_settings(STORAGES=local_storage, MEDIA_ROOT=tmp_path, MEDIA_URL='/media/'):
        event = Event.objects.create(
            owner=user,
            name='Template Event',
            date='2026-06-01',
            qr_zone={'x_pct': 0.3, 'y_pct': 0.4, 'w_pct': 0.4, 'h_pct': 0.25},
            name_zone={'x_pct': 0.1, 'y_pct': 0.2, 'w_pct': 0.8, 'h_pct': 0.1, 'font_size': 40, 'color': '#fff'},
            tag_zone={'x_pct': 0.1, 'y_pct': 0.32, 'w_pct': 0.8, 'h_pct': 0.08, 'font_size': 28, 'color': '#a8dadc'},
        )
        event.background_image.save('template.png', make_upload_file(), save=True)

        response = auth_client.post('/api/invitations/', {
            'name': 'Jane Doe',
            'seat_number': 'B2',
            'tag': 'Family',
            'event': str(event.id),
        }, format='json')

    assert response.status_code == 201
    assert '/media/event_invitation/qr_codes/' in response.data['qr_code']
    assert '/media/event_invitation/e_invites/' in response.data['e_invite_image']

import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from invitations.models import Event, Invitation


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
def test_invitation_list_supports_event_pagination_and_search(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    other_event = Event.objects.create(owner=user, name='Other', date='2026-07-01')

    Invitation.objects.create(name='Ada Lovelace', seat_number='A1', tag='VIP', event=event)
    Invitation.objects.create(name='Grace Hopper', seat_number='B2', tag='Family', event=event)
    alan = Invitation.objects.create(name='Alan Turing', seat_number='C3', tag='VIP', event=event)
    Invitation.objects.create(name='Other Guest', seat_number='D4', tag='VIP', event=other_event)
    alan.record_rsvp(True)

    response = auth_client.get(f'/api/invitations/?event={event.id}&page=1&page_size=2&search=vip&rsvp=attending')

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert response.data['page'] == 1
    assert response.data['page_size'] == 2
    assert response.data['total_pages'] == 1
    assert response.data['stats']['total_invitations'] == 3
    assert response.data['results'][0]['name'] == 'Alan Turing'
    assert response.data['results'][0]['rsvp_attending'] is True
    assert response.data['results'][0]['rsvp_responded_at'] is not None


@pytest.mark.django_db
def test_public_invitation_rsvp_endpoint_updates_attendance(api_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    invitation = Invitation.objects.create(name='Ada Lovelace', seat_number='A1', tag='VIP', event=event)

    response = api_client.post(f'/api/invitations/{invitation.id}/rsvp/', {'attending': True}, format='json')

    assert response.status_code == 200
    assert response.data['rsvp_attending'] is True
    assert response.data['rsvp_responded_at'] is not None
    invitation.refresh_from_db()
    assert invitation.rsvp_attending is True
    assert invitation.rsvp_responded_at is not None


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
def test_upload_template_saves_zones(auth_client, user, tmp_path):
    """Template upload saves zone JSON — uses local filesystem storage."""
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    local_storage = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    payload = {
        'background_image': make_upload_file(),
        'qr_zone': '{"x_pct": 0.3, "y_pct": 0.4, "w_pct": 0.4, "h_pct": 0.25}',
        'name_zone': '{"x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.8, "h_pct": 0.1, "font_size": 40, "color": "#fff"}',
        'tag_zone': '{"x_pct": 0.1, "y_pct": 0.32, "w_pct": 0.8, "h_pct": 0.08, "font_size": 28, "color": "#a8dadc"}',
    }
    with override_settings(STORAGES=local_storage, MEDIA_ROOT=tmp_path, MEDIA_URL='/media/'):
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
    """Template upload stores file at username/event-slug/template/ path."""
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

    from django.utils.text import slugify
    safe_username = slugify(user.username.split('@', 1)[0])
    assert response.status_code == 200
    event.refresh_from_db()
    # Path follows safe-username/event-slug/template/ structure
    assert f'{safe_username}/' in event.background_image.name
    assert '/template/' in event.background_image.name


@pytest.mark.django_db
def test_upload_template_returns_400_on_vercel_without_s3(auth_client, user):
    """Template upload on Vercel without S3 returns 400."""
    event = Event.objects.create(owner=user, name='Vercel Event', date='2026-06-01')
    payload = {
        'background_image': make_upload_file(),
        'qr_zone': '{"x_pct": 0.3, "y_pct": 0.4, "w_pct": 0.4, "h_pct": 0.25}',
        'name_zone': '{"x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.8, "h_pct": 0.1, "font_size": 40, "color": "#fff"}',
        'tag_zone': '{"x_pct": 0.1, "y_pct": 0.32, "w_pct": 0.8, "h_pct": 0.08, "font_size": 28, "color": "#a8dadc"}',
    }

    with override_settings(IS_VERCEL=True, USE_S3_STORAGE=False):
        response = auth_client.patch(
            f'/api/events/{event.id}/',
            payload,
            format='multipart'
        )

    assert response.status_code == 400
    assert 'S3' in response.data['detail']


@pytest.mark.django_db
def test_create_invitation_with_local_template_returns_201(auth_client, user, tmp_path):
    """Creating an invitation generates QR and e-invite at the S3-style path structure."""
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

    from django.utils.text import slugify
    safe_username = slugify(user.username.split('@', 1)[0])
    assert response.status_code == 201
    # Paths follow safe-username/event-slug/qr/ and /invites/ structure
    assert f'/media/{safe_username}/' in response.data['qr_code']
    assert '/qr/' in response.data['qr_code']
    assert f'/media/{safe_username}/' in response.data['e_invite_image']
    assert '/invites/' in response.data['e_invite_image']


@pytest.mark.django_db
def test_create_invitation_returns_400_on_vercel_without_s3(auth_client, user):
    """Creating an invitation on Vercel without S3 configured returns 400."""
    event = Event.objects.create(owner=user, name='Needs Media Storage', date='2026-06-01')

    with override_settings(IS_VERCEL=True, USE_S3_STORAGE=False):
        response = auth_client.post('/api/invitations/', {
            'name': 'Jane Doe',
            'seat_number': 'B2',
            'tag': 'Family',
            'event': str(event.id),
        }, format='json')

    assert response.status_code == 400
    assert 'S3' in response.data['detail']


@pytest.mark.django_db
def test_bulk_import_accepts_blank_seat_and_tag(auth_client, user, monkeypatch):
    """seat_number and tag are optional — blank values must be accepted."""
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = "name,seat_number,tag\nAlice,,\nBob,B-1,\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"
    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["created"] == 2
    assert response.data["errors"] == []
    # Verify blank fields are stored as empty strings, not None
    alice = Invitation.objects.get(event=event, name="Alice")
    assert alice.seat_number == ""
    assert alice.tag == ""


@pytest.mark.django_db
def test_bulk_delete_removes_selected_event_invitations(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    keep = Invitation.objects.create(event=event, name="Keep", seat_number="", tag="")
    remove_one = Invitation.objects.create(event=event, name="Remove One", seat_number="", tag="")
    remove_two = Invitation.objects.create(event=event, name="Remove Two", seat_number="", tag="")

    response = auth_client.post(
        "/api/invitations/bulk_delete/",
        {
            "event": str(event.id),
            "invitation_ids": [str(remove_one.id), str(remove_two.id)],
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["deleted"] == 2
    assert Invitation.objects.filter(id=keep.id).exists()
    assert not Invitation.objects.filter(id=remove_one.id).exists()
    assert not Invitation.objects.filter(id=remove_two.id).exists()


@pytest.mark.django_db
def test_bulk_delete_does_not_remove_other_users_invitations(auth_client, user, other_user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    other_event = Event.objects.create(owner=other_user, name="Other Event", date="2025-12-01")
    own_invitation = Invitation.objects.create(event=event, name="Own", seat_number="", tag="")
    other_invitation = Invitation.objects.create(event=other_event, name="Other", seat_number="", tag="")

    response = auth_client.post(
        "/api/invitations/bulk_delete/",
        {
            "event": str(event.id),
            "invitation_ids": [str(own_invitation.id), str(other_invitation.id)],
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["deleted"] == 1
    assert not Invitation.objects.filter(id=own_invitation.id).exists()
    assert Invitation.objects.filter(id=other_invitation.id).exists()


@pytest.mark.django_db
def test_bulk_import_accepts_rows_with_missing_trailing_cells(auth_client, user, monkeypatch):
    """Rows with omitted optional trailing cells should not crash the importer."""
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = "name,seat_number,tag\nAlice\nBob,B-1\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"

    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )

    assert response.status_code == 201
    assert response.data["created"] == 2
    assert response.data["errors"] == []
    alice = Invitation.objects.get(event=event, name="Alice")
    assert alice.seat_number == ""
    assert alice.tag == ""


@pytest.mark.django_db
def test_bulk_import_normalises_header_names(auth_client, user, monkeypatch):
    """Header casing and surrounding spaces should not make valid CSV rows empty."""
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = " Name , Seat_Number , Tag \nAlice,A-1,VIP\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"

    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )

    assert response.status_code == 201
    assert response.data["created"] == 1
    assert response.data["errors"] == []
    assert Invitation.objects.filter(event=event, name="Alice", seat_number="A-1", tag="VIP").exists()


@pytest.mark.django_db
def test_bulk_import_accepts_optional_phone_number(auth_client, user, monkeypatch):
    """CSV imports should store phone_number when the optional column is present."""
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = (
        "name,seat_number,tag,phone_number\n"
        "Brother Musa,,Orange,8060681740\n"
        "Akehinde,,Orange,8033907516\n"
    )
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"

    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )

    assert response.status_code == 201
    assert response.data["created"] == 2
    assert response.data["errors"] == []
    assert Invitation.objects.get(event=event, name="Brother Musa").phone_number == "8060681740"


@pytest.mark.django_db
def test_bulk_import_returns_row_error_when_invitation_creation_fails(auth_client, user, monkeypatch):
    """Unexpected per-row create failures should be reported without a 500."""
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")

    def fail_create(*args, **kwargs):
        raise RuntimeError("image generation failed")

    monkeypatch.setattr(Invitation.objects, 'create', fail_create)
    csv_content = "name,seat_number,tag,phone_number\nBrother Musa,,Orange,8060681740\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"

    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )

    assert response.status_code == 201
    assert response.data["created"] == 0
    assert len(response.data["errors"]) == 1
    assert "could not create invitation" in response.data["errors"][0]


@pytest.mark.django_db
def test_bulk_import_falls_back_when_event_template_file_is_missing(auth_client, user, tmp_path):
    """A stale template file reference should not block guest imports."""
    local_storage = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }

    with override_settings(STORAGES=local_storage, MEDIA_ROOT=tmp_path, MEDIA_URL='/media/'):
        event = Event.objects.create(
            owner=user,
            name="Missing Template Event",
            date="2025-12-01",
            background_image="missing/template/background.PNG",
        )
        csv_content = "name,seat_number,tag,phone_number\nBrother Musa,,Orange,8060681740\n"
        csv_file = io.BytesIO(csv_content.encode())
        csv_file.name = "guests.csv"

        response = auth_client.post(
            "/api/invitations/bulk_import/",
            {"event": str(event.id), "file": csv_file},
            format="multipart",
        )

    assert response.status_code == 201
    assert response.data["created"] == 1
    assert response.data["errors"] == []
    invitation = Invitation.objects.get(event=event, name="Brother Musa")
    assert invitation.e_invite_image.name


@pytest.mark.django_db
def test_bulk_import_still_rejects_blank_name(auth_client, user, monkeypatch):
    """name is still required — a row with a blank name must produce an error."""
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = "name,seat_number,tag\n,A-1,VIP\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"
    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["created"] == 0
    assert len(response.data["errors"]) == 1
    assert "name is required" in response.data["errors"][0].lower()


@pytest.mark.django_db
def test_public_event_info_includes_brand_only_when_enabled(api_client, user):
    user.profile.brand_name = 'Golden Hour Studio'
    user.profile.show_branding_on_event_surfaces = True
    user.profile.save()
    event = Event.objects.create(owner=user, name='Public Event', date='2026-07-01')

    response = api_client.get(f'/api/events/{event.id}/public_info/')

    assert response.status_code == 200
    assert response.data['brand_name'] == 'Golden Hour Studio'
    assert response.data['show_event_branding'] is True


@pytest.mark.django_db
def test_public_invitation_hides_brand_when_disabled(api_client, user, monkeypatch):
    user.profile.brand_name = 'Golden Hour Studio'
    user.profile.show_branding_on_event_surfaces = False
    user.profile.save()
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Hidden Brand Event', date='2026-06-01')
    invitation = Invitation.objects.create(name='Guest', seat_number='A1', tag='VIP', event=event)

    response = api_client.get(f'/api/invitations/{invitation.id}/')

    assert response.status_code == 200
    assert response.data['show_event_branding'] is False
    assert response.data['brand_name'] == ''


@pytest.mark.django_db
def test_public_invitation_tracks_views_only_when_requested(api_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='View Event', date='2026-06-01')
    invitation = Invitation.objects.create(name='Viewed Guest', seat_number='A1', tag='VIP', event=event)

    api_client.get(f'/api/invitations/{invitation.id}/')
    invitation.refresh_from_db()
    assert invitation.view_count == 0

    response = api_client.get(f'/api/invitations/{invitation.id}/?track_view=1')
    invitation.refresh_from_db()

    assert response.status_code == 200
    assert invitation.view_count == 1
    assert invitation.first_viewed_at is not None
    assert invitation.last_viewed_at is not None


@pytest.mark.django_db
def test_track_share_updates_channel_counts(api_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Share Event', date='2026-06-01')
    invitation = Invitation.objects.create(name='Shared Guest', seat_number='A3', tag='VIP', event=event)

    response = api_client.post(
        f'/api/invitations/{invitation.id}/track_share/',
        {'channel': 'whatsapp'},
        format='json',
    )

    assert response.status_code == 200
    invitation.refresh_from_db()
    assert invitation.whatsapp_share_count == 1
    assert invitation.link_share_count == 0


@pytest.mark.django_db
def test_analytics_returns_core_metrics(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    primary_event = Event.objects.create(owner=user, name='Primary Event', date='2026-06-01')
    secondary_event = Event.objects.create(owner=user, name='Secondary Event', date='2026-07-01')

    first = Invitation.objects.create(name='Ada', seat_number='A1', tag='VIP', event=primary_event)
    second = Invitation.objects.create(name='Ben', seat_number='A2', tag='', event=primary_event)
    third = Invitation.objects.create(name='Cleo', seat_number='B1', tag='General', event=secondary_event)

    now = timezone.now()
    Invitation.objects.filter(pk=first.pk).update(
        view_count=2,
        first_viewed_at=now,
        last_viewed_at=now,
        whatsapp_share_count=1,
        checked_in=True,
        checked_in_at=now,
    )
    Invitation.objects.filter(pk=second.pk).update(
        view_count=1,
        first_viewed_at=now,
        last_viewed_at=now,
        link_share_count=2,
    )

    response = auth_client.get('/api/invitations/analytics/')

    assert response.status_code == 200
    assert response.data['totals']['invitations_sent'] == 3
    assert response.data['totals']['invitation_opens'] == 3
    assert response.data['totals']['viewed_invitations'] == 2
    assert response.data['totals']['whatsapp_shares'] == 1
    assert response.data['totals']['link_shares'] == 2
    assert response.data['totals']['checked_in'] == 1
    assert response.data['totals']['pending'] == 2
    assert response.data['funnel']['created'] == 3
    assert response.data['funnel']['viewed'] == 2
    assert response.data['funnel']['arrived'] == 1
    assert response.data['event_comparison'][0]['event_name'] == 'Primary Event'
    assert any(row['tag'] == 'VIP' for row in response.data['tag_breakdown'])
    assert any(row['tag'] == 'Uncategorized' for row in response.data['tag_breakdown'])


@pytest.mark.django_db
def test_analytics_export_returns_csv(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='CSV Event', date='2026-06-01')
    Invitation.objects.create(name='Dana', seat_number='C1', tag='VIP', event=event)

    response = auth_client.get('/api/invitations/analytics/export/')

    assert response.status_code == 200
    assert response['Content-Type'].startswith('text/csv')
    assert 'attachment;' in response['Content-Disposition']
    assert 'Event Comparison' in response.content.decode('utf-8')


@pytest.mark.django_db
def test_event_serializer_exposes_theme_fields(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'Birthday Bash',
        'date': '2026-12-01',
        'theme': 'birthday',
        'theme_data': {'ageNumber': '30', 'ageWord': 'thirty'},
    }, format='json')
    assert response.status_code == 201
    assert response.data['theme'] == 'birthday'
    assert response.data['theme_data'] == {'ageNumber': '30', 'ageWord': 'thirty'}


@pytest.mark.django_db
def test_event_theme_defaults_to_empty(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'Simple Event',
        'date': '2026-12-01',
    }, format='json')
    assert response.status_code == 201
    assert response.data['theme'] == ''
    assert response.data['theme_data'] == {}


@pytest.mark.django_db
def test_invitation_exposes_event_theme_fields(api_client, user, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)

    event = Event.objects.create(
        owner=user, name='Birthday', date='2026-12-01',
        theme='birthday', theme_data={'ageNumber': '30'}
    )
    inv = Invitation.objects.create(name='Alice', seat_number='A1', tag='VIP', event=event)

    response = api_client.get(f'/api/invitations/{inv.id}/')
    assert response.status_code == 200
    assert response.data['event_theme'] == 'birthday'
    assert response.data['event_theme_data'] == {'ageNumber': '30'}
    assert response.data['event_date'] == '2026-12-01'

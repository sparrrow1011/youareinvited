import pytest
from django.contrib.auth.models import User
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

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

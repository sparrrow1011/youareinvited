from datetime import date

import pytest
from django.test import Client, override_settings
from django.contrib.auth.models import User
from django.core import signing

from invitations.models import Event, Invitation


@pytest.mark.django_db
def test_register_creates_user_and_profile(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'new@example.com',
        'password': 'X9mK#vPqL2!',
    }, format='json')
    assert response.status_code == 201
    assert 'access' in response.data
    assert 'refresh' in response.data
    user = User.objects.get(email='new@example.com')
    assert hasattr(user, 'profile')
    assert user.profile.plan == 'free'


@pytest.mark.django_db
def test_register_preflight_allows_127_localhost_origin():
    response = Client().options(
        '/api/auth/register/',
        HTTP_ORIGIN='http://127.0.0.1:3000',
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type',
    )
    assert response.status_code == 200
    assert response['access-control-allow-origin'] == 'http://127.0.0.1:3000'


@pytest.mark.django_db
def test_login_returns_token(api_client, user):
    response = api_client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'testpassword123',
    }, format='json')
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data


@pytest.mark.django_db
def test_login_wrong_password_returns_401(api_client, user):
    response = api_client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'wrongpassword',
    }, format='json')
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_returns_200(auth_client):
    response = auth_client.post('/api/auth/logout/')
    assert response.status_code == 200


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client, user):
    # Login to get tokens
    login_response = api_client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'testpassword123',
    }, format='json')
    refresh_token = login_response.data['refresh']
    access_token = login_response.data['access']

    # Logout with the refresh token
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    logout_response = api_client.post('/api/auth/logout/', {'refresh': refresh_token}, format='json')
    assert logout_response.status_code == 200

    # Attempt to refresh with the blacklisted token — should fail
    refresh_response = api_client.post('/api/auth/refresh/', {'refresh': refresh_token}, format='json')
    assert refresh_response.status_code == 401


@pytest.mark.django_db
def test_me_returns_authenticated_user(auth_client, user):
    user.first_name = 'Ada'
    user.last_name = 'Lovelace'
    user.profile.plan = 'pro'
    user.profile.brand_name = 'Starlight Studio'
    user.profile.show_branding_on_event_surfaces = True
    user.save()
    user.profile.save()

    response = auth_client.get('/api/auth/me/')

    assert response.status_code == 200
    assert response.data['email'] == 'testuser@example.com'
    assert response.data['username'] == 'testuser@example.com'
    assert response.data['display_name'] == 'Ada Lovelace'
    assert response.data['avatar_initial'] == 'T'
    assert response.data['plan'] == 'pro'
    assert response.data['brand_name'] == 'Starlight Studio'
    assert response.data['show_event_branding'] is True


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get('/api/auth/me/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_account_settings_returns_profile_state(auth_client, user):
    user.profile.brand_name = 'Starlight Events'
    user.profile.default_whatsapp_message_template = 'Hello {{name}}'
    user.profile.show_branding_on_event_surfaces = True
    user.profile.watermark_override = True
    user.profile.save()

    response = auth_client.get('/api/auth/settings/')

    assert response.status_code == 200
    assert response.data['brand_name'] == 'Starlight Events'
    assert response.data['default_whatsapp_message_template'] == 'Hello {{name}}'
    assert response.data['show_event_branding'] is True
    assert response.data['watermark_override'] is True


@pytest.mark.django_db
def test_account_settings_patch_updates_user_profile_and_password(auth_client, user):
    response = auth_client.patch('/api/auth/settings/', {
        'display_name': 'Nova Curator',
        'brand_name': 'Golden Hour Studio',
        'show_event_branding': True,
        'default_whatsapp_message_template': 'See you soon, {{name}}',
        'current_password': 'testpassword123',
        'new_password': 'NewPass#12345',
    }, format='json')

    assert response.status_code == 200

    user.refresh_from_db()
    user.profile.refresh_from_db()
    assert user.first_name == 'Nova'
    assert user.last_name == 'Curator'
    assert user.profile.brand_name == 'Golden Hour Studio'
    assert user.profile.show_branding_on_event_surfaces is True
    assert user.profile.default_whatsapp_message_template == 'See you soon, {{name}}'
    assert user.check_password('NewPass#12345')


@pytest.mark.django_db
def test_account_settings_rejects_watermark_override_patch(auth_client):
    response = auth_client.patch('/api/auth/settings/', {
        'watermark_override': True,
    }, format='json')

    assert response.status_code == 400
    assert response.data['watermark_override'] == ['Watermark access is controlled by superadmin.']


@pytest.mark.django_db
def test_export_account_data_returns_events_and_invitations(auth_client, user):
    event = Event.objects.create(owner=user, name='Moonlight Gala', date=date(2026, 4, 1))
    Invitation.objects.create(event=event, name='Ada', seat_number='A1', tag='VIP')

    response = auth_client.get('/api/auth/export/')

    assert response.status_code == 200
    assert response.data['account']['email'] == 'testuser@example.com'
    assert len(response.data['events']) == 1
    assert len(response.data['invitations']) == 1
    assert 'attachment;' in response['Content-Disposition']


@pytest.mark.django_db
def test_delete_account_removes_authenticated_user(auth_client, user):
    response = auth_client.delete('/api/auth/delete/', {
        'password': 'testpassword123',
    }, format='json')

    assert response.status_code == 204
    assert not User.objects.filter(pk=user.pk).exists()


@pytest.mark.django_db
def test_register_creates_unverified_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'unverified@example.com',
        'password': 'X9mK#vPqL2!',
    }, format='json')
    assert response.status_code == 201
    user = User.objects.get(email='unverified@example.com')
    assert user.profile.email_verified is False


@pytest.mark.django_db
def test_me_returns_email_verified_field(auth_client, user):
    response = auth_client.get('/api/auth/me/')
    assert response.status_code == 200
    assert 'email_verified' in response.data
    assert response.data['email_verified'] is True


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_register_sends_verification_email(api_client):
    from django.core import mail
    response = api_client.post('/api/auth/register/', {
        'email': 'emailtest@example.com',
        'password': 'X9mK#vPqL2!',
    }, format='json')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'emailtest@example.com' in mail.outbox[0].to
    assert 'verify' in mail.outbox[0].subject.lower()


@pytest.mark.django_db
def test_verify_email_valid_token(api_client, user):
    user.profile.email_verified = False
    user.profile.save(update_fields=['email_verified'])

    token = signing.dumps({'user_id': user.id}, salt='email-verification')
    response = api_client.get(f'/api/auth/verify-email/?token={token}')

    assert response.status_code == 200
    assert 'access' in response.data
    user.profile.refresh_from_db()
    assert user.profile.email_verified is True


@pytest.mark.django_db
def test_verify_email_expired_token(api_client, user):
    from unittest.mock import patch
    import time as time_mod

    # Sign a token as if it was created 90000 seconds ago (> 86400s max_age)
    with patch.object(time_mod, 'time', return_value=time_mod.time() - 90000):
        token = signing.dumps({'user_id': user.id}, salt='email-verification')
    response = api_client.get(f'/api/auth/verify-email/?token={token}')
    assert response.status_code == 400
    assert 'expired' in response.data['detail'].lower()


@pytest.mark.django_db
def test_verify_email_invalid_token(api_client):
    response = api_client.get('/api/auth/verify-email/?token=not-a-valid-token')
    assert response.status_code == 400

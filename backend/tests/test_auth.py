import pytest
from django.contrib.auth.models import User


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

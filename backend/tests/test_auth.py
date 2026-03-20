import pytest
from django.contrib.auth.models import User


@pytest.mark.django_db
def test_register_creates_user_and_profile(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'new@example.com',
        'password': 'strongpass123',
    }, format='json')
    assert response.status_code == 201
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

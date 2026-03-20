import pytest
from django.contrib.auth.models import User


@pytest.fixture
def user(db):
    u = User.objects.create_user(
        username='testuser@example.com',
        email='testuser@example.com',
        password='testpassword123'
    )
    return u


@pytest.fixture
def other_user(db):
    u = User.objects.create_user(
        username='other@example.com',
        email='other@example.com',
        password='testpassword123'
    )
    return u


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

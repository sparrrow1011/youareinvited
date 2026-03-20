import pytest
from django.contrib.auth.models import User
from invitations.models import UserProfile


@pytest.mark.django_db
def test_userprofile_created_on_user_creation():
    user = User.objects.create_user(
        username='newuser@example.com',
        email='newuser@example.com',
        password='pass123'
    )
    assert hasattr(user, 'profile')
    assert user.profile.plan == 'free'
    assert user.profile.watermark_override is False


@pytest.mark.django_db
def test_userprofile_defaults_to_free_plan(user):
    assert user.profile.plan == 'free'
    assert user.profile.watermark_override is False

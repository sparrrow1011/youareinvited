import pytest
from django.contrib.auth.models import User
from invitations.models import UserProfile, Event


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


@pytest.mark.django_db
def test_event_belongs_to_owner(user):
    event = Event.objects.create(
        owner=user,
        name='Test Wedding',
        date='2026-06-01',
    )
    assert event.owner == user
    assert str(event) == 'Test Wedding'
    assert event.qr_zone is None
    assert event.name_zone is None
    assert event.tag_zone is None
    assert event.has_template() is False


@pytest.mark.django_db
def test_event_has_template_false_when_zone_missing(user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    event.qr_zone = {'x_pct': 0.3, 'y_pct': 0.4, 'w_pct': 0.4, 'h_pct': 0.25}
    # name_zone and tag_zone not set
    event.save()
    assert event.has_template() is False

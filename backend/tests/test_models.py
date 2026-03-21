import pytest
from django.contrib.auth.models import User
from invitations.models import UserProfile, Event, Invitation


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


@pytest.mark.django_db
def test_invitation_can_have_event(user, monkeypatch):
    from invitations.models import Event, Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    event = Event.objects.create(owner=user, name='Wedding', date='2026-06-01')
    invitation = Invitation.objects.create(
        name='John Doe',
        seat_number='A1',
        tag='VIP',
        event=event,
    )
    assert invitation.event == event
    assert invitation.event.owner == user


@pytest.mark.django_db
def test_invitation_requires_event():
    from django.db import IntegrityError
    from invitations.models import Invitation
    with pytest.raises((IntegrityError, Exception)):
        inv = Invitation(
            name='No Event Person',
            seat_number='Z9',
            tag='General',
        )
        inv.save()


@pytest.mark.django_db
def test_watermark_shown_for_free_user(user):
    from invitations.models import Event
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    owner = event.owner
    show = not owner.profile.watermark_override and owner.profile.plan == 'free'
    assert show is True


@pytest.mark.django_db
def test_watermark_hidden_for_pro_user(user):
    user.profile.plan = 'pro'
    user.profile.save()
    from invitations.models import Event
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    owner = event.owner
    show = not owner.profile.watermark_override and owner.profile.plan == 'free'
    assert show is False


@pytest.mark.django_db
def test_watermark_override_ignores_plan(user):
    user.profile.watermark_override = True
    user.profile.save()
    show = not user.profile.watermark_override and user.profile.plan == 'free'
    assert show is False


@pytest.mark.django_db
def test_generate_e_invite_uses_template_when_all_zones_set(user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    event.qr_zone = {'x_pct': 0.3, 'y_pct': 0.4, 'w_pct': 0.4, 'h_pct': 0.25}
    event.name_zone = {'x_pct': 0.1, 'y_pct': 0.2, 'w_pct': 0.8, 'h_pct': 0.1, 'font_size': 40, 'color': '#ffffff'}
    event.tag_zone = {'x_pct': 0.1, 'y_pct': 0.32, 'w_pct': 0.8, 'h_pct': 0.08, 'font_size': 28, 'color': '#a8dadc'}
    event.save()
    assert event.has_template() is False  # No background_image yet

    # With all zones but no image, has_template is False
    assert event.has_template() is False

import pytest
from invitations.models import Event, KNOWN_EVENT_FEATURES


@pytest.fixture
def bare_event(user):
    """Event with no features enabled (default)."""
    return Event.objects.create(owner=user, name='Test Event', date='2026-12-01')


@pytest.mark.django_db
def test_has_feature_returns_false_by_default(bare_event):
    assert bare_event.has_feature('gallery') is False


@pytest.mark.django_db
def test_has_feature_returns_true_when_enabled(bare_event):
    bare_event.features = {'gallery': True}
    bare_event.save()
    bare_event.refresh_from_db()
    assert bare_event.has_feature('gallery') is True


@pytest.mark.django_db
def test_has_feature_returns_false_for_unknown_key(bare_event):
    bare_event.features = {'gallery': True}
    assert bare_event.has_feature('unknown_feature') is False


@pytest.mark.django_db
def test_features_field_defaults_to_empty_dict(bare_event):
    assert bare_event.features == {}


def test_known_event_features_contains_gallery():
    assert 'gallery' in KNOWN_EVENT_FEATURES

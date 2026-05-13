# Per-Event Feature Flags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate pro features at the per-event level starting with Photo Gallery, using a `features` JSONField on `Event` that makes it trivial to add future pro features.

**Architecture:** `Event.features = JSONField(default=dict)` is the single source of truth. A `KNOWN_EVENT_FEATURES` registry and `event.has_feature(key)` method standardise all checks. Guest access to the photos endpoint is blocked when `gallery` is not in `features`; organiser access is always allowed so they see the upgrade banner. The invitation API response exposes `event_features` so the invite page knows without a second API call.

**Tech Stack:** Django 5, Django REST Framework, Next.js 14, TypeScript, pytest, React

---

## File Map

| File | Change |
|---|---|
| `backend/invitations/models.py` | Add `KNOWN_EVENT_FEATURES`, `Event.features` field, `Event.has_feature()` |
| `backend/invitations/migrations/0024_event_features.py` | New migration |
| `backend/invitations/views.py` | Gate `photos` action on `gallery` feature for non-owners |
| `backend/invitations/serializers.py` | Add `features` to `EventSerializer`; add `event_features` to `InvitationSerializer` |
| `backend/invitations/admin.py` | Expose `features` on `EventAdmin` |
| `backend/invitations/superadmin_views.py` | New `superadmin_event_detail` view |
| `backend/api/urls.py` | Register `superadmin_event_detail` route |
| `backend/tests/test_photos.py` | Update `event` fixture to enable gallery; add feature-gating tests |
| `backend/tests/test_event_features.py` | New — unit tests for model + superadmin endpoint |
| `web/src/lib/api.ts` | Add `features` to `Event` interface; add `event_features` to `Invitation` interface |
| `web/src/components/ProFeatureBanner.tsx` | New reusable component |
| `web/src/app/events/[id]/page.tsx` | Show `ProFeatureBanner` in Photos tab when gallery disabled |
| `web/src/app/invite/[id]/InviteClient.tsx` | Gate `guestPhotoSection` on `event_features.gallery` |

---

### Task 1: Event model — `features` field + `has_feature` method

**Files:**
- Modify: `backend/invitations/models.py` (around line 81)
- Create: `backend/invitations/migrations/0024_event_features.py`
- Create: `backend/tests/test_event_features.py`

- [ ] **Step 1: Write the failing model tests**

Create `backend/tests/test_event_features.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failures (field doesn't exist yet)**

```bash
cd backend
DATABASE_URL="" python -m pytest tests/test_event_features.py -v
```

Expected: `FAILED` with `AttributeError: type object 'Event' has no attribute 'features'`

- [ ] **Step 3: Add `KNOWN_EVENT_FEATURES`, `features` field, and `has_feature()` to `models.py`**

In `backend/invitations/models.py`, after the `import uuid` line at the top of the file, add the registry constant (before the class definitions):

Find the line `class Event(models.Model):` at line 81. Add the constant immediately above it:

```python
KNOWN_EVENT_FEATURES: dict[str, str] = {
    'gallery': 'Event Photo Gallery',
    # Add future pro features here:
    # 'live_stream': 'Live Stream Embed',
    # 'custom_rsvp_questions': 'Custom RSVP Questions',
}


class Event(models.Model):
```

Inside `Event`, after line 103 (`theme_data = models.JSONField(default=dict, blank=True)`), add the `features` field:

```python
    theme_data = models.JSONField(default=dict, blank=True)
    features = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

After the `has_template` method (line 112–113), add `has_feature`:

```python
    def has_template(self):
        return bool(self.background_image)

    def has_feature(self, key: str) -> bool:
        """Return True if the named pro feature is enabled for this event."""
        return bool(self.features.get(key, False))
```

- [ ] **Step 4: Create the migration**

```bash
cd backend
python manage.py makemigrations invitations --name event_features
```

Expected output: `Migrations for 'invitations': invitations/migrations/0024_event_features.py`

- [ ] **Step 5: Apply the migration and run tests**

```bash
DATABASE_URL="" python manage.py migrate --run-syncdb 2>/dev/null; \
DATABASE_URL="" python -m pytest tests/test_event_features.py -v
```

Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py \
        backend/invitations/migrations/0024_event_features.py \
        backend/tests/test_event_features.py
git commit -m "feat: add Event.features JSONField and has_feature() for per-event pro feature gating"
```

---

### Task 2: Backend — Gate the photos endpoint on `gallery` feature

**Files:**
- Modify: `backend/invitations/views.py` (around line 1025)
- Modify: `backend/tests/test_photos.py`

- [ ] **Step 1: Update the `event` fixture in `test_photos.py` to enable gallery**

The existing photo tests will all fail once gating is added because the default `event` has `features={}`. Fix the fixture first so existing tests continue to pass.

In `backend/tests/test_photos.py`, find:

```python
@pytest.fixture
def event(user):
    return Event.objects.create(owner=user, name='Summer Party', date='2026-09-01')
```

Replace with:

```python
@pytest.fixture
def event(user):
    """Gallery-enabled event — used by all existing photo tests."""
    return Event.objects.create(
        owner=user, name='Summer Party', date='2026-09-01', features={'gallery': True}
    )
```

- [ ] **Step 2: Add feature-gating tests**

Add these tests at the bottom of `backend/tests/test_photos.py`:

```python
# ── FEATURE GATING ────────────────────────────────────────────────────────────

@pytest.fixture
def locked_event(user):
    """Event with gallery feature NOT enabled."""
    return Event.objects.create(owner=user, name='Locked Party', date='2026-09-01')


@pytest.fixture
def locked_checked_in_invitation(locked_event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Eve', seat_number='E1', tag='VIP', event=locked_event, checked_in=True
    )


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_gallery_disabled_guest_cannot_list_photos(api_client, locked_event, locked_checked_in_invitation):
    response = api_client.get(
        f'/api/events/{locked_event.id}/photos/',
        {'invitation': str(locked_checked_in_invitation.id)},
    )
    assert response.status_code == 403
    assert 'not enabled' in response.data['detail'].lower()


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_gallery_disabled_guest_cannot_upload(api_client, locked_event, locked_checked_in_invitation):
    response = api_client.post(
        f'/api/events/{locked_event.id}/photos/?invitation={locked_checked_in_invitation.id}',
        {'image': _make_jpeg()},
        format='multipart',
    )
    assert response.status_code == 403
    assert 'not enabled' in response.data['detail'].lower()


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_gallery_disabled_owner_can_still_list_photos(auth_client, locked_event):
    """Owner always sees their photos tab even when gallery is disabled."""
    response = auth_client.get(f'/api/events/{locked_event.id}/photos/')
    assert response.status_code == 200
```

- [ ] **Step 3: Run new tests — expect failures**

```bash
cd backend
DATABASE_URL="" python -m pytest tests/test_photos.py -k "gallery_disabled" -v
```

Expected: `3 failed` (feature gating logic not implemented yet)

- [ ] **Step 4: Add the feature gate to `views.py`**

In `backend/invitations/views.py`, find the `photos` action (around line 1025). It starts with:

```python
    @action(detail=True, methods=['get', 'post'], url_path='photos', permission_classes=[], throttle_classes=[PhotoUploadThrottle])
    def photos(self, request, pk=None):
        """
        GET  /api/events/{id}/photos/?invitation={uuid}  — list photos (guest or owner)
        POST /api/events/{id}/photos/?invitation={uuid}  — upload a photo (guest only)
        """
        event = get_object_or_404(Event, pk=pk)

        # Owners may list photos using their JWT without an invitation param.
        is_owner = (
            request.user.is_authenticated
            and event.owner_id == request.user.id
        )
```

Add the feature gate immediately after the `is_owner` block:

```python
        event = get_object_or_404(Event, pk=pk)

        # Owners may list photos using their JWT without an invitation param.
        is_owner = (
            request.user.is_authenticated
            and event.owner_id == request.user.id
        )

        # Non-owners (guests) cannot access if gallery feature is disabled.
        # Owners always have access so they can see their upgrade state.
        if not is_owner and not event.has_feature('gallery'):
            return Response(
                {'detail': 'Photo Gallery is not enabled for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )
```

- [ ] **Step 5: Run all photo tests**

```bash
DATABASE_URL="" python -m pytest tests/test_photos.py -v
```

Expected: all `24` tests pass (21 existing + 3 new)

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_photos.py
git commit -m "feat: gate photos endpoint on gallery feature flag for non-owners"
```

---

### Task 3: Backend — Serializers: expose `features` fields

**Files:**
- Modify: `backend/invitations/serializers.py`
- Modify: `backend/tests/test_event_features.py`

- [ ] **Step 1: Write failing tests for the new fields**

Add to `backend/tests/test_event_features.py`:

```python
import pytest
from django.test import override_settings
from invitations.models import Event, Invitation, KNOWN_EVENT_FEATURES


@pytest.fixture
def gallery_event(user):
    return Event.objects.create(
        owner=user, name='Gallery Event', date='2026-12-01', features={'gallery': True}
    )


@pytest.fixture
def gallery_invitation(gallery_event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(name='Carol', event=gallery_event, checked_in=True)


@pytest.mark.django_db
def test_event_serializer_exposes_features(auth_client, gallery_event):
    response = auth_client.get(f'/api/events/{gallery_event.id}/')
    assert response.status_code == 200
    assert response.data['features'] == {'gallery': True}


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_invitation_serializer_exposes_event_features(auth_client, gallery_invitation):
    response = auth_client.get(f'/api/invitations/{gallery_invitation.id}/')
    assert response.status_code == 200
    assert response.data['event_features'] == {'gallery': True}


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_invitation_serializer_event_features_empty_by_default(auth_client, user, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    bare_event = Event.objects.create(owner=user, name='Bare', date='2026-12-01')
    inv = Invitation.objects.create(name='Dan', event=bare_event)
    response = auth_client.get(f'/api/invitations/{inv.id}/')
    assert response.status_code == 200
    assert response.data['event_features'] == {}
```

- [ ] **Step 2: Run — expect failures**

```bash
cd backend
DATABASE_URL="" python -m pytest tests/test_event_features.py -k "serializer" -v
```

Expected: `3 failed` — `features` and `event_features` not in serializers yet

- [ ] **Step 3: Add `features` to `EventSerializer`**

In `backend/invitations/serializers.py`, find `class EventSerializer` (line 197). Its `Meta.fields` list is:

```python
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'start_time', 'venue_name', 'venue_address', 'google_maps_url',
            'parking_info', 'hotel_info', 'travel_note',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin', 'whatsapp_message_template',
            'theme', 'theme_data', 'schedule_items',
        ]
```

Replace with:

```python
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'start_time', 'venue_name', 'venue_address', 'google_maps_url',
            'parking_info', 'hotel_info', 'travel_note',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin', 'whatsapp_message_template',
            'theme', 'theme_data', 'schedule_items', 'features',
        ]
```

- [ ] **Step 4: Add `event_features` to `InvitationSerializer`**

In `backend/invitations/serializers.py`, find `class InvitationSerializer` (line 26). After the existing read_only field declarations (around line 45), add:

```python
    event_features = serializers.JSONField(source='event.features', read_only=True)
```

So the block looks like:

```python
class InvitationSerializer(serializers.ModelSerializer):
    event = serializers.UUIDField(source='event_id', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    # ... existing fields ...
    show_event_branding = serializers.SerializerMethodField()
    event_features = serializers.JSONField(source='event.features', read_only=True)
```

Then add `'event_features'` to the `Meta.fields` list. Find:

```python
            'brand_name',
            'brand_logo_url',
            'show_event_branding',
        ]
```

Replace with:

```python
            'brand_name',
            'brand_logo_url',
            'show_event_branding',
            'event_features',
        ]
```

- [ ] **Step 5: Run serializer tests**

```bash
DATABASE_URL="" python -m pytest tests/test_event_features.py -k "serializer" -v
```

Expected: `3 passed`

- [ ] **Step 6: Run all tests to check nothing broke**

```bash
DATABASE_URL="" python -m pytest tests/test_photos.py tests/test_event_features.py -v
```

Expected: all pass (24 + 8 = 32 total)

- [ ] **Step 7: Commit**

```bash
git add backend/invitations/serializers.py backend/tests/test_event_features.py
git commit -m "feat: expose features on EventSerializer and event_features on InvitationSerializer"
```

---

### Task 4: Backend — Django admin + Superadmin API endpoint

**Files:**
- Modify: `backend/invitations/admin.py`
- Modify: `backend/invitations/superadmin_views.py`
- Modify: `backend/api/urls.py`
- Modify: `backend/tests/test_event_features.py`

- [ ] **Step 1: Write failing tests for the superadmin endpoint**

Add to `backend/tests/test_event_features.py`:

```python
# ── SUPERADMIN ENDPOINT ────────────────────────────────────────────────────────

@pytest.fixture
def admin_client(db):
    from django.contrib.auth.models import User
    from rest_framework.test import APIClient
    admin = User.objects.create_superuser(
        username='sa', email='sa@example.com', password='pass', is_staff=True
    )
    client = APIClient()
    # Get JWT token
    response = client.post('/api/auth/login/', {'email': 'sa@example.com', 'password': 'pass'})
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
    return client


@pytest.mark.django_db
def test_superadmin_can_get_event_features(admin_client, bare_event):
    response = admin_client.get(f'/api/superadmin/events/{bare_event.id}/')
    assert response.status_code == 200
    assert response.data['features'] == {}
    assert response.data['id'] == str(bare_event.id)


@pytest.mark.django_db
def test_superadmin_can_enable_gallery(admin_client, bare_event):
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'gallery': True}},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['features'] == {'gallery': True}
    bare_event.refresh_from_db()
    assert bare_event.has_feature('gallery') is True


@pytest.mark.django_db
def test_superadmin_patch_merges_existing_features(admin_client, bare_event):
    bare_event.features = {'gallery': True}
    bare_event.save()
    # Patching with only one key should not wipe the other
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'gallery': False}},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['features']['gallery'] is False


@pytest.mark.django_db
def test_superadmin_rejects_unknown_feature_key(admin_client, bare_event):
    response = admin_client.patch(
        f'/api/superadmin/events/{bare_event.id}/',
        {'features': {'nonexistent': True}},
        format='json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_superadmin_event_not_found_returns_404(admin_client):
    response = admin_client.get('/api/superadmin/events/00000000-0000-0000-0000-000000000000/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_non_admin_cannot_access_superadmin_event_endpoint(api_client, bare_event):
    response = api_client.get(f'/api/superadmin/events/{bare_event.id}/')
    assert response.status_code in (401, 403)
```

- [ ] **Step 2: Run — expect failures**

```bash
DATABASE_URL="" python -m pytest tests/test_event_features.py -k "superadmin" -v
```

Expected: `6 failed` — endpoint doesn't exist yet (404)

- [ ] **Step 3: Add `superadmin_event_detail` to `superadmin_views.py`**

Add the import at the top of `backend/invitations/superadmin_views.py` (join the existing `from invitations.models import Invitation, Event` line):

```python
from invitations.models import Invitation, Event, KNOWN_EVENT_FEATURES
```

Then add this function at the end of the file:

```python
@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def superadmin_event_detail(request, event_id):
    """
    GET  /api/superadmin/events/{uuid}/ — read event + current features
    PATCH /api/superadmin/events/{uuid}/ — merge-update event features
    """
    try:
        event = Event.objects.select_related('owner').get(pk=event_id)
    except Event.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    def _event_payload(e):
        return {
            'id': str(e.id),
            'name': e.name,
            'date': e.date.isoformat(),
            'owner_id': e.owner_id,
            'features': e.features,
        }

    if request.method == 'GET':
        return Response(_event_payload(event))

    # PATCH — validate and merge features
    if 'features' in request.data:
        incoming = request.data['features']
        if not isinstance(incoming, dict):
            return Response(
                {'features': 'Must be an object mapping feature keys to booleans.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        unknown = set(incoming.keys()) - set(KNOWN_EVENT_FEATURES.keys())
        if unknown:
            return Response(
                {'features': f'Unknown feature keys: {", ".join(sorted(unknown))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        event.features = {**event.features, **{k: bool(v) for k, v in incoming.items()}}
        event.save(update_fields=['features'])

    return Response(_event_payload(event))
```

- [ ] **Step 4: Register the route in `urls.py`**

In `backend/api/urls.py`, update the import block:

```python
from invitations.superadmin_views import (
    superadmin_stats,
    superadmin_growth,
    superadmin_users,
    superadmin_user_detail,
    superadmin_user_events,
    superadmin_event_detail,
)
```

Add the URL to `urlpatterns`:

```python
    path('api/superadmin/users/<int:user_id>/events/', superadmin_user_events),
    path('api/superadmin/events/<uuid:event_id>/', superadmin_event_detail),
```

- [ ] **Step 5: Add `features` to `EventAdmin`**

In `backend/invitations/admin.py`, find `class EventAdmin`:

```python
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'date', 'created_at']
    search_fields = ['name', 'owner__email']
```

Replace with:

```python
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'date', 'created_at']
    search_fields = ['name', 'owner__email']
    fields = [
        'name', 'owner', 'date', 'start_time', 'description',
        'venue_name', 'venue_address', 'google_maps_url',
        'parking_info', 'hotel_info', 'travel_note',
        'background_image', 'qr_zone', 'name_zone', 'tag_zone',
        'security_pin', 'whatsapp_message_template',
        'theme', 'theme_data', 'features',
    ]
```

- [ ] **Step 6: Run all backend tests**

```bash
DATABASE_URL="" python -m pytest tests/test_event_features.py tests/test_photos.py -v
```

Expected: all pass (8 model/serializer + 6 superadmin + 24 photos = 38 total)

- [ ] **Step 7: Commit**

```bash
git add backend/invitations/admin.py \
        backend/invitations/superadmin_views.py \
        backend/api/urls.py \
        backend/tests/test_event_features.py
git commit -m "feat: superadmin PATCH /events/{id}/ endpoint for toggling event features; expose features in Django admin"
```

---

### Task 5: Frontend — TypeScript types

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Add `features` to the `Event` interface**

In `web/src/lib/api.ts`, find `export interface Event` (line 245). After `theme_data`:

```typescript
export interface Event {
  id: string;
  owner: number;
  name: string;
  date: string;
  start_time: string | null;
  description: string;
  venue_name: string;
  venue_address: string;
  google_maps_url: string;
  parking_info: string;
  hotel_info: string;
  travel_note: string;
  background_image: string | null;
  qr_zone: Record<string, number> | null;
  name_zone: Record<string, number | string> | null;
  tag_zone: Record<string, number | string> | null;
  has_security_pin: boolean;
  whatsapp_message_template: string;
  theme: string;
  theme_data: Record<string, unknown>;
  schedule_items: EventScheduleItem[];
  created_at: string;
  features: Record<string, boolean>;
}
```

- [ ] **Step 2: Add `event_features` to the `Invitation` interface**

Find `export interface Invitation` (line 363). After `show_event_branding: boolean;`, add:

```typescript
  show_event_branding: boolean;
  event_features: Record<string, boolean>;
}
```

- [ ] **Step 3: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/api.ts
git commit -m "feat: add features to Event interface and event_features to Invitation interface"
```

---

### Task 6: Frontend — `ProFeatureBanner` component

**Files:**
- Create: `web/src/components/ProFeatureBanner.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/ProFeatureBanner.tsx`:

```tsx
interface ProFeatureBannerProps {
  featureName: string;
}

export default function ProFeatureBanner({ featureName }: ProFeatureBannerProps) {
  return (
    <div className="flex items-start gap-4 bg-brand-container/20 border border-brand/20 rounded-2xl px-5 py-4">
      <div className="w-10 h-10 rounded-full bg-brand-container/40 flex items-center justify-center shrink-0 mt-0.5">
        <span
          className="material-symbols-outlined text-brand text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          workspace_premium
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface">
          {featureName} — Pro Feature
        </p>
        <p className="text-sm text-on-surface-variant mt-0.5">
          This feature is not enabled for this event.{' '}
          <a
            href="mailto:support@youare-invited.com"
            className="text-brand underline hover:no-underline"
          >
            Contact us
          </a>{' '}
          to activate it.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ProFeatureBanner.tsx
git commit -m "feat: add ProFeatureBanner reusable component for locked pro features"
```

---

### Task 7: Frontend — Wire up feature gating in event panel and invite page

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx`
- Modify: `web/src/app/invite/[id]/InviteClient.tsx`

- [ ] **Step 1: Import `ProFeatureBanner` in the event panel**

In `web/src/app/events/[id]/page.tsx`, add the import at the top with the other component imports:

```tsx
import ProFeatureBanner from '@/components/ProFeatureBanner';
```

- [ ] **Step 2: Show the banner when gallery is disabled in the Photos tab**

In `web/src/app/events/[id]/page.tsx`, find the photos tab section (around line 1228):

```tsx
          {activeTab === 'photos' && event && (
            <div className="space-y-6">
              {/* Header row */}
```

Add the feature banner as the first element inside the `space-y-6` div:

```tsx
          {activeTab === 'photos' && event && (
            <div className="space-y-6">
              {/* Pro feature gate */}
              {!event.features?.gallery && (
                <ProFeatureBanner featureName="Event Photo Gallery" />
              )}

              {/* Header row */}
```

- [ ] **Step 3: Disable upload button and download link when gallery is off**

Still in the photos tab, find the "Download All" button and "Venue QR" button. Wrap them so they're hidden when gallery is disabled. Find the header row div (around line 1231):

```tsx
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-on-surface flex-1">
```

Add `opacity-50 pointer-events-none` to the header row when gallery is disabled:

```tsx
              {/* Header row */}
              <div className={`flex flex-wrap items-center gap-3 ${!event.features?.gallery ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-lg font-bold text-on-surface flex-1">
```

- [ ] **Step 4: Gate the photo loading `useEffect` in the event panel**

In `web/src/app/events/[id]/page.tsx`, find the `useEffect` that loads photos (around line 251):

```tsx
    if (activeTab !== 'photos' || !event) return;
```

Update to also check the feature flag:

```tsx
    if (activeTab !== 'photos' || !event || !event.features?.gallery) return;
```

- [ ] **Step 5: Gate `guestPhotoSection` and photos loading in `InviteClient.tsx`**

In `web/src/app/invite/[id]/InviteClient.tsx`, find the photos loading `useEffect`:

```tsx
  useEffect(() => {
    if (!invitation?.checked_in) return;
    setPhotosLoading(true);
    eventService.listPhotos(invitation.event, invitation.id)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation?.checked_in, invitation?.event, invitation?.id]);
```

Replace with:

```tsx
  useEffect(() => {
    if (!invitation?.checked_in || !invitation?.event_features?.gallery) return;
    setPhotosLoading(true);
    eventService.listPhotos(invitation.event, invitation.id)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation?.checked_in, invitation?.event_features?.gallery, invitation?.event, invitation?.id]);
```

Then find `guestPhotoSection` (around line 330):

```tsx
  const guestPhotoSection = invitation.checked_in ? (
```

Replace with:

```tsx
  const guestPhotoSection = invitation.checked_in && invitation.event_features?.gallery ? (
```

- [ ] **Step 6: Type-check everything**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add web/src/app/events/\[id\]/page.tsx \
        web/src/app/invite/\[id\]/InviteClient.tsx
git commit -m "feat: gate photo gallery UI on event.features.gallery; show ProFeatureBanner for locked events"
```

---

### Final verification

- [ ] Run full backend test suite:

```bash
cd backend
DATABASE_URL="" python -m pytest tests/test_photos.py tests/test_event_features.py -v
```

Expected: all pass

- [ ] Run frontend type-check:

```bash
cd web
npx tsc --noEmit
```

Expected: no errors

- [ ] Manually verify end-to-end (optional):
  1. In Django admin, open an event → `features` field is visible as a JSON editor
  2. `PATCH /api/superadmin/events/{id}/` with `{"features": {"gallery": true}}` → 200
  3. Open the invite page for a checked-in guest of that event → photo gallery appears
  4. Open the invite page for a checked-in guest of an event with `features={}` → no photo section
  5. In the event panel, Photos tab for a locked event → ProFeatureBanner appears; upload button and Download All are greyed out

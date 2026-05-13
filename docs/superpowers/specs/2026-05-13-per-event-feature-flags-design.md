# Per-Event Feature Flags Design

## Goal

Gate pro features (starting with Photo Gallery) at the **event level**, not the account level — so an organizer can have some free events and some paid events. The system must make it trivial to add new pro features in the future.

## Architecture

### Single source of truth: `Event.features` JSONField

```python
# models.py
features = models.JSONField(default=dict, blank=True)
# e.g. {"gallery": True}
```

No new column per feature — adding a future pro feature requires zero migrations.

### Feature registry: `KNOWN_EVENT_FEATURES`

A dict defined in `models.py` that names all known feature keys:

```python
KNOWN_EVENT_FEATURES = {
    'gallery': 'Event Photo Gallery',
    # Future features added here:
    # 'live_stream': 'Live Stream Embed',
    # 'custom_rsvp_questions': 'Custom RSVP Questions',
}
```

### Helper method on `Event`

```python
def has_feature(self, key: str) -> bool:
    return bool(self.features.get(key, False))
```

Usage in any view: `if not event.has_feature('gallery'): return 403`.

---

## Backend Changes

### 1. Migration
- Add `features = JSONField(default=dict, blank=True)` to `Event`
- Default `{}` means all features off for existing and new events

### 2. Photos endpoint gating (`views.py`)
- At the top of the `photos` action, before any auth checks:
  ```python
  if not event.has_feature('gallery'):
      return Response({'detail': 'Photo Gallery is not enabled for this event.'}, status=403)
  ```
- Applies to both `GET` (guest listing) and `POST` (upload)
- The organizer's own GET in the event panel does NOT go through this endpoint — the organizer reads `event.features` from the `EventSerializer` directly

### 3. `EventSerializer`
- Add `features = serializers.JSONField(read_only=True)` to expose the full features dict
- The event management page reads this to decide whether to show the upgrade banner

### 4. `InvitationSerializer`
- Add `event_features = serializers.JSONField(source='event.features', read_only=True)`
- Exposes the features dict to guest invite pages without a second API call
- The invite page reads `invitation.event_features.gallery` to show/hide the photo section

### 5. Superadmin: Django admin (`admin.py`)
- Add `features` to `EventAdmin.fields` or `fieldsets`
- The superadmin can edit the raw JSON dict directly in `/admin/`

### 6. Superadmin: API endpoint
- Add a new endpoint: `PATCH /api/superadmin/events/<uuid>/`
- Accepts `{"features": {"gallery": true}}` — **merges** into the existing dict (does not overwrite other keys)
- Also exposes `GET` for reading current event features
- Registered in `urls.py` alongside existing superadmin routes

---

## Frontend Changes

### 7. TypeScript types (`api.ts`)
```typescript
// On Event interface
features: Record<string, boolean>;

// On Invitation interface
event_features: Record<string, boolean>;
```

### 8. `ProFeatureBanner` component (`components/ProFeatureBanner.tsx`)
A reusable banner dropped into any tab to gate a feature. Props:
```typescript
interface ProFeatureBannerProps {
  featureName: string;   // e.g. "Event Photo Gallery"
}
```
Renders: a branded card with a lock icon, the feature name, and the text:
*"This is a Pro feature. Contact us at support@youare-invited.com to enable it for this event."*

### 9. Event management page (`app/events/[id]/page.tsx`)
- Photos tab: if `!event.features?.gallery`, render `<ProFeatureBanner featureName="Event Photo Gallery" />` at the top of the tab, then show the rest of the tab UI below it (greyed-out gallery grid + disabled upload button) so the organizer can see what they'd get
- No changes needed to other tabs

### 10. Invite page (`app/invite/[id]/InviteClient.tsx`)
- Gate `guestPhotoSection` on:
  ```typescript
  invitation.event_features?.gallery && invitation.checked_in
  ```
- If `event_features.gallery` is false (or missing), the photo section renders `null` — guests see nothing

---

## How to add a future pro feature

1. Add the key to `KNOWN_EVENT_FEATURES` in `models.py`
2. In the relevant view: `if not event.has_feature('new_key'): return 403`
3. In the relevant frontend tab: `{!event.features?.new_key && <ProFeatureBanner featureName="..." />}`
4. On the invite page: `invitation.event_features?.new_key && <NewFeatureSection />`
5. Superadmin enables it via `/admin/` or the `PATCH /api/superadmin/events/<uuid>/` endpoint

No migrations, no serializer changes, no new API endpoints needed.

---

## Data flow

```
Superadmin enables gallery:
  PATCH /api/superadmin/events/{id}/  {"features": {"gallery": true}}
  → event.features = {"gallery": true}

Guest opens invite page:
  GET /api/invitations/{uuid}/  → includes event_features: {"gallery": true}
  → InviteClient shows photo section (if also checked_in)

Guest uploads photo:
  POST /api/events/{id}/photos/?invitation={uuid}
  → views.py: event.has_feature('gallery') → True → proceeds

Organizer opens event panel:
  GET /api/events/{id}/  → includes features: {"gallery": true}
  → Photos tab: no banner shown, full UI rendered
```

---

## Out of scope

- Self-serve payment/upgrade flow (no Stripe — superadmin manages manually)
- Account-level plan affecting feature availability (purely per-event)
- Per-invitation feature access (features are per-event, not per-guest)
- Downgrade logic (superadmin sets `{"gallery": false}` to disable)

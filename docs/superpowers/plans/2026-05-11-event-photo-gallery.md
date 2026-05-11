# Event Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checked-in guests upload and browse event photos via a QR code or post-check-in link; organizers can view, delete, and bulk-download the album.

**Architecture:** A new `EventPhoto` model stores photos in S3/local storage, linked to events and invitations. Five new `@action` methods on the existing `EventViewSet` handle guest upload/listing (authenticated via invitation UUID + `checked_in` flag) and organizer operations (JWT). The frontend adds a guest photos page at `/events/[id]/photos` and a Photos tab to the organizer event page.

**Tech Stack:** Django 5 + DRF `@action`; Next.js 14 App Router + Tailwind + Material Symbols; django-storages / S3; jsQR for in-browser QR scanning; Python `zipfile` for bulk download.

---

## File Map

### Backend — new/modified files

| File | Change |
|------|--------|
| `backend/invitations/models.py` | Add `event_photo_upload_path()` + `EventPhoto` model |
| `backend/invitations/views.py` | Add imports; add 5 `@action` methods to `EventViewSet`; update `get_permissions()` |
| `backend/invitations/migrations/XXXX_add_event_photo.py` | Auto-generated |
| `backend/tests/test_photos.py` | New test file |

### Frontend — new/modified files

| File | Change |
|------|--------|
| `web/src/lib/api.ts` | Add `EventPhoto` type + photo methods to `eventService` |
| `web/src/lib/qr.ts` | New — shared `extractInvitationId()` utility |
| `web/src/components/PhotoGallery.tsx` | New — responsive grid + lightbox |
| `web/src/app/events/[id]/photos/page.tsx` | New — guest upload + gallery page |
| `web/src/app/events/[id]/page.tsx` | Add `'photos'` tab + Photos section |
| `web/src/app/security/event/[id]/checkin/page.tsx` | Add "Upload Photos" link on success screen |

---

## Task 1: EventPhoto Model + Migration

**Files:**
- Modify: `backend/invitations/models.py`
- Create: migration (auto-generated via `makemigrations`)

- [ ] **Step 1: Add `event_photo_upload_path` and `EventPhoto` to models.py**

Open `backend/invitations/models.py`. After the `invitation_einvite_path` function (around line 43) and before the `UserProfile` class, insert:

```python
def event_photo_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
    owner = instance.event.owner
    return f"{_safe_username(owner)}/{slugify(instance.event.name)}/photos/{instance.id}.{ext}"
```

Then at the very end of the file, after the `Invitation` class, add:

```python
class EventPhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name='photos'
    )
    uploaded_by = models.ForeignKey(
        Invitation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_photos',
    )
    image = models.ImageField(upload_to=event_photo_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Photo {self.id} for {self.event.name}"
```

- [ ] **Step 2: Create the migration**

```bash
cd backend
python manage.py makemigrations invitations --name add_event_photo
```

Expected output: `Migrations for 'invitations': invitations/migrations/XXXX_add_event_photo.py`

- [ ] **Step 3: Run the migration**

```bash
python manage.py migrate
```

Expected output: `Applying invitations.XXXX_add_event_photo... OK`

- [ ] **Step 4: Verify in Django shell**

```bash
python manage.py shell -c "from invitations.models import EventPhoto; print('EventPhoto OK:', EventPhoto._meta.fields)"
```

Expected: prints field list including `id`, `event`, `uploaded_by`, `image`, `uploaded_at`.

- [ ] **Step 5: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/
git commit -m "feat: add EventPhoto model for event photo gallery"
```

---

## Task 2: Guest Photo Endpoints — List + Upload

**Files:**
- Modify: `backend/invitations/views.py`
- Create: `backend/tests/test_photos.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_photos.py`:

```python
import io
import pytest
from django.test import override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from invitations.models import Event, Invitation, EventPhoto


def _make_jpeg(size=(10, 10)):
    """Create a minimal valid JPEG file for upload tests."""
    buf = io.BytesIO()
    Image.new('RGB', size, color='red').save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile('photo.jpg', buf.read(), content_type='image/jpeg')


@pytest.fixture
def event(user):
    return Event.objects.create(owner=user, name='Summer Party', date='2026-09-01')


@pytest.fixture
def checked_in_invitation(event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Alice', seat_number='A1', tag='VIP', event=event, checked_in=True
    )


@pytest.fixture
def not_checked_in_invitation(event, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Bob', seat_number='B1', tag='VIP', event=event, checked_in=False
    )


# ── LIST ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_checked_in_guest_can_list_photos(api_client, event, checked_in_invitation):
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_not_checked_in_guest_cannot_list_photos(api_client, event, not_checked_in_invitation):
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(not_checked_in_invitation.id)},
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_missing_invitation_param_returns_403(api_client, event):
    response = api_client.get(f'/api/events/{event.id}/photos/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_wrong_event_invitation_returns_403(api_client, user, event, checked_in_invitation, monkeypatch):
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    other_event = Event.objects.create(owner=user, name='Other Event', date='2026-10-01')
    response = api_client.get(
        f'/api/events/{other_event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 403


# ── UPLOAD ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_checked_in_guest_can_upload_photo(api_client, event, checked_in_invitation):
    image = _make_jpeg()
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    assert response.status_code == 201
    assert 'id' in response.data
    assert 'image_url' in response.data
    assert 'uploaded_at' in response.data
    assert EventPhoto.objects.filter(event=event).count() == 1


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_not_checked_in_guest_cannot_upload(api_client, event, not_checked_in_invitation):
    image = _make_jpeg()
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={not_checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    assert response.status_code == 403
    assert EventPhoto.objects.count() == 0


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_without_image_field_returns_400(api_client, event, checked_in_invitation):
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {},
        format='multipart',
    )
    assert response.status_code == 400


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_oversized_file_returns_400(api_client, event, checked_in_invitation):
    # Create a file larger than 10 MB
    buf = io.BytesIO(b'x' * (10 * 1024 * 1024 + 1))
    big_file = SimpleUploadedFile('big.jpg', buf.read(), content_type='image/jpeg')
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': big_file},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'Image must be' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_upload_non_image_content_type_returns_400(api_client, event, checked_in_invitation):
    bad_file = SimpleUploadedFile('doc.pdf', b'%PDF-1.4', content_type='application/pdf')
    response = api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': bad_file},
        format='multipart',
    )
    assert response.status_code == 400
    assert 'JPEG, PNG' in response.data['detail']


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_uploaded_photo_appears_in_list(api_client, event, checked_in_invitation):
    image = _make_jpeg()
    api_client.post(
        f'/api/events/{event.id}/photos/?invitation={checked_in_invitation.id}',
        {'image': image},
        format='multipart',
    )
    response = api_client.get(
        f'/api/events/{event.id}/photos/',
        {'invitation': str(checked_in_invitation.id)},
    )
    assert response.status_code == 200
    assert len(response.data) == 1
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd backend
pytest tests/test_photos.py -v 2>&1 | head -40
```

Expected: All tests FAIL with `404 Not Found` (the `photos` action doesn't exist yet).

- [ ] **Step 3: Add imports to views.py**

At the top of `backend/invitations/views.py`, add these imports alongside the existing ones:

```python
import zipfile
import qrcode as qrcode_module
from io import BytesIO
from django.utils.text import slugify
from .models import Invitation, Event, EventPhoto  # add EventPhoto to existing import
```

(The existing line `from .models import Invitation, Event` becomes `from .models import Invitation, Event, EventPhoto`.)

- [ ] **Step 4: Update `get_permissions()` in `EventViewSet`**

Find the `get_permissions` method in `EventViewSet` (currently around line 920) and change it to:

```python
def get_permissions(self):
    if self.action in ('public_info', 'verify_security_pin', 'photos'):
        return []
    return [IsAuthenticated()]
```

- [ ] **Step 5: Add the `photos` action to `EventViewSet`**

Add this method inside the `EventViewSet` class, after `set_security_pin`:

```python
@action(detail=True, methods=['get', 'post'], url_path='photos')
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

    if not is_owner:
        # Guest path — require a checked-in invitation UUID.
        invitation_id = request.query_params.get('invitation')
        if not invitation_id:
            return Response(
                {'detail': 'invitation query param is required.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            invitation = Invitation.objects.get(pk=invitation_id, event=event)
        except (Invitation.DoesNotExist, Exception):
            return Response(
                {'detail': 'Invalid invitation.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not invitation.checked_in:
            return Response(
                {'detail': 'You must be checked in to access event photos.'},
                status=status.HTTP_403_FORBIDDEN,
            )
    else:
        invitation = None  # owner, no uploader attribution

    # ── GET — list all photos ──────────────────────────────────────────────
    if request.method == 'GET':
        photos_qs = EventPhoto.objects.filter(event=event)
        data = [
            {
                'id': str(p.id),
                'image_url': p.image.url,
                'uploaded_at': p.uploaded_at.isoformat(),
            }
            for p in photos_qs
        ]
        return Response(data)

    # ── POST — upload a photo ─────────────────────────────────────────────
    if is_owner:
        return Response(
            {'detail': 'Use a guest invitation to upload photos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    image = request.FILES.get('image')
    if not image:
        return Response(
            {'detail': 'image field is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if image.size > 10 * 1024 * 1024:
        return Response(
            {'detail': 'Image must be 10 MB or smaller.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
    if image.content_type not in allowed_types:
        return Response(
            {'detail': 'Only JPEG, PNG, and WEBP images are allowed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    photo = EventPhoto.objects.create(
        event=event,
        uploaded_by=invitation,
        image=image,
    )
    return Response(
        {
            'id': str(photo.id),
            'image_url': photo.image.url,
            'uploaded_at': photo.uploaded_at.isoformat(),
        },
        status=status.HTTP_201_CREATED,
    )
```

- [ ] **Step 6: Run tests — all should pass**

```bash
cd backend
pytest tests/test_photos.py -v 2>&1
```

Expected: All 11 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_photos.py
git commit -m "feat: add guest photo list + upload endpoints"
```

---

## Task 3: Organizer Photo Endpoints — Delete, Download, Venue QR

**Files:**
- Modify: `backend/invitations/views.py`
- Modify: `backend/tests/test_photos.py`

- [ ] **Step 1: Add organizer tests to test_photos.py**

Append to `backend/tests/test_photos.py`:

```python
# ── DELETE ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_can_delete_photo(auth_client, user, event, checked_in_invitation):
    image = _make_jpeg()
    photo = EventPhoto.objects.create(
        event=event, uploaded_by=checked_in_invitation, image=image
    )
    response = auth_client.delete(f'/api/events/{event.id}/photos/{photo.id}/')
    assert response.status_code == 204
    assert EventPhoto.objects.filter(pk=photo.id).count() == 0


@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_non_owner_cannot_delete_photo(api_client, other_user, event, checked_in_invitation):
    from rest_framework.test import APIClient
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    image = _make_jpeg()
    photo = EventPhoto.objects.create(
        event=event, uploaded_by=checked_in_invitation, image=image
    )
    response = other_client.delete(f'/api/events/{event.id}/photos/{photo.id}/')
    assert response.status_code in (403, 404)
    assert EventPhoto.objects.filter(pk=photo.id).count() == 1


# ── DOWNLOAD ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage')
def test_owner_can_download_zip(auth_client, event, checked_in_invitation):
    image = _make_jpeg()
    EventPhoto.objects.create(event=event, uploaded_by=checked_in_invitation, image=image)
    response = auth_client.get(f'/api/events/{event.id}/photos-download/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/zip'
    assert 'attachment' in response['Content-Disposition']


@pytest.mark.django_db
def test_download_empty_album_returns_404(auth_client, event):
    response = auth_client.get(f'/api/events/{event.id}/photos-download/')
    assert response.status_code == 404


# ── VENUE QR ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_owner_can_get_venue_qr(auth_client, event):
    response = auth_client.get(f'/api/events/{event.id}/photo-qr/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'image/png'


@pytest.mark.django_db
def test_unauthenticated_cannot_get_venue_qr(api_client, event):
    response = api_client.get(f'/api/events/{event.id}/photo-qr/')
    assert response.status_code in (401, 403)
```

- [ ] **Step 2: Run new tests to confirm they fail**

```bash
cd backend
pytest tests/test_photos.py::test_owner_can_delete_photo \
       tests/test_photos.py::test_owner_can_download_zip \
       tests/test_photos.py::test_owner_can_get_venue_qr -v
```

Expected: All FAIL with `404 Not Found`.

- [ ] **Step 3: Add delete, download, and QR actions to EventViewSet**

Add these three methods inside `EventViewSet`, after the `photos` action:

```python
@action(
    detail=True,
    methods=['delete'],
    url_path=r'photos/(?P<photo_id>[^/.]+)',
)
def delete_photo(self, request, pk=None, photo_id=None):
    """DELETE /api/events/{id}/photos/{photo_id}/ — owner only."""
    event = self.get_object()  # raises 404 if not owner (queryset is scoped)
    photo = get_object_or_404(EventPhoto, pk=photo_id, event=event)
    photo.image.delete(save=False)
    photo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@action(detail=True, methods=['get'], url_path='photos-download')
def photos_download(self, request, pk=None):
    """GET /api/events/{id}/photos-download/ — stream zip of all photos (owner only)."""
    event = self.get_object()
    photos_qs = EventPhoto.objects.filter(event=event)
    if not photos_qs.exists():
        return Response(
            {'detail': 'No photos to download.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for photo in photos_qs:
            try:
                ext = photo.image.name.rsplit('.', 1)[-1] if '.' in photo.image.name else 'jpg'
                with photo.image.open('rb') as f:
                    zf.writestr(f"{photo.id}.{ext}", f.read())
            except Exception:
                continue  # skip unreadable files rather than aborting the whole zip
    buf.seek(0)

    event_slug = slugify(event.name) or str(event.id)
    response = HttpResponse(buf.read(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{event_slug}-photos.zip"'
    return response

@action(detail=True, methods=['get'], url_path='photo-qr')
def photo_qr(self, request, pk=None):
    """GET /api/events/{id}/photo-qr/ — return venue QR PNG (owner only)."""
    event = self.get_object()
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    upload_url = f"{frontend_url}/events/{event.id}/photos"

    qr = qrcode_module.QRCode(box_size=10, border=4)
    qr.add_data(upload_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')

    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return HttpResponse(buf.read(), content_type='image/png')
```

- [ ] **Step 4: Run all photo tests**

```bash
cd backend
pytest tests/test_photos.py -v
```

Expected: All tests PASS (there should be 18 tests total).

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd backend
pytest --tb=short -q
```

Expected: All pre-existing tests still pass; only the new tests in `test_photos.py` are new.

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_photos.py
git commit -m "feat: add organizer photo delete, zip download, and venue QR endpoints"
```

---

## Task 4: Frontend API Client

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Add `EventPhoto` type**

In `web/src/lib/api.ts`, locate the section where types are exported (around the `Event`, `Invitation` interfaces). Add this type after `Invitation`:

```typescript
export interface EventPhoto {
  id: string;
  image_url: string;
  uploaded_at: string;
}
```

- [ ] **Step 2: Add photo methods to `eventService`**

In `web/src/lib/api.ts`, locate the `eventService` object. Add these methods at the end of the object, before the closing `}`:

```typescript
  listPhotos: async (eventId: string, invitationId: string): Promise<EventPhoto[]> => {
    const res = await api.get<EventPhoto[]>(`/events/${eventId}/photos/`, {
      params: { invitation: invitationId },
    });
    return res.data;
  },

  listPhotosAsOwner: async (eventId: string): Promise<EventPhoto[]> => {
    const res = await api.get<EventPhoto[]>(`/events/${eventId}/photos/`);
    return res.data;
  },

  uploadPhoto: async (eventId: string, invitationId: string, file: File): Promise<EventPhoto> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api.post<EventPhoto>(
      `/events/${eventId}/photos/?invitation=${invitationId}`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  deletePhoto: async (eventId: string, photoId: string): Promise<void> => {
    await api.delete(`/events/${eventId}/photos/${photoId}/`);
  },

  photosDownloadUrl: (eventId: string): string =>
    buildApiUrl(`/events/${eventId}/photos-download/`),

  photoQrUrl: (eventId: string): string =>
    buildApiUrl(`/events/${eventId}/photo-qr/`),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors (or only pre-existing errors unrelated to api.ts).

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/api.ts
git commit -m "feat: add photo methods to eventService in api.ts"
```

---

## Task 5: Shared QR Extraction Utility

**Files:**
- Create: `web/src/lib/qr.ts`

The check-in page already has `extractInvitationId` inline. This new file shares the same logic for the guest photos page.

- [ ] **Step 1: Create `web/src/lib/qr.ts`**

```typescript
/**
 * Extracts an invitation UUID from a raw QR code scan value.
 *
 * Handles three input formats:
 *   1. A bare UUID string
 *   2. A full invitation URL with `?invitation=<uuid>` query param
 *   3. A URL with `/invitation/<uuid>` in the path
 *
 * Returns the UUID string, or null if not found.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractInvitationId(value: string): string | null {
  const trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);

    const invitationId = parsed.searchParams.get('invitation');
    if (invitationId && UUID_PATTERN.test(invitationId)) return invitationId;

    const pathMatch = parsed.pathname.match(/\/invitation\/([0-9a-f-]+)/i);
    if (pathMatch && UUID_PATTERN.test(pathMatch[1])) return pathMatch[1];
  } catch {
    // Not a URL — already handled above
  }

  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/qr.ts
git commit -m "feat: add shared extractInvitationId QR utility"
```

---

## Task 6: PhotoGallery Component

**Files:**
- Create: `web/src/components/PhotoGallery.tsx`

This component renders a responsive photo grid. Clicking a photo opens a full-screen lightbox. Optionally renders a delete button per photo (for the organizer view).

- [ ] **Step 1: Create `web/src/components/PhotoGallery.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { resolveMediaUrl } from '@/lib/api';
import { EventPhoto } from '@/lib/api';

interface PhotoGalleryProps {
  photos: EventPhoto[];
  onDelete?: (photoId: string) => void; // if provided, shows ✕ button per photo
}

export default function PhotoGallery({ photos, onDelete }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span
          className="material-symbols-outlined text-5xl text-on-surface/30 mb-3"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          photo_library
        </span>
        <p className="text-on-surface/50 text-sm">No photos yet. Be the first to upload!</p>
      </div>
    );
  }

  const closeLightbox = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  const next = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null));

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative group aspect-square">
            <button
              onClick={() => setLightboxIndex(index)}
              className="w-full h-full rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(photo.image_url)}
                alt={`Event photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id);
                }}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white
                           flex items-center justify-center opacity-0 group-hover:opacity-100
                           transition-opacity hover:bg-red-600"
                title="Delete photo"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white
                       flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white
                         flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(photos[lightboxIndex].image_url)}
              alt={`Event photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <p className="text-center text-white/50 text-xs mt-2">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white
                         flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/PhotoGallery.tsx
git commit -m "feat: add PhotoGallery component with grid and lightbox"
```

---

## Task 7: Guest Photos Page

**Files:**
- Create: `web/src/app/events/[id]/photos/page.tsx`

This is the page guests land on via the venue QR code or the post-check-in link. It verifies the invitation UUID, then shows Upload and Gallery tabs.

- [ ] **Step 1: Create `web/src/app/events/[id]/photos/page.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import jsQR from 'jsqr';
import { eventService, EventPhoto } from '@/lib/api';
import { extractInvitationId } from '@/lib/qr';
import PhotoGallery from '@/components/PhotoGallery';

type Tab = 'upload' | 'gallery';

export default function EventPhotosPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // Invitation UUID state
  const [invitationId, setInvitationId] = useState<string | null>(
    searchParams.get('invitation'),
  );
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  // Manual paste input
  const [pasteInput, setPasteInput] = useState('');

  // QR scanner
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // Upload state
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Verify invitation and load photos ────────────────────────────────────
  useEffect(() => {
    if (!invitationId) return;

    setVerifying(true);
    setAuthError('');
    eventService
      .listPhotos(eventId, invitationId)
      .then((data) => {
        setPhotos(data);
        setPhotosLoading(false);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) {
          setAuthError(
            err?.response?.data?.detail ??
              'Access denied. Make sure you have checked in.',
          );
          setInvitationId(null);
        } else {
          setAuthError('Could not load photos. Please try again.');
        }
      })
      .finally(() => setVerifying(false));
  }, [invitationId, eventId]);

  // ── Reload photos after upload ────────────────────────────────────────────
  const reloadPhotos = useCallback(() => {
    if (!invitationId) return;
    eventService
      .listPhotos(eventId, invitationId)
      .then(setPhotos)
      .catch(() => {});
  }, [eventId, invitationId]);

  // ── Handle paste URL / link ───────────────────────────────────────────────
  const handlePasteSubmit = () => {
    const extracted = extractInvitationId(pasteInput.trim());
    if (extracted) {
      setInvitationId(extracted);
      setPasteInput('');
    } else {
      setAuthError('Could not find an invitation ID in that link. Paste your full invite URL.');
    }
  };

  // ── QR scanner ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
          scanLoopRef.current = requestAnimationFrame(scan);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          const extracted = extractInvitationId(code.data);
          if (extracted) {
            stopScanner();
            setInvitationId(extracted);
            return;
          }
        }
        scanLoopRef.current = requestAnimationFrame(scan);
      };
      scanLoopRef.current = requestAnimationFrame(scan);
    } catch {
      setScanning(false);
      setAuthError('Camera access denied. Please paste your invite link instead.');
    }
  }, [stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !invitationId) return;

    setUploading(true);
    setUploadError('');

    for (const file of files) {
      try {
        const photo = await eventService.uploadPhoto(eventId, invitationId, file);
        setPhotos((prev) => [photo, ...prev]);
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'Upload failed. Check file size (max 10 MB) and format (JPEG/PNG/WEBP).';
        setUploadError(detail);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!invitationId || authError) {
    return (
      <div className="min-h-screen bg-lp-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-surface-container rounded-3xl p-6 shadow-sm">
          <div className="flex justify-center mb-4">
            <span
              className="material-symbols-outlined text-5xl text-brand"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              photo_camera
            </span>
          </div>
          <h1 className="text-xl font-bold text-on-surface text-center mb-1">Event Photos</h1>
          <p className="text-sm text-on-surface/60 text-center mb-6">
            Scan your personal invite QR code or paste your invite link to continue.
          </p>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          )}

          {/* QR scanner */}
          {scanning ? (
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-square bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={stopScanner}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white
                           flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm
                         flex items-center justify-center gap-2 mb-3 hover:bg-brand/90 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                qr_code_scanner
              </span>
              Scan My Invite QR
            </button>
          )}

          <p className="text-center text-xs text-on-surface/40 mb-3">or</p>

          {/* Paste input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste invite link…"
              className="flex-1 h-10 px-3 rounded-full border border-outline/30 bg-surface
                         text-sm text-on-surface focus:outline-none focus:border-brand"
              onKeyDown={(e) => e.key === 'Enter' && handlePasteSubmit()}
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteInput.trim()}
              className="h-10 px-4 rounded-full bg-surface-container-high text-on-surface
                         text-sm font-medium disabled:opacity-40 hover:bg-surface-container-highest
                         transition-colors"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background pb-12">
      <header className="sticky top-0 z-10 bg-lp-background/95 backdrop-blur border-b border-outline/10 px-4 py-3 flex items-center gap-3">
        <span
          className="material-symbols-outlined text-brand text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          photo_camera
        </span>
        <h1 className="text-base font-bold text-on-surface flex-1">Event Photos</h1>
        <span className="text-xs text-on-surface/50">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-outline/10 px-4">
        {(['upload', 'gallery'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand text-brand'
                : 'border-transparent text-on-surface/50 hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {activeTab === 'upload' ? (
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full max-w-xs h-40 rounded-3xl border-2 border-dashed border-brand/30
                         flex flex-col items-center justify-center gap-3 hover:border-brand/60
                         hover:bg-brand/5 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-4xl text-brand"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    add_photo_alternate
                  </span>
                  <span className="text-sm text-on-surface/70 text-center px-4">
                    Tap to pick photos<br />
                    <span className="text-xs text-on-surface/40">JPEG, PNG, WEBP · max 10 MB each</span>
                  </span>
                </>
              )}
            </button>

            {uploadError && (
              <p className="mt-4 text-sm text-red-600 text-center">{uploadError}</p>
            )}

            {photos.length > 0 && (
              <button
                onClick={() => setActiveTab('gallery')}
                className="mt-6 text-sm text-brand font-medium underline underline-offset-2"
              >
                View gallery ({photos.length})
              </button>
            )}
          </div>
        ) : (
          <PhotoGallery photos={photos} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors.

- [ ] **Step 3: Test the page in the dev server**

```bash
cd web
npm run dev
```

Open `http://localhost:3000/events/[any-event-id]/photos` — you should see the auth gate (QR scan or paste link prompt).

- [ ] **Step 4: Commit**

```bash
git add web/src/app/events/[id]/photos/
git commit -m "feat: add guest photo upload and gallery page"
```

---

## Task 8: Organizer Photos Tab + Section

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx`

- [ ] **Step 1: Add `'photos'` to `EVENT_TABS`**

In `web/src/app/events/[id]/page.tsx`, find the `EVENT_TABS` array (around line 25):

```typescript
const EVENT_TABS = [
  { id: 'guests', label: 'Guests', icon: 'group', description: 'Guest list, imports, and invitation previews.' },
  { id: 'design', label: 'Design', icon: 'brush', description: 'Template uploads, zones, and guest-facing styling.' },
  { id: 'sharing', label: 'Sharing', icon: 'share', description: 'Security access, WhatsApp copy, and event logistics.' },
] as const;
```

Change it to:

```typescript
const EVENT_TABS = [
  { id: 'guests',  label: 'Guests',  icon: 'group',        description: 'Guest list, imports, and invitation previews.' },
  { id: 'design',  label: 'Design',  icon: 'brush',        description: 'Template uploads, zones, and guest-facing styling.' },
  { id: 'sharing', label: 'Sharing', icon: 'share',        description: 'Security access, WhatsApp copy, and event logistics.' },
  { id: 'photos',  label: 'Photos',  icon: 'photo_camera', description: 'Guest photo gallery, venue QR, and album download.' },
] as const;
```

- [ ] **Step 2: Add photo-related state to `EventPage`**

In `EventPage`, find the block of `useState` hooks (around line 53). Add these after the existing state declarations:

```typescript
const [eventPhotos, setEventPhotos] = useState<import('@/lib/api').EventPhoto[]>([]);
const [photosLoading, setPhotosLoading] = useState(false);
const [photosError, setPhotosError] = useState('');
const [showVenueQr, setShowVenueQr] = useState(false);
```

- [ ] **Step 3: Add photo imports to the top of the file**

In `web/src/app/events/[id]/page.tsx`, at the top where other components are imported, add:

```typescript
import PhotoGallery from '@/components/PhotoGallery';
import { eventService } from '@/lib/api';
```

(`eventService` is likely already imported from `@/lib/api`; add `PhotoGallery` if not present.)

- [ ] **Step 4: Load photos when the Photos tab is activated**

Find the `useEffect` that loads the event data. Add a separate `useEffect` that triggers when `activeTab === 'photos'`:

```typescript
useEffect(() => {
  if (activeTab !== 'photos' || !event) return;
  setPhotosLoading(true);
  setPhotosError('');
  eventService
    .listPhotosAsOwner(event.id)
    .then(setEventPhotos)
    .catch(() => setPhotosError('Failed to load photos.'))
    .finally(() => setPhotosLoading(false));
}, [activeTab, event]);
```

- [ ] **Step 5: Add the Photos tab panel**

In the JSX, find the section that renders tab content (the block with `activeTab === 'guests'`, `activeTab === 'design'`, `activeTab === 'sharing'` conditions). Add a new panel for `activeTab === 'photos'`:

```tsx
{activeTab === 'photos' && event && (
  <div className="space-y-6">
    {/* Header row */}
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-lg font-bold text-on-surface flex-1">
        Photo Gallery
        {eventPhotos.length > 0 && (
          <span className="ml-2 text-sm font-normal text-on-surface/50">
            {eventPhotos.length} photo{eventPhotos.length !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      {/* Venue QR button */}
      <button
        onClick={() => setShowVenueQr(true)}
        className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-outline/30
                   text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">qr_code</span>
        Venue QR
      </button>

      {/* Download all */}
      {eventPhotos.length > 0 && (
        <a
          href={eventService.photosDownloadUrl(event.id)}
          download
          className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-brand text-white
                     text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download All
        </a>
      )}
    </div>

    {/* Error */}
    {photosError && (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
        <p className="text-sm text-red-700">{photosError}</p>
      </div>
    )}

    {/* Loading */}
    {photosLoading ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-surface-container animate-pulse" />
        ))}
      </div>
    ) : (
      <PhotoGallery
        photos={eventPhotos}
        onDelete={async (photoId) => {
          if (!confirm('Delete this photo?')) return;
          try {
            await eventService.deletePhoto(event.id, photoId);
            setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
          } catch {
            alert('Could not delete the photo. Please try again.');
          }
        }}
      />
    )}

    {/* Venue QR modal */}
    {showVenueQr && (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={() => setShowVenueQr(false)}
      >
        <div
          className="bg-surface rounded-3xl p-6 max-w-xs w-full shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-on-surface">Venue QR Code</h3>
            <button
              onClick={() => setShowVenueQr(false)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <p className="text-xs text-on-surface/60 mb-4">
            Display this at your venue. Guests scan it with their camera app, then use their
            personal invite QR to verify check-in.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventService.photoQrUrl(event.id)}
            alt="Venue QR code"
            className="w-full rounded-2xl"
          />
          <a
            href={eventService.photoQrUrl(event.id)}
            download={`${event.name}-photo-qr.png`}
            className="mt-3 w-full h-10 rounded-full border border-outline/30 text-sm font-medium
                       text-on-surface flex items-center justify-center gap-1.5 hover:bg-surface-container
                       transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Save QR Image
          </a>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors.

- [ ] **Step 7: Test in dev server**

```bash
cd web
npm run dev
```

Open an event page at `http://localhost:3000/events/[your-event-id]`. You should see a **Photos** tab. Click it — it should load photos (empty if none uploaded) and show a "Venue QR" button.

- [ ] **Step 8: Commit**

```bash
git add web/src/app/events/[id]/page.tsx
git commit -m "feat: add Photos tab to organizer event page with gallery, QR, and download"
```

---

## Task 9: Check-In Success Screen — Upload Photos Link

**Files:**
- Modify: `web/src/app/security/event/[id]/checkin/page.tsx`

- [ ] **Step 1: Find the "Already Checked In" success block**

Open `web/src/app/security/event/[id]/checkin/page.tsx`. Find the JSX block that renders the green "Already Checked In" badge (around line 502):

```tsx
{guest.checked_in ? (
  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
    </div>
    <div>
      <p className="text-sm font-semibold text-green-700">Already Checked In</p>
      {guest.checked_in_at && (
        <p className="text-xs text-green-600 mt-0.5">{new Date(guest.checked_in_at).toLocaleString()}</p>
      )}
    </div>
  </div>
) : (
```

- [ ] **Step 2: Add the Upload Photos link after the green badge**

Change the `guest.checked_in` ternary to include the upload link. Replace the existing block:

```tsx
{guest.checked_in ? (
  <>
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <span
          className="material-symbols-outlined text-green-600 text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-green-700">Already Checked In</p>
        {guest.checked_in_at && (
          <p className="text-xs text-green-600 mt-0.5">
            {new Date(guest.checked_in_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
    <a
      href={`/events/${params.id}/photos?invitation=${guest.id}`}
      className="w-full h-12 rounded-full border-2 border-brand text-brand font-semibold text-sm
                 hover:bg-brand/5 active:bg-brand/10 transition-all flex items-center justify-center gap-2"
    >
      <span
        className="material-symbols-outlined text-[18px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        photo_camera
      </span>
      View &amp; Upload Event Photos
    </a>
  </>
) : (
```

Note: `params.id` is the event ID (`useParams()` returns `{ id: string }` in this file). `guest.id` is the invitation UUID.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit 2>&1 | grep -v '^$'
```

Expected: No errors.

- [ ] **Step 4: Test the flow**

```bash
cd web
npm run dev
```

Go to the check-in page for an event (`/security/event/[id]/checkin`), scan or enter an invitation for a guest who is already checked in. The green "Already Checked In" badge should now have an "View & Upload Event Photos" button below it that links to the photos page with the invitation ID pre-filled.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/security/event/[id]/checkin/page.tsx
git commit -m "feat: add Upload Photos link to check-in success screen"
```

---

## Self-Review Checklist

Before handing off, verify:

- [ ] All 9 tasks committed with no uncommitted changes (`git status`)
- [ ] Backend tests pass: `cd backend && pytest tests/test_photos.py -v`
- [ ] Full backend test suite clean: `cd backend && pytest --tb=short -q`
- [ ] TypeScript clean: `cd web && npx tsc --noEmit`
- [ ] Dev server starts without errors: `cd web && npm run dev`
- [ ] Guest can access photos page via `?invitation=<uuid>` of a checked-in invitation
- [ ] Guest sees 403 error UI for non-checked-in invitation UUID
- [ ] Organizer Photos tab loads in event page
- [ ] Venue QR modal shows a real QR code image
- [ ] Check-in success screen shows "Upload Photos" link

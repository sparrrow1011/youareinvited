# Event Photo Gallery — Design Spec
**Date:** 2026-05-11
**Status:** Approved
**Scope:** Guests who have checked in can upload photos via a QR code or post-check-in link. All checked-in guests can view a shared gallery. Organizers can delete photos and bulk-download the album.

---

## 1. Goals

- Let checked-in guests upload photos they took at the event
- Show a live shared gallery to all checked-in guests
- Give organizers a venue QR code to display at the event
- Let organizers delete individual photos and download the full album as a zip

---

## 2. Access Model

**Guest access:** Invitation UUID is the credential. To upload or view the gallery, the guest provides their invitation UUID (via URL param `?invitation={uuid}`). The backend verifies:
1. The invitation exists
2. It belongs to the requested event
3. `checked_in = True`

If any check fails → 403 Forbidden. No new token type is introduced.

**Organizer access:** Standard JWT auth (existing). Full control: delete any photo, download zip, view venue QR.

---

## 3. Data Model

### New model: `EventPhoto`

```python
class EventPhoto(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event       = models.ForeignKey('Event', on_delete=models.CASCADE, related_name='photos')
    uploaded_by = models.ForeignKey('Invitation', on_delete=models.SET_NULL,
                                    null=True, related_name='uploaded_photos')
    image       = models.ImageField(upload_to=event_photo_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

**Storage path:** `{username}/{event-name}/photos/{photo_id}.jpg`
Follows the existing pattern for QR codes and e-invites.

**`uploaded_by` is `SET_NULL`** so photos survive if the invitation is later deleted (the photo remains in the gallery, just unattributed).

### Venue QR code

No new field on `Event`. The venue QR code is generated lazily when first requested and stored at `{username}/{event-name}/photo-qr.png`. The QR encodes `{FRONTEND_URL}/events/{event_id}/photos` — a deterministic URL derivable from `event.id` at any time.

### Upload constraints (enforced server-side)

- Max file size: **10 MB per photo**
- Accepted formats: **JPEG, PNG, WEBP**
- No per-guest upload limit in v1

---

## 4. API Endpoints

Base: `/api/events/{event_id}/photos/`

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/events/{id}/photos/` | Invitation UUID (`?invitation={uuid}`, checked-in) | List all photos for the event |
| `POST` | `/api/events/{id}/photos/` | Invitation UUID (`?invitation={uuid}`, checked-in) | Upload a photo (multipart/form-data, field: `image`) |
| `DELETE` | `/api/events/{id}/photos/{photo_id}/` | Owner JWT | Delete a single photo |
| `GET` | `/api/events/{id}/photos/download/` | Owner JWT | Stream zip of all photos |
| `GET` | `/api/events/{id}/photo-qr/` | Owner JWT | Return (or lazily generate) the venue QR code image |

### Guest list response shape

```json
[
  {
    "id": "uuid",
    "image_url": "https://cdn.../photos/uuid.jpg",
    "uploaded_at": "2026-05-11T20:00:00Z"
  }
]
```

No uploader name exposed to guests (attribution stored in DB, not shown — privacy).

### Bulk download

Implemented with Python's `zipfile` + Django's `StreamingHttpResponse`. Photos are streamed directly from S3 into the zip without writing a temp file on disk. File names inside the zip: `{photo_id}.jpg`.

---

## 5. File Structure Changes

### Backend

```
backend/invitations/
├── models.py           ← Add EventPhoto model + event_photo_upload_path
├── views.py            ← Add EventPhotoViewSet (list, create, delete, download, photo-qr)
├── urls.py             ← Register new routes
└── migrations/
    └── 0XXX_add_event_photo.py
```

### Frontend (web)

```
web/src/app/
├── events/
│   └── [id]/
│       ├── page.tsx          ← Add Photos section (venue QR + delete + download)
│       └── photos/
│           └── page.tsx      ← Guest upload + gallery page (new)
└── components/
    └── PhotoGallery.tsx      ← Reusable grid + lightbox (new)
```

---

## 6. Guest UX — `/events/[id]/photos`

### Entry paths

**Path 1 — Post check-in:**
The existing check-in success screen (`/security/event/[id]/checkin`) adds a "📸 Upload Event Photos" button linking to `/events/[id]/photos?invitation=[invitation_id]`. The UUID is already present in the check-in URL.

**Path 2 — Venue QR code:**
Links to `/events/[id]/photos` with no params. Guest sees:
> "To access the gallery, scan your personal invite QR code or paste your invitation link."

The photos page activates the device camera (reusing the same `jsQR` / `BarcodeDetector` approach already in the check-in page) to scan the guest's personal QR code. The personal QR encodes `{FRONTEND_URL}/security/event/{event_id}/checkin?invitation={invitation_id}` — the page parses the scanned URL string, extracts the `invitation` query param, and uses that UUID without navigating away. Alternatively the guest can paste their full invite link into a text field. Once the UUID is captured it is stored in `sessionStorage` so they don't need to re-enter it while on the page.

### Page layout

Single page, two tabs: **Upload** and **Gallery**.

**Upload tab**
- Drag-and-drop zone (desktop) + tap-to-pick (mobile, `accept="image/*"`)
- Multi-file selection supported
- Per-file upload progress bar
- Uploaded photos immediately appear in the Gallery tab

**Gallery tab**
- Responsive photo grid, newest first
- Tapping/clicking a photo opens a full-screen lightbox (prev/next navigation)
- Photo count shown: "14 photos"
- No attribution shown to guests

---

## 7. Organizer UX — Event Management Page

A **Photos** section is added to the existing `/events/[id]` page (below the guest list).

- Badge: `{N} photos uploaded`
- **"Show Venue QR"** button — fetches from `/api/events/{id}/photo-qr/` and displays the QR image in a modal. Organizer can screenshot or print it.
- **"Download All (zip)"** button — triggers `/api/events/{id}/photos/download/`
- Thumbnail grid: last 12 photos, each with a ✕ delete button
- Clicking a thumbnail shows it full-size

---

## 8. Out of Scope (v1)

- Photo moderation / approval queue before public visibility
- Per-guest upload limits
- Comments or reactions on photos
- Video uploads
- Photo attribution visible to guests
- Push notifications when new photos are added

---

## 9. What Is Kept Unchanged

| Component | Reason |
|-----------|--------|
| S3 / django-storages setup | Already handles file storage |
| Invitation `checked_in` flag | Used as-is for auth gate |
| Event UUID primary key | Used as-is for all routes |
| Check-in page (`/security/event/[id]/checkin`) | Only add one button to success screen |
| All existing API endpoints | No changes |

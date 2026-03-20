# SaaS Conversion — Plan C: Zone Editor & Template Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organizers upload a custom invite graphic, draw zones onto it for QR code / name / tag placement, and have the backend use those zones when generating personalized e-invite images.

**Architecture:** A React canvas component lets organizers drag labelled boxes onto their uploaded image. Zone coordinates are stored as percentages (0.0–1.0) on the Event model. The backend `generate_e_invite()` method gains a template branch: when an event has a background image and all three zones, it composites the guest data onto the uploaded graphic instead of using the hardcoded dark-theme card.

**Tech Stack:** React (HTML Canvas API), Next.js 14, Pillow (Python image compositing), Cloudinary

**Prerequisite:** Plans A and B must be complete. The Event model must have `background_image`, `qr_zone`, `name_zone`, `tag_zone` fields.

**Spec:** `docs/superpowers/specs/2026-03-20-saas-conversion-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `web/src/components/ZoneEditor.tsx` | Create | Canvas-based zone drawing component |
| `web/src/app/events/[id]/page.tsx` | Modify | Add template upload section + ZoneEditor |
| `backend/invitations/models.py` | Modify | Add template branch to `generate_e_invite()` |
| `backend/invitations/views.py` | Modify | Add `upload_template` action to EventViewSet |
| `backend/invitations/serializers.py` | Modify | Add zone fields to EventSerializer write path |
| `backend/tests/test_models.py` | Modify | Add template generation tests |
| `backend/tests/test_views.py` | Modify | Add template upload endpoint test |

---

### Task 1: Template generation in `generate_e_invite()`

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_models.py`:
```python
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image as PILImage


def make_test_image(width=800, height=1200):
    """Helper: create a small in-memory PNG."""
    img = PILImage.new('RGB', (width, height), color='#ffffff')
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


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


@pytest.mark.django_db
def test_event_has_template_false_when_zone_missing(user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    event.qr_zone = {'x_pct': 0.3, 'y_pct': 0.4, 'w_pct': 0.4, 'h_pct': 0.25}
    # name_zone and tag_zone not set
    event.save()
    assert event.has_template() is False
```

- [ ] **Step 2: Run tests — verify they pass** (logic is already in `has_template()`)

```bash
cd backend && pytest tests/test_models.py::test_generate_e_invite_uses_template_when_all_zones_set tests/test_models.py::test_event_has_template_false_when_zone_missing -v
```
Expected: PASS

- [ ] **Step 3: Add template branch to `generate_e_invite()` in `backend/invitations/models.py`**

Replace the entire `generate_e_invite` method:
```python
def generate_e_invite(self, show_watermark: bool = True):
    """Generate e-invite image. Uses uploaded template if available, else dark-theme card."""
    if self.event_id and self.event.has_template():
        img = self._generate_from_template(show_watermark)
    else:
        img = self._generate_default_card(show_watermark)

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    filename = f'invite_{self.id}.png'
    self.e_invite_image.save(filename, File(buffer), save=False)
    buffer.close()

def _generate_from_template(self, show_watermark: bool) -> 'Image':
    """Composite guest data onto the organizer's uploaded background image."""
    import requests as http_requests
    from PIL import Image as PILImage, ImageDraw as PILDraw, ImageFont as PILFont

    # Load background image from Cloudinary URL
    bg_url = self.event.background_image.url
    resp = http_requests.get(bg_url, timeout=10)
    resp.raise_for_status()
    bg = PILImage.open(BytesIO(resp.content)).convert('RGB')
    width, height = bg.size
    draw = PILDraw.Draw(bg)

    def load_font(size):
        try:
            return PILFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size
            )
        except Exception:
            return PILFont.load_default()

    def zone_to_pixels(zone):
        x = int(zone['x_pct'] * width)
        y = int(zone['y_pct'] * height)
        w = int(zone['w_pct'] * width)
        h = int(zone['h_pct'] * height)
        return x, y, w, h

    # Draw name
    nz = self.event.name_zone
    nx, ny, nw, nh = zone_to_pixels(nz)
    font_size = int(nz.get('font_size', 40))
    color = nz.get('color', '#ffffff')
    font = load_font(font_size)
    bbox = draw.textbbox((0, 0), self.name, font=font)
    text_w = bbox[2] - bbox[0]
    draw.text((nx + (nw - text_w) // 2, ny), self.name, fill=color, font=font)

    # Draw tag
    tz = self.event.tag_zone
    tx, ty, tw, th = zone_to_pixels(tz)
    tag_font_size = int(tz.get('font_size', 28))
    tag_color = tz.get('color', '#a8dadc')
    tag_font = load_font(tag_font_size)
    tag_text = f"Category: {self.tag}"
    tbbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_text_w = tbbox[2] - tbbox[0]
    draw.text((tx + (tw - tag_text_w) // 2, ty), tag_text, fill=tag_color, font=tag_font)

    # Draw QR code — fetch from URL (Cloudinary storage has no .path property)
    if self.qr_code:
        try:
            qz = self.event.qr_zone
            qx, qy, qw, qh = zone_to_pixels(qz)
            qr_resp = http_requests.get(self.qr_code.url, timeout=10)
            qr_resp.raise_for_status()
            qr_img = PILImage.open(BytesIO(qr_resp.content)).convert('RGB')
            qr_img = qr_img.resize((qw, qh))
            bg.paste(qr_img, (qx, qy))
        except Exception as e:
            logger.error("Error placing QR code from template for invitation %s: %s", self.id, e)

    # Watermark
    if show_watermark:
        small_font = load_font(16)
        wm_text = "Made with YouAreInvited.com"
        wm_bbox = draw.textbbox((0, 0), wm_text, font=small_font)
        wm_w = wm_bbox[2] - wm_bbox[0]
        draw.text(
            ((width - wm_w) // 2, height - 30),
            wm_text, fill='#ffffff', font=small_font
        )

    return bg

def _generate_default_card(self, show_watermark: bool) -> 'Image':
    """Generate the original hardcoded dark-theme invitation card."""
    width, height = 800, 1200
    img = Image.new('RGB', (width, height), color='#1a1a2e')
    draw = ImageDraw.Draw(img)

    border_width = 20
    draw.rectangle(
        [border_width, border_width, width - border_width, height - border_width],
        outline='#16213e', width=3
    )
    inner_border = 40
    draw.rectangle(
        [inner_border, inner_border, width - inner_border, height - inner_border],
        outline='#0f3460', width=2
    )

    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except Exception:
        title_font = name_font = detail_font = small_font = ImageFont.load_default()

    title = "YOU'RE INVITED"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    draw.text(((width - (title_bbox[2] - title_bbox[0])) / 2, 100), title, fill='#e94560', font=title_font)

    draw.line([(width / 2 - 150, 180), (width / 2 + 150, 180)], fill='#0f3460', width=2)

    name_bbox = draw.textbbox((0, 0), self.name, font=name_font)
    draw.text(((width - (name_bbox[2] - name_bbox[0])) / 2, 250), self.name, fill='#ffffff', font=name_font)

    seat_text = f"Seat Number: {self.seat_number}"
    seat_bbox = draw.textbbox((0, 0), seat_text, font=detail_font)
    draw.text(((width - (seat_bbox[2] - seat_bbox[0])) / 2, 330), seat_text, fill='#a8dadc', font=detail_font)

    tag_text = f"Category: {self.tag}"
    tag_bbox = draw.textbbox((0, 0), tag_text, font=detail_font)
    draw.text(((width - (tag_bbox[2] - tag_bbox[0])) / 2, 380), tag_text, fill='#a8dadc', font=detail_font)

    draw.line([(width / 2 - 150, 450), (width / 2 + 150, 450)], fill='#0f3460', width=2)

    if self.qr_code:
        try:
            # Fetch from URL — Cloudinary storage has no .path property
            import requests as _req
            qr_resp = _req.get(self.qr_code.url, timeout=10)
            qr_resp.raise_for_status()
            qr_img = Image.open(BytesIO(qr_resp.content))
            qr_img = qr_img.resize((300, 300))
            qr_bg = Image.new('RGB', (320, 320), 'white')
            qr_bg.paste(qr_img, (10, 10))
            img.paste(qr_bg, (240, 520))
        except Exception as e:
            logger.error("Error adding QR code: %s", e)

    scan_text = "Scan to view your invitation"
    scan_bbox = draw.textbbox((0, 0), scan_text, font=small_font)
    draw.text(((width - (scan_bbox[2] - scan_bbox[0])) / 2, 870), scan_text, fill='#ffffff', font=small_font)

    if show_watermark:
        footer_text = "Made with YouAreInvited.com"
    else:
        footer_text = "We look forward to celebrating with you!"
    footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
    draw.text(((width - (footer_bbox[2] - footer_bbox[0])) / 2, 1050), footer_text, fill='#a8dadc', font=small_font)

    return img
```

Also add `import requests` at the top of `models.py`.

- [ ] **Step 4: Add `requests` to requirements.txt if not present**

Check `backend/requirements.txt` — if `requests` is not listed, add:
```
requests==2.31.0
```

Install: `cd backend && pip install requests==2.31.0`

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py backend/requirements.txt backend/tests/test_models.py
git commit -m "feat: add template-based e-invite generation with percentage zone coordinates"
```

---

### Task 2: Template upload API endpoint

> **Design note:** The spec declares a dedicated `POST /api/events/[id]/template/` endpoint, but this plan uses the standard `PATCH /api/events/{id}/` with multipart form data instead. This achieves the same result with less code (no extra action needed). If a dedicated endpoint is needed later (e.g. for separate permission scoping), extract it as an `@action` on `EventViewSet`.

**Files:**
- Modify: `backend/invitations/views.py`
- Modify: `backend/tests/test_views.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_views.py`:
```python
import io
from PIL import Image as PILImage


def make_upload_file():
    img = PILImage.new('RGB', (800, 1200), color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile('template.png', buf.read(), content_type='image/png')


@pytest.mark.django_db
def test_upload_template_saves_zones(auth_client, user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    payload = {
        'background_image': make_upload_file(),
        'qr_zone': '{"x_pct": 0.3, "y_pct": 0.4, "w_pct": 0.4, "h_pct": 0.25}',
        'name_zone': '{"x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.8, "h_pct": 0.1, "font_size": 40, "color": "#fff"}',
        'tag_zone': '{"x_pct": 0.1, "y_pct": 0.32, "w_pct": 0.8, "h_pct": 0.08, "font_size": 28, "color": "#a8dadc"}',
    }
    response = auth_client.patch(
        f'/api/events/{event.id}/',
        payload,
        format='multipart'
    )
    assert response.status_code == 200
    event.refresh_from_db()
    assert event.qr_zone is not None
    assert event.background_image
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && pytest tests/test_views.py::test_upload_template_saves_zones -v
```
Expected: FAIL (zone JSON strings not parsed, or multipart not handled)

- [ ] **Step 3: Update EventSerializer to handle JSON string zones**

In `backend/invitations/serializers.py`, update `EventSerializer`:
```python
import json


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def _parse_zone(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return None
        return value

    def validate_qr_zone(self, value):
        return self._parse_zone(value)

    def validate_name_zone(self, value):
        return self._parse_zone(value)

    def validate_tag_zone(self, value):
        return self._parse_zone(value)
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && pytest tests/test_views.py::test_upload_template_saves_zones -v
```
Expected: PASS

- [ ] **Step 5: Run all tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/invitations/serializers.py backend/tests/test_views.py
git commit -m "feat: add template upload support to EventViewSet with JSON zone parsing"
```

---

### Task 3: ZoneEditor React component

**Files:**
- Create: `web/src/components/ZoneEditor.tsx`

- [ ] **Step 1: Create `web/src/components/ZoneEditor.tsx`**

```tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export interface Zone {
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  font_size?: number;
  color?: string;
}

export interface Zones {
  qr_zone: Zone | null;
  name_zone: Zone | null;
  tag_zone: Zone | null;
}

type ZoneKey = keyof Zones;

const ZONE_COLORS: Record<ZoneKey, string> = {
  qr_zone: '#e94560',
  name_zone: '#a8dadc',
  tag_zone: '#f0c040',
};

const ZONE_LABELS: Record<ZoneKey, string> = {
  qr_zone: 'QR Code',
  name_zone: 'Guest Name',
  tag_zone: 'Tag / Category',
};

interface Props {
  imageUrl: string;
  initialZones?: Partial<Zones>;
  onSave: (zones: Zones) => void;
}

export default function ZoneEditor({ imageUrl, initialZones = {}, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zones, setZones] = useState<Zones>({
    qr_zone: initialZones.qr_zone ?? null,
    name_zone: initialZones.name_zone ?? null,
    tag_zone: initialZones.tag_zone ?? null,
  });
  const [activeZone, setActiveZone] = useState<ZoneKey>('name_zone');
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Load image — set canvas dimensions to match actual image aspect ratio
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      // Keep width fixed at 800; scale height to preserve aspect ratio
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      setCanvasSize({ width: 800, height: Math.round(800 * aspectRatio) });
      setImage(img);
    };
  }, [imageUrl]);

  // Draw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    // Draw each zone
    (Object.keys(zones) as ZoneKey[]).forEach((key) => {
      const zone = zones[key];
      if (!zone) return;
      const x = zone.x_pct * width;
      const y = zone.y_pct * height;
      const w = zone.w_pct * width;
      const h = zone.h_pct * height;
      ctx.strokeStyle = ZONE_COLORS[key];
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = ZONE_COLORS[key] + '33'; // 20% opacity
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = ZONE_COLORS[key];
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(ZONE_LABELS[key], x + 4, y + 14);
    });
  }, [image, zones]);

  useEffect(() => { redraw(); }, [redraw]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setStartPos(pos);
    setDrawing(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.abs(pos.x - startPos.x);
    const h = Math.abs(pos.y - startPos.y);

    setZones((prev) => ({
      ...prev,
      [activeZone]: {
        x_pct: x / canvas.width,
        y_pct: y / canvas.height,
        w_pct: w / canvas.width,
        h_pct: h / canvas.height,
        font_size: activeZone === 'name_zone' ? 40 : activeZone === 'tag_zone' ? 28 : undefined,
        color: activeZone === 'name_zone' ? '#ffffff' : activeZone === 'tag_zone' ? '#a8dadc' : undefined,
      } as Zone,
    }));
  };

  const onMouseUp = () => setDrawing(false);

  const allZonesSet = zones.qr_zone && zones.name_zone && zones.tag_zone;

  return (
    <div className="space-y-4">
      {/* Zone selector */}
      <div className="flex gap-2">
        {(Object.keys(ZONE_LABELS) as ZoneKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveZone(key)}
            className={`px-3 py-1 rounded text-sm font-medium border-2 transition-colors ${
              activeZone === key
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
            style={{ borderColor: activeZone === key ? ZONE_COLORS[key] : undefined }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: ZONE_COLORS[key] }}
            />
            {ZONE_LABELS[key]}
            {zones[key] && ' ✓'}
          </button>
        ))}
      </div>

      <p className="text-sm text-[#a8dadc]">
        Drawing: <strong>{ZONE_LABELS[activeZone]}</strong> — click and drag on the image to set zone
      </p>

      {/* Canvas — dimensions match actual image aspect ratio to prevent zone distortion */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full rounded border border-[#0f3460] cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      {/* Save button */}
      <button
        disabled={!allZonesSet}
        onClick={() => onSave(zones as Zones)}
        className="px-6 py-2 bg-[#e94560] text-white rounded font-semibold disabled:opacity-40 hover:bg-opacity-90"
      >
        {allZonesSet ? 'Save Template Zones' : 'Draw all 3 zones to save'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors in ZoneEditor.tsx

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ZoneEditor.tsx
git commit -m "feat: add ZoneEditor canvas component for marking QR/name/tag zones"
```

---

### Task 4: Integrate ZoneEditor into the event management page

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx`

- [ ] **Step 1: Add template section to the event page**

In `web/src/app/events/[id]/page.tsx`, add the following imports at the top:
```tsx
import ZoneEditor, { Zones } from '@/components/ZoneEditor';
```

Add state for template UI:
```tsx
const [showZoneEditor, setShowZoneEditor] = useState(false);
const [templateFile, setTemplateFile] = useState<File | null>(null);
const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
const [savingTemplate, setSavingTemplate] = useState(false);
const [templateSuccess, setTemplateSuccess] = useState('');
```

Add file upload handler:
```tsx
const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setTemplateFile(file);
  setTemplatePreviewUrl(URL.createObjectURL(file));
  setShowZoneEditor(true);
};
```

Add zone save handler:
```tsx
const handleZoneSave = async (zones: Zones) => {
  if (!templateFile) return;
  setSavingTemplate(true);
  setTemplateSuccess('');
  try {
    const formData = new FormData();
    formData.append('background_image', templateFile);
    formData.append('qr_zone', JSON.stringify(zones.qr_zone));
    formData.append('name_zone', JSON.stringify(zones.name_zone));
    formData.append('tag_zone', JSON.stringify(zones.tag_zone));

    await api.patch(`/events/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setTemplateSuccess('Template saved! New e-invites will use your design.');
    setShowZoneEditor(false);
    await loadData();
  } catch {
    setError('Failed to save template.');
  } finally {
    setSavingTemplate(false);
  }
};
```

Add template section JSX below the stats grid and above the invitations table:
```tsx
{/* Template section */}
<div className="bg-[#16213e] rounded-lg p-6 mb-6">
  <h2 className="text-lg font-semibold mb-3">Invite Template</h2>
  {event?.background_image ? (
    <div className="flex items-center gap-4">
      <img
        src={event.background_image}
        alt="Template preview"
        className="w-24 h-32 object-cover rounded border border-[#0f3460]"
      />
      <div>
        <p className="text-[#a8dadc] text-sm mb-2">Custom template active</p>
        <label className="cursor-pointer px-3 py-1 bg-[#0f3460] rounded text-sm hover:bg-opacity-80">
          Replace Template
          <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
        </label>
      </div>
    </div>
  ) : (
    <div>
      <p className="text-[#a8dadc] text-sm mb-3">
        Upload your own invite design. We'll help you mark where the guest name, tag, and QR code go.
      </p>
      <label className="cursor-pointer px-4 py-2 bg-[#0f3460] rounded text-sm hover:bg-opacity-80">
        Upload Invite Graphic
        <input type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
      </label>
    </div>
  )}
  {templateSuccess && <p className="text-green-400 text-sm mt-3">{templateSuccess}</p>}
</div>

{/* Zone editor modal */}
{showZoneEditor && templatePreviewUrl && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-50 overflow-y-auto p-8">
    <div className="bg-[#16213e] p-6 rounded-lg w-full max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mark Template Zones</h2>
        <button onClick={() => setShowZoneEditor(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <ZoneEditor
        imageUrl={templatePreviewUrl}
        initialZones={{
          qr_zone: event?.qr_zone as any,
          name_zone: event?.name_zone as any,
          tag_zone: event?.tag_zone as any,
        }}
        onSave={handleZoneSave}
      />
      {savingTemplate && <p className="text-[#a8dadc] text-sm mt-3">Saving…</p>}
    </div>
  </div>
)}
```

- [ ] **Step 2: Manual end-to-end test**

1. Open an event page
2. Click "Upload Invite Graphic" — pick any image
3. Zone editor opens — draw all three zones
4. Click "Save Template Zones"
5. Confirm template thumbnail appears on event page
6. Add a new invitation — confirm it uses the template for e-invite generation (check the generated image)

- [ ] **Step 3: Run TypeScript check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/src/app/events/[id]/page.tsx
git commit -m "feat: integrate ZoneEditor into event page with template upload flow"
```

---

### Task 5: Final integration smoke test

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 2: Run frontend build**

```bash
cd web && npm run build
```
Expected: build succeeds with no errors

- [ ] **Step 3: Full manual flow test**

1. Register a new account at `/signup`
2. Create an event
3. Upload a custom invite graphic and mark all three zones
4. Add 3 guests to the event
5. Open a guest's invitation at `/invitation/[id]`
6. Confirm the e-invite image uses the uploaded template with correct name, tag, and QR placement
7. Check free account — confirm "Made with YouAreInvited.com" watermark visible on e-invite
8. In Django admin, set `watermark_override = True` for the account
9. Regenerate images for one invitation
10. Confirm watermark is gone

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete SaaS zone editor + template engine integration"
```

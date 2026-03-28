# Invitation Card Themes (Pro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let pro users pick a pre-built styled invitation card theme that renders as the guest's invite page at `/invitation/[id]`.

**Architecture:** Add `theme` + `theme_data` fields to the Django `Event` model. A TypeScript theme registry maps theme IDs to React components and their extra field declarations. A `ThemePicker` card in the event editor (pro-only) lets the host select a theme and fill in theme-specific data. The existing `/invitation/[id]` page renders the selected theme component when `event_theme` is set, replacing the PIL image hero.

**Tech Stack:** Django 5 (models, serializers), Next.js 14 App Router, React, TypeScript, Tailwind CSS

---

## File map

| File | Status | Purpose |
|------|--------|---------|
| `backend/invitations/models.py` | Modify | Add `theme`, `theme_data` to `Event` |
| `backend/invitations/migrations/0014_event_theme_fields.py` | Create | Migration for new fields |
| `backend/invitations/serializers.py` | Modify | Expose `theme`/`theme_data` on EventSerializer; expose `event_theme`/`event_theme_data`/`event_date` on InvitationSerializer |
| `backend/tests/test_views.py` | Modify | Tests for new serializer fields |
| `web/src/themes/types.ts` | Create | `ThemeProps`, `ThemeField`, `ThemeMeta` interfaces |
| `web/src/themes/birthday/index.tsx` | Create | Birthday theme (adapted from `web/template/birthday-template.tsx`) |
| `web/src/themes/index.ts` | Create | `THEMES` registry array |
| `web/src/components/ThemeRenderer.tsx` | Create | Renders any theme by ID with props |
| `web/src/components/ThemePicker.tsx` | Create | Pro-only theme selection UI + extra fields form |
| `web/src/lib/api.ts` | Modify | Add `theme`/`theme_data` to `Event`; add `event_theme`/`event_theme_data`/`event_date` to `Invitation`; add `theme`/`theme_data` to `EventCreate` |
| `web/src/app/events/[id]/page.tsx` | Modify | Import and render `ThemePicker` in the right column |
| `web/src/app/invitation/[id]/InvitationClient.tsx` | Modify | Render `ThemeRenderer` when `invitation.event_theme` is set |

---

## Task 1: Add theme fields to Event model

**Files:**
- Modify: `backend/invitations/models.py:74-103`
- Create: `backend/invitations/migrations/0014_event_theme_fields.py`

- [ ] **Step 1: Add fields to Event model**

Open `backend/invitations/models.py`. Find the `Event` class (line 74). After `whatsapp_message_template`, add:

```python
class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=200)
    date = models.DateField()
    description = models.CharField(max_length=500, blank=True, default='')
    background_image = models.ImageField(
        upload_to=event_template_path, blank=True, null=True
    )
    qr_zone = models.JSONField(null=True, blank=True)
    name_zone = models.JSONField(null=True, blank=True)
    tag_zone = models.JSONField(null=True, blank=True)
    security_pin = models.CharField(max_length=128, null=True, blank=True)
    whatsapp_message_template = models.CharField(max_length=500, blank=True, default='')
    theme = models.CharField(max_length=64, blank=True, default='')
    theme_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

- [ ] **Step 2: Generate migration**

```bash
cd backend && python manage.py makemigrations invitations --name event_theme_fields
```

Expected: creates `backend/invitations/migrations/0014_event_theme_fields.py`

- [ ] **Step 3: Apply migration**

```bash
python manage.py migrate
```

Expected: `Applying invitations.0014_event_theme_fields... OK`

- [ ] **Step 4: Commit**

```bash
cd backend
git add invitations/models.py invitations/migrations/0014_event_theme_fields.py
git commit -m "feat: add theme and theme_data fields to Event model"
```

---

## Task 2: Update EventSerializer to expose theme fields

**Files:**
- Modify: `backend/invitations/serializers.py:123-153`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_views.py`:

```python
@pytest.mark.django_db
def test_event_serializer_exposes_theme_fields(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'Birthday Bash',
        'date': '2026-12-01',
        'theme': 'birthday',
        'theme_data': {'ageNumber': '30', 'ageWord': 'thirty'},
    }, format='json')
    assert response.status_code == 201
    assert response.data['theme'] == 'birthday'
    assert response.data['theme_data'] == {'ageNumber': '30', 'ageWord': 'thirty'}


@pytest.mark.django_db
def test_event_theme_defaults_to_empty(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'Simple Event',
        'date': '2026-12-01',
    }, format='json')
    assert response.status_code == 201
    assert response.data['theme'] == ''
    assert response.data['theme_data'] == {}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_views.py::test_event_serializer_exposes_theme_fields tests/test_views.py::test_event_theme_defaults_to_empty -v
```

Expected: FAIL — `theme` not in response.data (KeyError or AssertionError)

- [ ] **Step 3: Update EventSerializer**

In `backend/invitations/serializers.py`, update the `EventSerializer.Meta` class:

```python
class EventSerializer(serializers.ModelSerializer):
    has_security_pin = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin', 'whatsapp_message_template',
            'theme', 'theme_data',
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def get_has_security_pin(self, obj):
        return obj.security_pin is not None

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_views.py::test_event_serializer_exposes_theme_fields tests/test_views.py::test_event_theme_defaults_to_empty -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add invitations/serializers.py tests/test_views.py
git commit -m "feat: expose theme and theme_data in EventSerializer"
```

---

## Task 3: Update InvitationSerializer to expose event theme fields

**Files:**
- Modify: `backend/invitations/serializers.py:26-103`

The invitation API (used by `InvitationClient.tsx`) needs three new read-only fields sourced from the related event: `event_theme`, `event_theme_data`, `event_date`.

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_views.py`:

```python
@pytest.mark.django_db
def test_invitation_exposes_event_theme_fields(api_client, user, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)

    event = Event.objects.create(
        owner=user, name='Birthday', date='2026-12-01',
        theme='birthday', theme_data={'ageNumber': '30'}
    )
    inv = Invitation.objects.create(name='Alice', seat_number='A1', tag='VIP', event=event)

    response = api_client.get(f'/api/invitations/{inv.id}/')
    assert response.status_code == 200
    assert response.data['event_theme'] == 'birthday'
    assert response.data['event_theme_data'] == {'ageNumber': '30'}
    assert response.data['event_date'] == '2026-12-01'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_views.py::test_invitation_exposes_event_theme_fields -v
```

Expected: FAIL — `event_theme` not in response.data

- [ ] **Step 3: Update InvitationSerializer**

In `backend/invitations/serializers.py`, update `InvitationSerializer`:

```python
class InvitationSerializer(serializers.ModelSerializer):
    event = serializers.UUIDField(source='event_id', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date = serializers.DateField(source='event.date', read_only=True)
    event_theme = serializers.CharField(source='event.theme', read_only=True)
    event_theme_data = serializers.JSONField(source='event.theme_data', read_only=True)
    invitation_url = serializers.SerializerMethodField()
    whatsapp_share_url = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    brand_logo_url = serializers.SerializerMethodField()
    show_event_branding = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            'id',
            'event',
            'event_name',
            'event_date',
            'event_theme',
            'event_theme_data',
            'name',
            'seat_number',
            'tag',
            'qr_code',
            'e_invite_image',
            'checked_in',
            'checked_in_at',
            'created_at',
            'updated_at',
            'invitation_url',
            'whatsapp_share_url',
            'brand_name',
            'brand_logo_url',
            'show_event_branding',
        ]
        read_only_fields = [
            'id', 'event', 'qr_code', 'e_invite_image',
            'checked_in_at', 'created_at', 'updated_at',
        ]

    def get_invitation_url(self, obj):
        return obj.get_invitation_url()

    def get_whatsapp_share_url(self, obj):
        import urllib.parse
        invitation_url = obj.get_invitation_url()
        template = obj.event.whatsapp_message_template if obj.event_id else ''
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        brand_payload = _public_brand_payload(profile)
        if template:
            message = (
                template
                .replace('{{brand_name}}', brand_payload['brand_name'])
                .replace('{{name}}', obj.name)
                .replace('{{seat_number}}', obj.seat_number)
                .replace('{{tag}}', obj.tag)
                .replace('{{link}}', invitation_url)
            )
        else:
            greeting = (
                f"{brand_payload['brand_name']} invited you! 🎉"
                if brand_payload['show_event_branding'] and brand_payload['brand_name']
                else "You're invited! 🎉"
            )
            message = (
                f"{greeting}\n\n"
                f"Name: {obj.name}\nSeat: {obj.seat_number}\n\n"
                f"View your invitation: {invitation_url}"
            )
        return f"https://wa.me/?text={urllib.parse.quote(message)}"

    def get_brand_name(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['brand_name']

    def get_brand_logo_url(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['brand_logo_url']

    def get_show_event_branding(self, obj):
        profile = getattr(obj.event.owner, 'profile', None) if obj.event_id else None
        return _public_brand_payload(profile)['show_event_branding']
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_views.py::test_invitation_exposes_event_theme_fields -v
```

Expected: PASS

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd backend && python -m pytest -v
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add invitations/serializers.py tests/test_views.py
git commit -m "feat: expose event_theme, event_theme_data, event_date in InvitationSerializer"
```

---

## Task 4: Create frontend theme type definitions

**Files:**
- Create: `web/src/themes/types.ts`

- [ ] **Step 1: Create `web/src/themes/types.ts`**

```typescript
import type { ReactNode } from 'react';

/** One input field a theme needs beyond the base event fields */
export interface ThemeField {
  key: string;
  label: string;
  placeholder?: string;
}

/** Standard props every theme receives */
export interface ThemeProps {
  eventName: string;
  inviteeName?: string;
  /** ISO date string "YYYY-MM-DD" — theme parses it */
  eventDate: string;
  location?: string;
  time?: string;
  qrContent?: ReactNode;
  /** Theme-specific extras from event.theme_data */
  [key: string]: unknown;
}

/** Registry entry for one theme */
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  /** Accent color shown in ThemePicker card (hex) */
  accentColor: string;
  component: React.ComponentType<ThemeProps>;
  /** Extra fields the host must fill in — saved to event.theme_data */
  extraFields: ThemeField[];
}
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/themes/types.ts
git commit -m "feat: add theme type definitions"
```

---

## Task 5: Create birthday theme component

**Files:**
- Create: `web/src/themes/birthday/index.tsx`

This adapts the existing `web/template/birthday-template.tsx` to accept `ThemeProps`. The original template is preserved unchanged — this is a new file.

- [ ] **Step 1: Create `web/src/themes/birthday/index.tsx`**

```typescript
import type { CSSProperties, ReactNode } from 'react';
import type { ThemeProps } from '../types';

function parseEventDate(isoDate: string) {
  // Parse as local date by appending midnight UTC offset guard
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return {
    dayNumber: String(d.getDate()),
    dayLabel: d.toLocaleDateString('en-US', { weekday: 'long' }),
    monthLabel: d.toLocaleDateString('en-US', { month: 'long' }),
    yearLabel: String(d.getFullYear()),
  };
}

const fonts = {
  display: "'Epilogue', 'Helvetica Neue', Arial, sans-serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
  headline: "'Aboreto', 'Cormorant Garamond', serif",
  body: "'Work Sans', 'Helvetica Neue', Arial, sans-serif",
};

const styles: Record<string, CSSProperties> = {
  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    position: 'relative',
    width: '100%',
    maxWidth: 390,
    minHeight: 1418,
    background: '#F3F1F0',
    color: '#000000',
    overflow: 'hidden',
    margin: '0 auto',
  },
  canvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 64,
  },
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    height: 315,
    padding: '216px 0 64px',
    isolation: 'isolate',
  },
  giantAgeWrap: {
    position: 'absolute',
    inset: '0 2.92% auto',
    height: 202,
    filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.02))',
    zIndex: 0,
  },
  giantAge: {
    position: 'absolute',
    left: -44,
    top: 19,
    width: 457,
    height: 239,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.display,
    fontWeight: 900,
    fontSize: 350,
    lineHeight: '202px',
    color: '#FFFFFF',
    letterSpacing: '-18px',
  },
  ageWord: {
    position: 'absolute',
    left: 184,
    top: 145,
    width: 148,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    fontFamily: fonts.script,
    fontSize: 72,
    lineHeight: '72px',
    color: '#000000',
    transform: 'rotate(-6deg)',
    zIndex: 1,
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 32px',
    gap: 73,
  },
  nameCluster: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: 269,
  },
  celebrant: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: fonts.headline,
    fontSize: 30,
    lineHeight: '36px',
    letterSpacing: '-0.75px',
    textTransform: 'uppercase',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '0 32px',
  },
  dateBlockWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 255,
    paddingTop: 48,
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: 255,
    padding: '16px 0',
  },
  dayNumber: {
    width: 124,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.display,
    fontSize: 128,
    lineHeight: '40px',
    letterSpacing: '-15px',
  },
  dividerWrap: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 9,
    height: 64,
  },
  divider: {
    width: 1,
    height: 64,
    background: '#C6C6C6',
  },
  dateMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    width: 121,
  },
  metaSmall: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '2.4px',
    color: '#474747',
    textTransform: 'uppercase',
  },
  metaStrong: {
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: '20px',
    letterSpacing: '2.4px',
    color: '#474747',
    textTransform: 'uppercase',
  },
  visualDividerWrap: {
    paddingTop: 48,
  },
  visualDivider: {
    width: 96,
    height: 1,
    background: 'rgba(198, 198, 198, 0.3)',
  },
  inviteeCluster: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: 269,
    marginTop: 48,
  },
  celebrateText: {
    fontFamily: fonts.script,
    fontSize: 20,
    lineHeight: '36px',
    textTransform: 'lowercase',
    color: '#5D5F5F',
  },
  invitee: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: fonts.headline,
    fontSize: 20,
    lineHeight: '36px',
    letterSpacing: '-0.75px',
    textTransform: 'uppercase',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 326,
    paddingTop: 54,
  },
  locationBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  location: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '3.2px',
    textTransform: 'uppercase',
    color: '#1B1C1A',
    textAlign: 'center',
  },
  time: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '3.2px',
    textTransform: 'uppercase',
    color: 'rgba(71, 71, 71, 0.7)',
    textAlign: 'center',
  },
  qrFrameWrap: {
    width: '100%',
    paddingTop: 24,
  },
  qrFrame: {
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    padding: '12px 24px',
    background: '#F5F3F0',
    border: '1px solid rgba(198, 198, 198, 0.2)',
    borderRadius: 12,
  },
  qrLabel: {
    fontFamily: fonts.headline,
    fontSize: 10,
    lineHeight: '15px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#000000',
  },
  qrFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 177,
    minHeight: 30,
  },
};

export default function BirthdayTheme({
  eventName,
  inviteeName,
  eventDate,
  location,
  time,
  qrContent,
  ageNumber,
  ageWord,
}: ThemeProps) {
  const { dayNumber, dayLabel, monthLabel, yearLabel } = parseEventDate(eventDate || '2026-01-01');

  return (
    <div style={styles.body}>
      <div style={styles.canvas}>
        <section style={styles.hero}>
          {ageNumber && (
            <div style={styles.giantAgeWrap}>
              <div style={styles.giantAge}>{String(ageNumber)}</div>
              {ageWord && <div style={styles.ageWord}>{String(ageWord)}</div>}
            </div>
          )}
        </section>

        <section style={styles.nameSection}>
          <div style={styles.nameCluster}>
            <div style={styles.celebrant}>{eventName || 'Celebrant'}</div>
          </div>
        </section>

        <section style={styles.infoSection}>
          <div style={styles.dateBlockWrap}>
            <div style={styles.dateBlock}>
              <div style={styles.dayNumber}>{dayNumber}</div>
              <div style={styles.dividerWrap}>
                <div style={styles.divider} />
              </div>
              <div style={styles.dateMeta}>
                <div style={styles.metaSmall}>{dayLabel}</div>
                <div style={styles.metaStrong}>{monthLabel}</div>
                <div style={styles.metaSmall}>{yearLabel}</div>
              </div>
            </div>
          </div>

          <div style={styles.visualDividerWrap}>
            <div style={styles.visualDivider} />
          </div>

          <div style={styles.inviteeCluster}>
            <div style={styles.celebrateText}>celebrate with us</div>
            {inviteeName && <div style={styles.invitee}>{inviteeName}</div>}
          </div>

          <div style={styles.footer}>
            <div style={styles.locationBlock}>
              {location && <div style={styles.location}>{location}</div>}
              {time && <div style={styles.time}>{time}</div>}
            </div>

            <div style={styles.qrFrameWrap}>
              <div style={styles.qrFrame}>
                {qrContent ? (
                  qrContent as ReactNode
                ) : (
                  <div style={styles.qrFallback}>
                    <span style={styles.qrLabel}>QR CODE</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web
git add src/themes/birthday/index.tsx
git commit -m "feat: add birthday invitation theme component"
```

---

## Task 6: Create theme registry

**Files:**
- Create: `web/src/themes/index.ts`

- [ ] **Step 1: Create `web/src/themes/index.ts`**

```typescript
import type { ThemeMeta } from './types';
import BirthdayTheme from './birthday';

export const THEMES: ThemeMeta[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    description: 'Elegant birthday celebration card',
    accentColor: '#C9B99A',
    component: BirthdayTheme,
    extraFields: [
      { key: 'ageNumber', label: 'Age (number)', placeholder: '30' },
      { key: 'ageWord',   label: 'Age (in words)', placeholder: 'thirty' },
      { key: 'location',  label: 'Venue', placeholder: 'The Grand Ballroom, Lagos' },
      { key: 'time',      label: 'Time', placeholder: '4PM Prompt' },
    ],
  },
];

export function getTheme(id: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/themes/index.ts
git commit -m "feat: add theme registry with birthday theme"
```

---

## Task 7: Create ThemeRenderer component

**Files:**
- Create: `web/src/components/ThemeRenderer.tsx`

- [ ] **Step 1: Create `web/src/components/ThemeRenderer.tsx`**

```typescript
import { getTheme } from '@/themes';
import type { ThemeProps } from '@/themes/types';

interface Props {
  themeId: string;
  props: ThemeProps;
}

export default function ThemeRenderer({ themeId, props }: Props) {
  const theme = getTheme(themeId);
  if (!theme) return null;
  const Component = theme.component;
  return <Component {...props} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemeRenderer.tsx
git commit -m "feat: add ThemeRenderer component"
```

---

## Task 8: Update TypeScript API types

**Files:**
- Modify: `web/src/lib/api.ts:235-310`

- [ ] **Step 1: Add `theme` and `theme_data` to `Event` interface**

In `web/src/lib/api.ts`, update the `Event` interface (around line 235):

```typescript
export interface Event {
  id: string;
  owner: number;
  name: string;
  date: string;
  description: string;
  background_image: string | null;
  qr_zone: Record<string, number> | null;
  name_zone: Record<string, number | string> | null;
  tag_zone: Record<string, number | string> | null;
  has_security_pin: boolean;
  whatsapp_message_template: string;
  theme: string;
  theme_data: Record<string, unknown>;
  created_at: string;
}
```

- [ ] **Step 2: Add `theme` and `theme_data` to `EventCreate` interface**

Update `EventCreate` (around line 250):

```typescript
export interface EventCreate {
  name: string;
  date: string;
  description?: string;
  theme?: string;
  theme_data?: Record<string, unknown>;
}
```

- [ ] **Step 3: Add `event_theme`, `event_theme_data`, `event_date` to `Invitation` interface**

Update the `Invitation` interface (around line 286):

```typescript
export interface Invitation {
  id: string;
  event: string;
  event_name: string;
  event_date: string;
  event_theme: string;
  event_theme_data: Record<string, unknown>;
  name: string;
  seat_number: string;
  tag: string;
  qr_code: string;
  e_invite_image: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  invitation_url: string;
  whatsapp_share_url: string;
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
}
```

- [ ] **Step 4: Start the dev server and confirm TypeScript compiles**

```bash
cd web && npm run dev
```

Expected: no TypeScript errors in the console, server starts

- [ ] **Step 5: Commit**

```bash
cd web
git add src/lib/api.ts
git commit -m "feat: add theme fields to Event and Invitation TypeScript types"
```

---

## Task 9: Create ThemePicker component

**Files:**
- Create: `web/src/components/ThemePicker.tsx`

This component is shown only when `user.plan === 'pro'`. It renders a horizontal list of theme cards, and below the selected theme's extra fields as inputs. On change it calls back with the new `theme` and `theme_data`.

- [ ] **Step 1: Create `web/src/components/ThemePicker.tsx`**

```typescript
'use client';

import { THEMES } from '@/themes';

interface Props {
  selectedTheme: string;
  themeData: Record<string, unknown>;
  onChange: (theme: string, themeData: Record<string, unknown>) => void;
  saving?: boolean;
}

export default function ThemePicker({ selectedTheme, themeData, onChange, saving }: Props) {
  const activeMeta = THEMES.find((t) => t.id === selectedTheme);

  const handleThemeSelect = (themeId: string) => {
    onChange(themeId, themeId === selectedTheme ? themeData : {});
  };

  const handleFieldChange = (key: string, value: string) => {
    onChange(selectedTheme, { ...themeData, [key]: value });
  };

  const handleClear = () => {
    onChange('', {});
  };

  return (
    <div>
      {/* Theme cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {THEMES.map((theme) => {
          const isSelected = theme.id === selectedTheme;
          return (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`shrink-0 w-28 rounded-2xl p-3 border-2 text-left transition-all ${
                isSelected
                  ? 'border-brand bg-brand-container/20'
                  : 'border-outline-variant/20 bg-surface-container hover:border-brand/40'
              }`}
            >
              <div
                className="w-full h-16 rounded-xl mb-2"
                style={{ background: theme.accentColor }}
              />
              <p className="text-xs font-semibold text-on-surface truncate">{theme.name}</p>
              <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5 line-clamp-2">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Extra fields for selected theme */}
      {activeMeta && activeMeta.extraFields.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-widest">
            Theme Details
          </p>
          {activeMeta.extraFields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              <input
                type="text"
                value={String(themeData[field.key] ?? '')}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full h-10 rounded-xl bg-surface-container border border-outline-variant/30 px-3 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
              />
            </div>
          ))}
        </div>
      )}

      {/* Clear selection */}
      {selectedTheme && (
        <button
          onClick={handleClear}
          disabled={saving}
          className="mt-3 text-xs text-on-surface-variant hover:text-on-surface underline disabled:opacity-50"
        >
          Remove theme
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemePicker.tsx
git commit -m "feat: add ThemePicker component"
```

---

## Task 10: Add ThemePicker to the event editor

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx`

The ThemePicker card goes in the right sidebar column, between the WhatsApp template card and the event info card (around line 768 in the existing file). It is only shown when `user?.plan === 'pro'`.

- [ ] **Step 1: Add import and state**

At the top of `web/src/app/events/[id]/page.tsx`, add the import after the existing imports:

```typescript
import ThemePicker from '@/components/ThemePicker';
```

After the existing state declarations (around line 55), add:

```typescript
const [selectedTheme, setSelectedTheme] = useState('');
const [themeData, setThemeData] = useState<Record<string, unknown>>({});
const [savingTheme, setSavingTheme] = useState(false);
const [themeSaved, setThemeSaved] = useState(false);
```

- [ ] **Step 2: Populate theme state in loadData**

In the `loadData` function, after `setWaTemplate(ev.whatsapp_message_template ?? '')`, add:

```typescript
setSelectedTheme(ev.theme ?? '');
setThemeData(ev.theme_data ?? {});
```

- [ ] **Step 3: Add handleSaveTheme function**

After `handleSaveWaTemplate`, add:

```typescript
const handleSaveTheme = async (theme: string, data: Record<string, unknown>) => {
  setSelectedTheme(theme);
  setThemeData(data);
  setSavingTheme(true);
  setThemeSaved(false);
  try {
    await eventService.update(id, { theme, theme_data: data });
    setThemeSaved(true);
    window.setTimeout(() => setThemeSaved(false), 2000);
  } catch {
    setError('Failed to save theme.');
  } finally {
    setSavingTheme(false);
  }
};
```

- [ ] **Step 4: Add ThemePicker card to the right sidebar**

In the JSX, find the closing `</div>` of the WhatsApp message template card (around line 767 — the card ending with `{waTemplateSaved && ...}`). Insert the following block immediately after:

```tsx
{/* Invitation theme card — pro only */}
{user?.plan === 'pro' && (
  <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-xl bg-brand-container/40 flex items-center justify-center">
        <span className="material-symbols-outlined text-brand text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
      </div>
      <p className="text-xs font-label font-semibold text-on-surface uppercase tracking-widest">Invitation Theme</p>
    </div>
    <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
      Choose a styled card design that guests will see when they open their invite link.
    </p>
    <ThemePicker
      selectedTheme={selectedTheme}
      themeData={themeData}
      onChange={handleSaveTheme}
      saving={savingTheme}
    />
    {themeSaved && (
      <p className="text-xs text-green-600 text-center mt-3 flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Theme saved
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Start dev server and verify ThemePicker renders for pro users**

```bash
cd web && npm run dev
```

Visit `http://localhost:3000/events/<any-event-id>` while logged in as a pro user. The "Invitation Theme" card should appear in the right column. Selecting "Birthday" should show the extra fields. Free users should not see the card.

- [ ] **Step 6: Commit**

```bash
git add src/app/events/\[id\]/page.tsx
git commit -m "feat: add ThemePicker to event editor for pro users"
```

---

## Task 11: Render theme on invitation page

**Files:**
- Modify: `web/src/app/invitation/[id]/InvitationClient.tsx`

When `invitation.event_theme` is set, render the theme component in place of the `e_invite_image` hero.

- [ ] **Step 1: Add ThemeRenderer import**

At the top of `web/src/app/invitation/[id]/InvitationClient.tsx`, add:

```typescript
import ThemeRenderer from '@/components/ThemeRenderer';
```

- [ ] **Step 2: Replace the e_invite_image block**

Find the existing e_invite_image block (around line 120):

```tsx
{/* E-invite image — hero */}
{invitation.e_invite_image && (
  <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50">
    <Image
      src={resolveMediaUrl(invitation.e_invite_image)}
      alt="Your invitation"
      width={600}
      height={900}
      className="w-full h-auto object-contain"
      priority
    />
  </div>
)}
```

Replace it with:

```tsx
{/* Themed invitation card — takes priority over PIL image */}
{invitation.event_theme ? (
  <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50">
    <ThemeRenderer
      themeId={invitation.event_theme}
      props={{
        eventName: invitation.event_name,
        inviteeName: invitation.name,
        eventDate: invitation.event_date,
        qrContent: invitation.qr_code ? (
          <img
            src={resolveMediaUrl(invitation.qr_code)}
            alt="QR Code"
            style={{ width: 120, height: 120 }}
          />
        ) : undefined,
        ...invitation.event_theme_data,
      }}
    />
  </div>
) : invitation.e_invite_image ? (
  <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50">
    <Image
      src={resolveMediaUrl(invitation.e_invite_image)}
      alt="Your invitation"
      width={600}
      height={900}
      className="w-full h-auto object-contain"
      priority
    />
  </div>
) : null}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd web && npm run dev
```

1. Create or update an event with `theme = 'birthday'` and `theme_data = { ageNumber: '30', ageWord: 'thirty' }` (via the ThemePicker in the event editor, or directly via API with curl)
2. Open any invitation link for that event: `http://localhost:3000/invitation/<invitation-id>`
3. The birthday card should render instead of the PIL image
4. Events without a theme should still show the PIL image as before

- [ ] **Step 4: Commit**

```bash
git add src/app/invitation/\[id\]/InvitationClient.tsx src/components/ThemeRenderer.tsx
git commit -m "feat: render invitation theme on guest invite page"
```

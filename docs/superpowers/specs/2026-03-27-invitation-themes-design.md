# Invitation Card Themes (Pro) — Design Spec

## Overview

Pre-built invitation card themes for pro users. Each theme is a React `.tsx` component that renders as a personalized webpage when a guest opens their invite link. The host picks a theme in the event editor and fills in theme-specific details; guests see a beautiful styled invitation at their unique link.

This is distinct from the existing PIL-based template upload feature, which lets hosts upload their own image. Themes are curated, designed-by-us card layouts.

---

## Architecture

```
web/src/themes/
  types.ts                        # ThemeProps, ThemeMeta, ThemeField
  index.ts                        # THEMES registry (array of ThemeMeta)
  birthday/index.tsx              # Birthday theme (moved from web/template/birthday-template.tsx)

web/src/components/
  ThemePicker.tsx                 # Pro-only theme selection UI in event editor
  ThemeRenderer.tsx               # Renders a theme by ID with props

web/src/app/invitation/[id]/
  page.tsx                        # EXISTING — guest invite page (no route change)
  InvitationClient.tsx            # EXISTING — add theme rendering here
```

**Backend:**
- `Event` model: add `theme` (CharField) + `theme_data` (JSONField)
- `EventSerializer`: expose both new fields
- No new endpoints — existing PATCH handles saving theme + theme_data

---

## Data Model

### `ThemeField`
Declares one input a theme needs from the host:
```ts
type ThemeField = {
  key: string;       // maps to theme_data key
  label: string;     // shown in event editor
  placeholder?: string;
};
```

### `ThemeMeta`
One entry in the theme registry:
```ts
type ThemeMeta = {
  id: string;                            // e.g. "birthday"
  name: string;                          // e.g. "Birthday"
  preview: string;                       // path to static preview image e.g. "/theme-previews/birthday.png"
  component: React.ComponentType<any>;
  extraFields: ThemeField[];             // theme-specific inputs beyond base fields
};
```

### Base fields (always available from Event)
Every theme receives these from the event record automatically:
- `eventName` — from `Event.name`
- `eventDate` — from `Event.date` (ISO string; theme formats as needed)
- `location` — from `Event.location` (if field exists, else empty)
- `inviteeName` — from the Guest record for personalization

### Theme-specific extras (stored in `Event.theme_data`)
Each theme declares what extra inputs it needs. Example for birthday:
```ts
extraFields: [
  { key: 'ageNumber', label: 'Age', placeholder: '30' },
  { key: 'ageWord',   label: 'Age in words', placeholder: 'thirty' },
]
```
Values saved as `theme_data: { "ageNumber": "30", "ageWord": "thirty" }`.

---

## Backend Changes

### `Event` model (`backend/invitations/models.py`)
```python
theme = models.CharField(max_length=64, blank=True, default='')
theme_data = models.JSONField(default=dict, blank=True)
```

### `EventSerializer`
Add `theme` and `theme_data` to serializer fields. Both writable.

### Migration
Single migration: `add_theme_fields_to_event`.

---

## Frontend: Theme System

### `web/src/themes/types.ts`
Exports `ThemeField`, `ThemeMeta`, `ThemeProps`.

`ThemeProps` is the union of base fields + arbitrary extras:
```ts
type ThemeProps = {
  eventName: string;
  inviteeName?: string;
  eventDate: string;
  location?: string;
  time?: string;
  qrContent?: ReactNode;
  [key: string]: unknown;   // theme_data extras
};
```

### `web/src/themes/index.ts`
Registry array. Adding a new theme = add one entry here.

### `web/src/themes/birthday/index.tsx`
The existing `birthday-template.tsx` adapted to accept `ThemeProps`. Maps:
- `eventName` → `celebrantName`
- `inviteeName` → `inviteeName`
- `eventDate` → parsed into `dayNumber`, `dayLabel`, `monthLabel`, `yearLabel`
- `theme_data.ageNumber` → `ageNumber`
- `theme_data.ageWord` → `ageWord`

### `web/src/components/ThemePicker.tsx`
- Renders a horizontal scrollable row of theme cards (thumbnail + name)
- Only shown when `user.profile.plan === 'pro'`
- On select: calls `eventService.update({ theme: themeId })`
- Below the picker: renders `extraFields` inputs for the selected theme
- Extra field values saved to `eventService.update({ theme_data: { ... } })`

### `web/src/components/ThemeRenderer.tsx`
- Looks up theme by ID from registry
- Spreads base props + `theme_data` into the component
- Used on the invite page

---

## Guest Invite Page

The existing page at `web/src/app/invitation/[id]/InvitationClient.tsx` is modified:
- Currently renders `e_invite_image` (PIL-generated image) as the hero
- When `invitation.event_theme` is set: renders `<ThemeRenderer>` **instead of** the image hero
- When no theme: existing behaviour unchanged (shows the PIL image if present)
- `inviteeName` comes from `invitation.name` (already available)
- `eventName`, `eventDate`, `event_theme_data` are new fields exposed by the invitation API

**Invitation API change:** `InvitationSerializer` adds read-only fields:
- `event_theme` — from `invitation.event.theme`
- `event_theme_data` — from `invitation.event.theme_data`
- `event_date` — from `invitation.event.date`

**`Invitation` TypeScript type** (`web/src/lib/api.ts`) gains these three fields.

---

## Pro Gating

- `ThemePicker` checks `user.profile.plan === 'pro'` before rendering
- Non-pro users see a locked/upgrade prompt in place of the picker
- The invite page itself is public (no auth required) — no gating needed there

---

## Adding New Themes

1. Create `web/src/themes/<name>/index.tsx` — export component + `ThemeMeta`
2. Add entry to `web/src/themes/index.ts` registry
3. Add preview image to `web/public/theme-previews/<name>.png`
4. No backend changes needed

---

## Out of Scope

- PNG/image generation (Satori) — not needed; invite is a webpage
- Per-guest theme overrides — all guests see the same theme for an event
- Host preview of invite as a specific guest — future feature
- Theme marketplace / user-submitted themes

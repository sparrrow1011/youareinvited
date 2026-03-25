# CSV Guest Import Template Design

## Goal

Give event organizers a downloadable CSV template so they know exactly how to format their guest list before uploading via the existing bulk import flow.

## Architecture

**Static file** — `web/public/guest-import-template.csv` contains the header row and three example rows. Served directly by Next.js at `/guest-import-template.csv` with no API route.

**Download trigger** — A "Download Template" anchor link (with `download` attribute) placed near the existing "Import CSV" button on the event page (`web/src/app/events/[id]/page.tsx`).

**Backend fix** — The existing `bulk_import` view currently rejects rows with blank `seat_number` or `tag`. This is overly strict: not every event has assigned seating or tags. The validation is updated to require only `name`; `seat_number` and `tag` default to `""` when blank.

## Template File Contents

```
name,seat_number,tag
Sarah Al-Rashid,A-12,VIP
Omar Hassan,B-4,General
Fatima Al-Zahra,,
```

- `name` — required; blank rows are rejected with a per-row error
- `seat_number` — optional; blank is accepted and stored as empty string
- `tag` — optional; blank is accepted and stored as empty string

Row 3 has both `seat_number` and `tag` blank, illustrating that optional fields can be omitted.

## Backend Change (`backend/invitations/views.py`)

In `bulk_import`, change the row validation from:

```python
if not name or not seat or not tag:
    errors.append(f'Row {i}: name, seat_number, and tag are all required.')
    continue
```

To:

```python
if not name:
    errors.append(f'Row {i}: name is required.')
    continue
```

`seat` and `tag` remain as `row.get('seat_number', '').strip()` / `row.get('tag', '').strip()` — they are passed as empty strings when blank, which the `Invitation` model already accepts (CharField with no `blank=False` constraint at DB level).

## Frontend Change (`web/src/app/events/[id]/page.tsx`)

Add a "Download Template" anchor link styled as a secondary button, placed directly next to the existing "Import CSV" button:

```tsx
<a
  href="/guest-import-template.csv"
  download="guest-import-template.csv"
  className="..."
>
  Download Template
</a>
```

## Out of Scope

- Dynamic template generation (static file is sufficient)
- Column descriptions or instruction rows
- Changes to the `Invitation` model schema

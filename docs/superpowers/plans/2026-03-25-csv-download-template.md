# CSV Guest Import Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a downloadable CSV template for guest imports and make `seat_number`/`tag` optional in the bulk import endpoint.

**Architecture:** Three changes — (1) fix backend validation to accept blank optional fields, (2) add a static template CSV to `web/public/`, (3) add a "Template" download link to the event page beside the existing Import CSV button.

**Tech Stack:** Django + DRF (backend), Next.js 14 App Router (frontend), Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `backend/invitations/views.py` | Relax `bulk_import` row validation — require only `name` |
| `backend/tests/test_views.py` | Add tests for the new optional-field behaviour |
| `web/public/guest-import-template.csv` | New static file — headers + 3 example rows |
| `web/src/app/events/[id]/page.tsx` | Add "Template" download anchor next to Import CSV label |

---

### Task 1: Relax bulk_import validation + tests

**Files:**
- Modify: `backend/invitations/views.py` (lines ~173–175)
- Modify: `backend/tests/test_views.py`

---

- [ ] **Step 1: Write failing tests**

Open `backend/tests/test_views.py` and add at the bottom:

```python
@pytest.mark.django_db
def test_bulk_import_accepts_blank_seat_and_tag(auth_client, user):
    """seat_number and tag are optional — blank values must be accepted."""
    from invitations.models import Event, Invitation
    import io
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = "name,seat_number,tag\nAlice,,\nBob,B-1,\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"
    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["created"] == 2
    assert response.data["errors"] == []
    # Verify blank fields are stored as empty strings, not None
    alice = Invitation.objects.get(event=event, name="Alice")
    assert alice.seat_number == ""
    assert alice.tag == ""


@pytest.mark.django_db
def test_bulk_import_still_rejects_blank_name(auth_client, user):
    """name is still required — a row with a blank name must produce an error."""
    from invitations.models import Event
    import io
    event = Event.objects.create(owner=user, name="Test Event", date="2025-12-01")
    csv_content = "name,seat_number,tag\n,A-1,VIP\n"
    csv_file = io.BytesIO(csv_content.encode())
    csv_file.name = "guests.csv"
    response = auth_client.post(
        "/api/invitations/bulk_import/",
        {"event": str(event.id), "file": csv_file},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["created"] == 0
    assert len(response.data["errors"]) == 1
    assert "name is required" in response.data["errors"][0].lower()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
python -m pytest tests/test_views.py::test_bulk_import_accepts_blank_seat_and_tag tests/test_views.py::test_bulk_import_still_rejects_blank_name -v
```

Expected: both FAIL — current code rejects blank `seat_number`/`tag` and uses a different error message.

- [ ] **Step 3: Fix the per-row validation in `backend/invitations/views.py`**

Read the file. Find the `bulk_import` action around line 173. Replace only the row-validation block:

```python
# Before (line ~173–175):
if not name or not seat or not tag:
    errors.append(f'Row {i}: name, seat_number, and tag are all required.')
    continue

# After:
if not name:
    errors.append(f'Row {i}: name is required.')
    continue
```

**Note:** The header-presence check (`required = {'name', 'seat_number', 'tag'}` at line ~160) does NOT change — all three column headers must still exist in the uploaded file, they just don't need values on every row.

**Note:** The `Invitation.objects.create(event=event, name=name, seat_number=seat, tag=tag)` call on line 176 is unchanged. It already passes `seat` and `tag` as empty strings when blank, which is correct.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
python -m pytest tests/test_views.py::test_bulk_import_accepts_blank_seat_and_tag tests/test_views.py::test_bulk_import_still_rejects_blank_name -v
```

Expected: both PASS

- [ ] **Step 5: Run full backend test suite**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
python -m pytest tests/ -q
```

Expected: all pass (69+ tests)

- [ ] **Step 6: Commit**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited
git add backend/invitations/views.py backend/tests/test_views.py
git commit -m "feat: make seat_number and tag optional in bulk_import"
```

---

### Task 2: Add static CSV template file

**Files:**
- Create: `web/public/guest-import-template.csv`

---

- [ ] **Step 1: Create the file**

Create `web/public/guest-import-template.csv` with this exact content:

```
name,seat_number,tag
Sarah Al-Rashid,A-12,VIP
Omar Hassan,B-4,General
Fatima Al-Zahra,,
```

(Four lines total: 1 header + 3 data rows. End the file with a newline after the last row.)

- [ ] **Step 2: Verify file content**

```bash
cat /Users/sparrow/Documents/Webs/youareinvited/web/public/guest-import-template.csv
```

Expected output (exactly):
```
name,seat_number,tag
Sarah Al-Rashid,A-12,VIP
Omar Hassan,B-4,General
Fatima Al-Zahra,,
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited
git add web/public/guest-import-template.csv
git commit -m "feat: add guest import CSV template to public assets"
```

---

### Task 3: Add "Template" download link to event page

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx` (around line 310)

---

- [ ] **Step 1: Locate the Import CSV label**

Read `web/src/app/events/[id]/page.tsx`. Find this block (around line 310–315):

```tsx
<label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20">
  <span className="material-symbols-outlined text-sm">upload_file</span>
  Import CSV
  <input type="file" accept=".csv" onChange={handleCsvFileChange} className="hidden" />
</label>
```

- [ ] **Step 2: Insert the download anchor immediately before the Import CSV label**

Add this anchor directly before the `<label>` above:

```tsx
<a
  href="/guest-import-template.csv"
  download="guest-import-template.csv"
  className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/20"
>
  <span className="material-symbols-outlined text-sm">download</span>
  Template
</a>
```

The label "Template" (not "Download Template" as written in the spec) is intentionally compact to fit the toolbar alongside "Import CSV". It uses the same visual style so the two appear as a pair.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web
npx tsc --noEmit 2>&1 | head -10
```

Expected: no output (zero errors)

- [ ] **Step 4: Commit**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited
git add 'web/src/app/events/[id]/page.tsx'
git commit -m "feat: add Template download button to event page guest import toolbar"
```

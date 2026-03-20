# SaaS Conversion — Plan A: Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-tenancy (User → Event → Invitation), data migration, scoped APIs, watermark logic, and JWT authentication to the Django backend.

**Architecture:** Introduce `UserProfile` and `Event` models, backfill existing invitations into a default event via a data migration, scope all viewset queries to `request.user`, and add JWT auth endpoints via `djangorestframework-simplejwt`.

**Tech Stack:** Django 5, Django REST Framework 3.14, djangorestframework-simplejwt, pytest, pytest-django

**Spec:** `docs/superpowers/specs/2026-03-20-saas-conversion-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/requirements.txt` | Modify | Add pytest, pytest-django, simplejwt |
| `backend/pytest.ini` | Create | pytest-django configuration |
| `backend/tests/__init__.py` | Create | Test package |
| `backend/tests/conftest.py` | Create | Shared test fixtures |
| `backend/tests/test_models.py` | Create | UserProfile, Event, watermark logic tests |
| `backend/tests/test_auth.py` | Create | Register, login, refresh, logout tests |
| `backend/tests/test_views.py` | Create | Scoped API tests |
| `backend/invitations/models.py` | Modify | Add UserProfile, Event; update Invitation; update generate_e_invite signature |
| `backend/invitations/serializers.py` | Modify | Add UserProfile, Event serializers |
| `backend/invitations/views.py` | Modify | Scope queries by owner; update stats |
| `backend/invitations/auth_views.py` | Create | Register, login, refresh, logout endpoints |
| `backend/invitations/urls.py` | Modify | Register EventViewSet; add auth routes |
| `backend/api/urls.py` | Modify | Include auth URLs |
| `backend/api/settings.py` | Modify | Add simplejwt to INSTALLED_APPS and config |

---

### Task 1: Set up pytest-django

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Add test dependencies to requirements.txt**

Add to `backend/requirements.txt`:
```
pytest==8.1.1
pytest-django==4.8.0
```

- [ ] **Step 2: Create pytest.ini**

Create `backend/pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = api.settings
python_files = tests/test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 3: Create test package**

Create `backend/tests/__init__.py` (empty file).

- [ ] **Step 4: Create conftest.py with base fixtures**

Create `backend/tests/conftest.py`:
```python
import pytest
from django.contrib.auth.models import User


@pytest.fixture
def user(db):
    u = User.objects.create_user(
        username='testuser@example.com',
        email='testuser@example.com',
        password='testpassword123'
    )
    return u


@pytest.fixture
def other_user(db):
    u = User.objects.create_user(
        username='other@example.com',
        email='other@example.com',
        password='testpassword123'
    )
    return u


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
```

- [ ] **Step 5: Install and verify pytest runs**

```bash
cd backend
pip install pytest==8.1.1 pytest-django==4.8.0
pytest --co -q
```
Expected: `no tests ran` (no tests yet, but no errors)

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/pytest.ini backend/tests/
git commit -m "chore: add pytest-django test infrastructure"
```

---

### Task 2: Add UserProfile model

**Files:**
- Modify: `backend/invitations/models.py`
- Create: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_models.py`:
```python
import pytest
from django.contrib.auth.models import User
from invitations.models import UserProfile


@pytest.mark.django_db
def test_userprofile_created_on_user_creation():
    user = User.objects.create_user(
        username='newuser@example.com',
        email='newuser@example.com',
        password='pass123'
    )
    assert hasattr(user, 'profile')
    assert user.profile.plan == 'free'
    assert user.profile.watermark_override is False


@pytest.mark.django_db
def test_should_show_watermark_free_plan(user):
    assert user.profile.plan == 'free'
    assert user.profile.watermark_override is False


@pytest.mark.django_db
def test_should_not_show_watermark_pro_plan(user):
    user.profile.plan = 'pro'
    user.profile.save()
    assert user.profile.plan == 'pro'


@pytest.mark.django_db
def test_watermark_override_ignores_plan(user):
    user.profile.watermark_override = True
    user.profile.save()
    assert user.profile.watermark_override is True
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend && pytest tests/test_models.py -v
```
Expected: `ImportError: cannot import name 'UserProfile' from 'invitations.models'`

- [ ] **Step 3: Add UserProfile model to `backend/invitations/models.py`**

Add after existing imports:
```python
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    watermark_override = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.plan})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
```

- [ ] **Step 4: Generate and run migration**

```bash
cd backend && python manage.py makemigrations invitations
python manage.py migrate
```
Expected: migration created and applied successfully.

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd backend && pytest tests/test_models.py -v
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/ backend/tests/test_models.py
git commit -m "feat: add UserProfile model with plan and watermark_override fields"
```

---

### Task 3: Add Event model

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_models.py`:
```python
from invitations.models import Event


@pytest.mark.django_db
def test_event_belongs_to_owner(user):
    event = Event.objects.create(
        owner=user,
        name='Test Wedding',
        date='2026-06-01',
    )
    assert event.owner == user
    assert str(event) == 'Test Wedding'
    assert event.qr_zone is None
    assert event.name_zone is None
    assert event.tag_zone is None
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && pytest tests/test_models.py::test_event_belongs_to_owner -v
```
Expected: `ImportError: cannot import name 'Event'`

- [ ] **Step 3: Add Event model to `backend/invitations/models.py`**

Add after `UserProfile`:
```python
class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=200)
    date = models.DateField()
    description = models.CharField(max_length=500, blank=True, default='')
    background_image = models.ImageField(
        upload_to='event_invitation/templates/', blank=True, null=True
    )
    qr_zone = models.JSONField(null=True, blank=True)
    name_zone = models.JSONField(null=True, blank=True)
    tag_zone = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def has_template(self):
        return bool(
            self.background_image
            and self.qr_zone
            and self.name_zone
            and self.tag_zone
        )
```

- [ ] **Step 4: Generate and run migration**

```bash
cd backend && python manage.py makemigrations invitations && python manage.py migrate
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd backend && pytest tests/test_models.py -v
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/
git commit -m "feat: add Event model with zone fields for template editor"
```

---

### Task 4: Add nullable event FK to Invitation

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_models.py`:
```python
from invitations.models import Invitation


@pytest.mark.django_db
def test_invitation_can_have_event(user):
    event = Event.objects.create(owner=user, name='Wedding', date='2026-06-01')
    invitation = Invitation.objects.create(
        name='John Doe',
        seat_number='A1',
        tag='VIP',
        event=event,
    )
    assert invitation.event == event
    assert invitation.event.owner == user
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && pytest tests/test_models.py::test_invitation_can_have_event -v
```
Expected: `TypeError: Invitation() got unexpected keyword argument 'event'`

- [ ] **Step 3: Add nullable event FK to Invitation in `backend/invitations/models.py`**

In the `Invitation` class, add after `id` field:
```python
event = models.ForeignKey(
    'Event',
    on_delete=models.CASCADE,
    null=True,
    blank=True,
    related_name='invitations'
)
```

- [ ] **Step 4: Generate and run migration**

```bash
cd backend && python manage.py makemigrations invitations && python manage.py migrate
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd backend && pytest tests/test_models.py -v
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/
git commit -m "feat: add nullable event FK to Invitation (pre-migration step)"
```

---

### Task 5: Data migration — backfill existing invitations

**Files:**
- Create: `backend/invitations/migrations/XXXX_backfill_default_event.py`

- [ ] **Step 1: Create the data migration file**

Run:
```bash
cd backend && python manage.py makemigrations invitations --empty --name backfill_default_event
```

- [ ] **Step 2: Write the data migration**

Open the generated file (e.g. `backend/invitations/migrations/0005_backfill_default_event.py`) and replace the `operations` list:

```python
import datetime
from django.db import migrations
from django.conf import settings


def create_default_event_and_backfill(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Event = apps.get_model('invitations', 'Event')
    Invitation = apps.get_model('invitations', 'Invitation')
    UserProfile = apps.get_model('invitations', 'UserProfile')

    import os
    email = os.environ.get('SEED_ADMIN_EMAIL', 'admin@youareinvited.com')
    password = os.environ.get('SEED_ADMIN_PASSWORD', 'changeme123')

    # Get or create superuser
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'username': email, 'is_staff': True, 'is_superuser': True}
    )
    if created:
        user.set_password(password)
        user.save()

    # Create or get UserProfile for the superuser
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'plan': 'pro', 'watermark_override': True}
    )

    # Create default event
    event, _ = Event.objects.get_or_create(
        owner=user,
        name='Default Event',
        defaults={'date': datetime.date.today()}
    )

    # Backfill all invitations without an event
    Invitation.objects.filter(event__isnull=True).update(event=event)


def reverse_backfill(apps, schema_editor):
    # Safe to reverse — just nullify backfilled invitations
    Event = apps.get_model('invitations', 'Event')
    Invitation = apps.get_model('invitations', 'Invitation')
    default_event = Event.objects.filter(name='Default Event').first()
    if default_event:
        Invitation.objects.filter(event=default_event).update(event=None)


class Migration(migrations.Migration):

    dependencies = [
        # Replace with the actual previous migration name
        ('invitations', '0004_invitation_event'),
    ]

    operations = [
        migrations.RunPython(create_default_event_and_backfill, reverse_backfill),
    ]
```

- [ ] **Step 3: Run the data migration**

```bash
cd backend
SEED_ADMIN_EMAIL=admin@youareinvited.com SEED_ADMIN_PASSWORD=changeme123 python manage.py migrate
```
Expected: migration applies without error.

- [ ] **Step 4: Verify in Django shell**

```bash
cd backend && python manage.py shell -c "
from invitations.models import Invitation, Event
print('Events:', Event.objects.count())
print('Invitations without event:', Invitation.objects.filter(event__isnull=True).count())
"
```
Expected:
```
Events: 1 (or 0 if database was empty)
Invitations without event: 0
```

- [ ] **Step 5: Commit**

```bash
git add backend/invitations/migrations/
git commit -m "feat: data migration — backfill existing invitations into default event"
```

---

### Task 6: Make event FK non-nullable

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write test confirming event is required**

Add to `backend/tests/test_models.py`:
```python
from django.db import IntegrityError


@pytest.mark.django_db
def test_invitation_requires_event():
    with pytest.raises(IntegrityError):
        Invitation.objects.create(
            name='No Event Person',
            seat_number='Z9',
            tag='General',
            event=None,
        )
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && pytest tests/test_models.py::test_invitation_requires_event -v
```
Expected: FAIL — no IntegrityError raised (event is still nullable)

- [ ] **Step 3: Remove null=True, blank=True from the event FK**

In `backend/invitations/models.py`, update the `event` field on `Invitation`:
```python
event = models.ForeignKey(
    'Event',
    on_delete=models.CASCADE,
    related_name='invitations'
)
```

- [ ] **Step 4: Generate and run migration**

```bash
cd backend && python manage.py makemigrations invitations && python manage.py migrate
```
Expected: migration applies (no null rows exist so this is safe).

- [ ] **Step 5: Run all tests — verify they pass**

```bash
cd backend && pytest tests/ -v
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/
git commit -m "feat: make Invitation.event non-nullable after backfill confirmed"
```

---

### Task 7: Update generate_e_invite with watermark parameter

**Files:**
- Modify: `backend/invitations/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_models.py`:
```python
@pytest.mark.django_db
def test_watermark_shown_for_free_user(user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    invitation = Invitation.objects.create(
        name='Guest', seat_number='A1', tag='VIP', event=event
    )
    # Free plan — watermark should be True
    owner = invitation.event.owner
    show = not owner.profile.watermark_override and owner.profile.plan == 'free'
    assert show is True


@pytest.mark.django_db
def test_watermark_hidden_for_pro_user(user):
    user.profile.plan = 'pro'
    user.profile.save()
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    invitation = Invitation.objects.create(
        name='Guest', seat_number='A1', tag='VIP', event=event
    )
    owner = invitation.event.owner
    show = not owner.profile.watermark_override and owner.profile.plan == 'free'
    assert show is False
```

- [ ] **Step 2: Run tests — verify they pass already** (logic is pure, no code change needed for these)

```bash
cd backend && pytest tests/test_models.py -v
```
Expected: all PASS

- [ ] **Step 3: Update `generate_e_invite` signature in `backend/invitations/models.py`**

Change the method signature from:
```python
def generate_e_invite(self):
```
to:
```python
def generate_e_invite(self, show_watermark: bool = True):
```

Update the footer section inside `generate_e_invite`. Find the footer text block and replace with:
```python
        # Add footer / watermark
        if show_watermark:
            footer_text = "Made with YouAreInvited.com"
        else:
            footer_text = "We look forward to celebrating with you!"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
        footer_width = footer_bbox[2] - footer_bbox[0]
        draw.text(((width - footer_width) / 2, 1050), footer_text, fill='#a8dadc', font=small_font)
```

- [ ] **Step 4: Update `Invitation.save()` to resolve watermark and pass it**

In `Invitation.save()`, update the e-invite generation block:
```python
    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.generate_qr_code()

        super().save(*args, **kwargs)

        if not self.e_invite_image:
            # Resolve watermark based on owner's plan
            show_watermark = True
            if self.event_id:
                try:
                    owner = self.event.owner
                    profile = owner.profile
                    show_watermark = not profile.watermark_override and profile.plan == 'free'
                except Exception:
                    pass
            self.generate_e_invite(show_watermark=show_watermark)
            super().save(update_fields=['e_invite_image'])
```

- [ ] **Step 5: Update the `regenerate_images` view in `backend/invitations/views.py`**

In `InvitationViewSet.regenerate_images`:
```python
    @action(detail=True, methods=['post'])
    def regenerate_images(self, request, pk=None):
        invitation = self.get_object()
        invitation.generate_qr_code()
        owner = invitation.event.owner
        show_watermark = not owner.profile.watermark_override and owner.profile.plan == 'free'
        invitation.generate_e_invite(show_watermark=show_watermark)
        invitation.save()
        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)
```

> **Note on queryset scoping for `regenerate_images`:** This action uses `get_permissions()` which returns `[IsAdminUser()]`, meaning only Django staff/superusers can call it. However `get_queryset()` (added in Task 9) filters by `event__owner=request.user`. A staff user who is not the event owner will get a 404. Fix: override `get_queryset()` to return unscoped results for admin-only actions:
> ```python
> def get_queryset(self):
>     if self.action in ('admin_undo_check_in', 'regenerate_images'):
>         return Invitation.objects.all().select_related('event__owner__profile')
>     return Invitation.objects.filter(
>         event__owner=self.request.user
>     ).select_related('event__owner__profile')
> ```
> Apply this when implementing Task 9 Step 3.

- [ ] **Step 6: Run all tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/invitations/models.py backend/invitations/views.py backend/tests/test_models.py
git commit -m "feat: add show_watermark param to generate_e_invite, resolve from owner plan"
```

---

### Task 8: Add Event serializer + EventViewSet + scoped URLs

**Files:**
- Modify: `backend/invitations/serializers.py`
- Modify: `backend/invitations/views.py`
- Modify: `backend/invitations/urls.py`
- Create: `backend/tests/test_views.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_views.py`:
```python
import pytest
from django.contrib.auth.models import User
from invitations.models import Event


@pytest.mark.django_db
def test_list_events_returns_only_owners_events(auth_client, user, other_user):
    Event.objects.create(owner=user, name='My Event', date='2026-06-01')
    Event.objects.create(owner=other_user, name='Other Event', date='2026-07-01')

    response = auth_client.get('/api/events/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['name'] == 'My Event'


@pytest.mark.django_db
def test_create_event_assigns_current_user_as_owner(auth_client, user):
    response = auth_client.post('/api/events/', {
        'name': 'New Event',
        'date': '2026-09-01',
    }, format='json')
    assert response.status_code == 201
    assert response.data['owner'] == user.id


@pytest.mark.django_db
def test_unauthenticated_cannot_list_events(api_client):
    response = api_client.get('/api/events/')
    assert response.status_code == 401
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend && pytest tests/test_views.py -v
```
Expected: FAIL — 404 (no /api/events/ route yet)

- [ ] **Step 3: Add EventSerializer to `backend/invitations/serializers.py`**

Add to the existing serializers file:
```python
from .models import Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at']
```

- [ ] **Step 4: Add EventViewSet to `backend/invitations/views.py`**

Add after existing imports:
```python
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_permissions(self):
        return [IsAuthenticated()]
```

Also import Event:
```python
from .models import Invitation, Event
```

- [ ] **Step 5: Register EventViewSet in `backend/invitations/urls.py`**

```python
from rest_framework.routers import DefaultRouter
from .views import InvitationViewSet, EventViewSet

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = router.urls
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
cd backend && pytest tests/test_views.py -v
```
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/invitations/serializers.py backend/invitations/views.py backend/invitations/urls.py backend/tests/test_views.py
git commit -m "feat: add EventViewSet and scoped event list/create endpoints"
```

---

### Task 9: Scope InvitationViewSet by event owner + fix stats

**Files:**
- Modify: `backend/invitations/views.py`
- Modify: `backend/tests/test_views.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_views.py`:
```python
@pytest.mark.django_db
def test_invitation_list_scoped_to_owner(auth_client, user, other_user):
    from invitations.models import Invitation
    event1 = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    event2 = Event.objects.create(owner=other_user, name='Theirs', date='2026-06-01')
    Invitation.objects.create(name='My Guest', seat_number='A1', tag='VIP', event=event1)
    Invitation.objects.create(name='Their Guest', seat_number='B1', tag='VIP', event=event2)

    response = auth_client.get('/api/invitations/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['name'] == 'My Guest'


@pytest.mark.django_db
def test_stats_scoped_to_owner(auth_client, user, other_user):
    from invitations.models import Invitation
    event1 = Event.objects.create(owner=user, name='Mine', date='2026-06-01')
    event2 = Event.objects.create(owner=other_user, name='Theirs', date='2026-06-01')
    Invitation.objects.create(name='My Guest', seat_number='A1', tag='VIP', event=event1)
    Invitation.objects.create(name='Their Guest', seat_number='B1', tag='VIP', event=event2, checked_in=True)

    response = auth_client.get('/api/invitations/stats/')
    assert response.status_code == 200
    assert response.data['total_invitations'] == 1
    assert response.data['checked_in'] == 0
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend && pytest tests/test_views.py::test_invitation_list_scoped_to_owner tests/test_views.py::test_stats_scoped_to_owner -v
```
Expected: FAIL — returns all invitations

- [ ] **Step 3: Update InvitationViewSet to scope by owner**

In `backend/invitations/views.py`, update `InvitationViewSet`:
```python
class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer

    def get_queryset(self):
        return Invitation.objects.filter(
            event__owner=self.request.user
        ).select_related('event__owner__profile')
```

Remove the old `queryset = Invitation.objects.all()` class attribute.

- [ ] **Step 4: Update stats action**

In the `stats` action:
```python
    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            qs = Invitation.objects.filter(event__owner=request.user)
            total = qs.count()
            checked_in = qs.filter(checked_in=True).count()
        except (OperationalError, ProgrammingError):
            return Response({
                'total_invitations': 0, 'checked_in': 0,
                'pending': 0, 'check_in_rate': 0,
                'warning': 'Database not initialized.'
            }, status=status.HTTP_200_OK)

        pending = total - checked_in
        return Response({
            'total_invitations': total,
            'checked_in': checked_in,
            'pending': pending,
            'check_in_rate': (checked_in / total * 100) if total > 0 else 0
        })
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_views.py
git commit -m "feat: scope invitation list and stats to authenticated owner"
```

---

### Task 10: JWT authentication endpoints

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/api/settings.py`
- Create: `backend/invitations/auth_views.py`
- Modify: `backend/api/urls.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Add simplejwt to requirements.txt**

Add to `backend/requirements.txt`:
```
djangorestframework-simplejwt==5.3.1
```

Install:
```bash
cd backend && pip install djangorestframework-simplejwt==5.3.1
```

- [ ] **Step 2: Add simplejwt to settings**

In `backend/api/settings.py`, add to `INSTALLED_APPS`:
```python
'rest_framework_simplejwt',
```

Add JWT config after `REST_FRAMEWORK`:
```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_SAMESITE': 'Lax',
}
```

**Add** `DEFAULT_AUTHENTICATION_CLASSES` key to the **existing** `REST_FRAMEWORK` dict in `settings.py` (do NOT replace the whole dict — just add the key):
```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Add this key:
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Keep for Django admin
    ],
}
```

Also add `CORS_ALLOW_CREDENTIALS = True` below `CORS_ALLOWED_ORIGINS` in `settings.py`. This is required so the browser sends cookies on cross-origin requests (frontend on Vercel → backend on separate Vercel):
```python
CORS_ALLOW_CREDENTIALS = True
```

- [ ] **Step 3: Write failing tests**

Create `backend/tests/test_auth.py`:
```python
import pytest
from django.contrib.auth.models import User


@pytest.mark.django_db
def test_register_creates_user_and_profile(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'new@example.com',
        'password': 'strongpass123',
    }, format='json')
    assert response.status_code == 201
    user = User.objects.get(email='new@example.com')
    assert hasattr(user, 'profile')
    assert user.profile.plan == 'free'


@pytest.mark.django_db
def test_login_returns_token(api_client, user):
    response = api_client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'testpassword123',
    }, format='json')
    assert response.status_code == 200
    assert 'access' in response.data


@pytest.mark.django_db
def test_login_wrong_password_returns_401(api_client, user):
    response = api_client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'wrongpassword',
    }, format='json')
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_returns_200(auth_client):
    response = auth_client.post('/api/auth/logout/')
    assert response.status_code == 200
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
cd backend && pytest tests/test_auth.py -v
```
Expected: FAIL — 404 (no auth routes yet)

- [ ] **Step 5: Create `backend/invitations/auth_views.py`**

```python
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {'detail': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'An account with this email already exists.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=email, email=email, password=password)
    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    from django.contrib.auth import authenticate
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response(
            {'detail': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh(request):
    from rest_framework_simplejwt.views import TokenRefreshView
    return TokenRefreshView.as_view()(request._request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'Logged out.'})
```

- [ ] **Step 6: Add auth URLs to `backend/api/urls.py`**

Read the existing `backend/api/urls.py` first — it may have a `health_check` route. Add the auth paths **without removing** existing routes:
```python
from django.contrib import admin
from django.urls import path, include
from invitations.auth_views import register, login, refresh, logout

# Keep any existing routes (e.g. health_check) and ADD these:
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('invitations.urls')),
    path('api/auth/register/', register),
    path('api/auth/login/', login),
    path('api/auth/refresh/', refresh),
    path('api/auth/logout/', logout),
    # Re-add any existing routes that were here before (e.g. health check)
]
```

- [ ] **Step 7: Enable token blacklisting (needed for logout)**

Add to `INSTALLED_APPS` in `backend/api/settings.py`:
```python
'rest_framework_simplejwt.token_blacklist',
```

Run migration:
```bash
cd backend && python manage.py migrate
```

- [ ] **Step 8: Run all tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add backend/requirements.txt backend/api/settings.py backend/invitations/auth_views.py backend/api/urls.py backend/tests/test_auth.py
git commit -m "feat: add JWT register/login/refresh/logout endpoints via simplejwt"
```

---

### Task 11: Register UserProfile in Django admin

**Files:**
- Modify: `backend/invitations/admin.py`

- [ ] **Step 1: Register UserProfile with editable fields**

Open `backend/invitations/admin.py` and add:
```python
from django.contrib import admin
from .models import Invitation, UserProfile, Event


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'watermark_override', 'created_at']
    list_editable = ['plan', 'watermark_override']
    search_fields = ['user__email']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'date', 'created_at']
    search_fields = ['name', 'owner__email']


# Keep existing Invitation registration if present
```

- [ ] **Step 2: Start server and verify admin panel**

```bash
cd backend && python manage.py runserver
```
Open `http://localhost:8000/admin/` and confirm:
- UserProfile entries are visible with plan + watermark_override checkboxes
- Event entries are visible

- [ ] **Step 3: Commit**

```bash
git add backend/invitations/admin.py
git commit -m "feat: register UserProfile and Event in Django admin with editable plan/watermark fields"
```

---

### Task 12: Add event field to InvitationCreateSerializer

**Files:**
- Modify: `backend/invitations/serializers.py`
- Modify: `backend/tests/test_views.py`

Without this, `POST /api/invitations/` will fail with an integrity error because the non-nullable `event` FK has no value.

- [ ] **Step 1: Write failing test**

Add to `backend/tests/test_views.py`:
```python
@pytest.mark.django_db
def test_create_invitation_requires_event(auth_client, user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    response = auth_client.post('/api/invitations/', {
        'name': 'Jane Doe',
        'seat_number': 'B2',
        'tag': 'Family',
        'event': str(event.id),
    }, format='json')
    assert response.status_code == 201
    assert response.data['name'] == 'Jane Doe'
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && pytest tests/test_views.py::test_create_invitation_requires_event -v
```
Expected: FAIL — 400 or 500 (event field not accepted)

- [ ] **Step 3: Update InvitationCreateSerializer**

In `backend/invitations/serializers.py`, update `InvitationCreateSerializer`:
```python
class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['name', 'seat_number', 'tag', 'event']
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && pytest tests/test_views.py::test_create_invitation_requires_event -v
```
Expected: PASS

- [ ] **Step 5: Run all tests**

```bash
cd backend && pytest tests/ -v
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/serializers.py backend/tests/test_views.py
git commit -m "feat: add event field to InvitationCreateSerializer"
```

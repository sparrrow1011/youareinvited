# Per-Event Security Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global `SECURITY_PASSWORD` with a per-event PIN system so each organizer's security staff can only check in guests for their specific events.

**Architecture:** Add `security_pin` (hashed) to the `Event` model. New backend endpoints let organizers set a PIN and let security staff exchange it for a 12-hour Django-signed token. The `check_in` API endpoint now requires either that token (scoped to the correct event) or organizer JWT — it is no longer open. The frontend gains a PIN login page per event (`/security/event/[id]`) and an event-scoped check-in page; old global `/security` pages are deleted.

**Tech Stack:** Django 5 (`django.core.signing`, `django.contrib.auth.hashers`), Django REST Framework (AnonRateThrottle), Next.js 14 App Router, TypeScript, Tailwind CSS (existing design tokens).

---

## File Map

**Create:**
- `backend/invitations/migrations/0008_event_security_pin.py` — DB migration
- `backend/tests/test_security_gateway.py` — all new backend tests
- `web/src/app/api/auth/security/token/route.ts` — sets httpOnly security_token cookie
- `web/src/app/api/auth/security/logout/route.ts` — clears security_token cookie
- `web/src/app/security/event/[id]/page.tsx` — PIN login page
- `web/src/app/security/event/[id]/checkin/page.tsx` — event-scoped check-in page

**Modify:**
- `backend/invitations/models.py` — add `Event.security_pin`, update `get_security_checkin_url()`
- `backend/invitations/serializers.py` — add `SetSecurityPinSerializer`
- `backend/invitations/views.py` — add 3 new EventViewSet actions; rewrite `check_in`
- `backend/api/settings.py` — add throttle rates; add `X-Security-Token` to `CORS_ALLOW_HEADERS`
- `web/src/middleware.ts` — replace global security_auth check with scoped checkin check
- `web/src/lib/api.ts` — update `checkIn` to accept `securityToken` param

**Delete:**
- `web/src/app/security/page.tsx`
- `web/src/app/security/login/page.tsx`
- `web/src/app/security/check-in/[id]/page.tsx`
- `web/src/app/api/auth/security/login/route.ts`
- `web/src/app/security/logout/route.ts`

---

## Task 1: Event model — add security_pin field + update QR URL + migration

**Files:**
- Modify: `backend/invitations/models.py`
- Create: `backend/invitations/migrations/0008_event_security_pin.py`
- Test: `backend/tests/test_security_gateway.py`

- [ ] **Step 1: Create test file and write failing tests**

Create `backend/tests/test_security_gateway.py`:

```python
import pytest
from invitations.models import Event, Invitation


@pytest.mark.django_db
def test_event_has_security_pin_field(user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    assert event.security_pin is None  # null by default


@pytest.mark.django_db
def test_get_security_checkin_url_includes_event_id(user, monkeypatch):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    inv = Invitation.objects.create(name='Guest', seat_number='A1', tag='VIP', event=event)
    url = inv.get_security_checkin_url()
    assert f'/security/event/{event.id}/checkin' in url
    assert f'invitation={inv.id}' in url
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
pytest tests/test_security_gateway.py -v
```
Expected: FAIL — `Event has no attribute 'security_pin'` and URL format mismatch.

- [ ] **Step 3: Add `security_pin` field to Event model and update `get_security_checkin_url`**

In `backend/invitations/models.py`, in the `Event` class, add after `created_at`:

```python
security_pin = models.CharField(max_length=128, null=True, blank=True)
```

In the `Invitation` class, replace `get_security_checkin_url`:

```python
def get_security_checkin_url(self):
    base = "https://invitation-system-psi.vercel.app"
    return f"{base}/security/event/{self.event_id}/checkin?invitation={self.id}"
```

- [ ] **Step 4: Generate migration**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
python manage.py makemigrations invitations --name event_security_pin
```

Expected: creates `invitations/migrations/0008_event_security_pin.py`

- [ ] **Step 5: Run migration**

```bash
python manage.py migrate
```

Expected: OK

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pytest tests/test_security_gateway.py::test_event_has_security_pin_field tests/test_security_gateway.py::test_get_security_checkin_url_includes_event_id -v
```
Expected: PASS

- [ ] **Step 7: Run full test suite to confirm nothing is broken**

```bash
pytest tests/ -v
```
Expected: all existing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add backend/invitations/models.py backend/invitations/migrations/0008_event_security_pin.py backend/tests/test_security_gateway.py
git commit -m "feat: add Event.security_pin field and update QR URL format"
```

---

## Task 2: Serializers — SetSecurityPinSerializer

**Files:**
- Modify: `backend/invitations/serializers.py`
- Test: `backend/tests/test_security_gateway.py`

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_security_gateway.py`:

```python
def test_set_security_pin_serializer_accepts_4_digits():
    from invitations.serializers import SetSecurityPinSerializer
    s = SetSecurityPinSerializer(data={'pin': '1234'})
    assert s.is_valid(), s.errors


def test_set_security_pin_serializer_accepts_6_digits():
    from invitations.serializers import SetSecurityPinSerializer
    s = SetSecurityPinSerializer(data={'pin': '123456'})
    assert s.is_valid(), s.errors


def test_set_security_pin_serializer_rejects_letters():
    from invitations.serializers import SetSecurityPinSerializer
    s = SetSecurityPinSerializer(data={'pin': 'abcd'})
    assert not s.is_valid()


def test_set_security_pin_serializer_rejects_too_short():
    from invitations.serializers import SetSecurityPinSerializer
    s = SetSecurityPinSerializer(data={'pin': '123'})
    assert not s.is_valid()


def test_set_security_pin_serializer_accepts_null():
    from invitations.serializers import SetSecurityPinSerializer
    s = SetSecurityPinSerializer(data={'pin': None})
    assert s.is_valid(), s.errors
    assert s.validated_data['pin'] is None
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
pytest tests/test_security_gateway.py -k "serializer" -v
```
Expected: FAIL — `ImportError: cannot import name 'SetSecurityPinSerializer'`

- [ ] **Step 3: Add SetSecurityPinSerializer to serializers.py**

Append to `backend/invitations/serializers.py`:

```python
import re


class SetSecurityPinSerializer(serializers.Serializer):
    pin = serializers.CharField(
        max_length=6,
        allow_null=True,
        required=False,
        default=None,
    )

    def validate_pin(self, value):
        if value is None:
            return None
        if not re.match(r'^\d{4,6}$', value):
            raise serializers.ValidationError('PIN must be 4–6 digits.')
        return value
```

Also update `EventSerializer` to expose whether a PIN is set (so the event page can initialize its UI correctly):

```python
class EventSerializer(serializers.ModelSerializer):
    has_security_pin = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'name', 'date', 'description',
            'background_image', 'qr_zone', 'name_zone', 'tag_zone',
            'created_at', 'has_security_pin',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'has_security_pin']

    def get_has_security_pin(self, obj):
        return bool(obj.security_pin)

    # keep existing _parse_zone / validate_* methods unchanged
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_security_gateway.py -k "serializer" -v
```
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/invitations/serializers.py backend/tests/test_security_gateway.py
git commit -m "feat: add SetSecurityPinSerializer with 4-6 digit validation"
```

---

## Task 3: EventViewSet — public_info, verify_security_pin, set_security_pin

**Files:**
- Modify: `backend/api/settings.py` (throttle config — required before view code runs in tests)
- Modify: `backend/invitations/views.py`
- Test: `backend/tests/test_security_gateway.py`

- [ ] **Step 0: Add throttle config and CORS header to settings FIRST**

`AnonRateThrottle` (used by `verify_security_pin`) will raise `ImproperlyConfigured` if `DEFAULT_THROTTLE_RATES['anon']` is not set. Add it now before writing the view.

In `backend/api/settings.py`, update `REST_FRAMEWORK`:

```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/min',
    },
}
```

Also update `CORS_ALLOW_HEADERS` (replace the existing line):
```python
CORS_ALLOW_HEADERS = list(default_headers) + ['X-Security-Token']
```

Run `pytest tests/ -v` to confirm existing tests still pass before continuing.

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_security_gateway.py`:

```python
@pytest.mark.django_db
def test_public_info_returns_event_name_without_auth(api_client, user):
    event = Event.objects.create(owner=user, name='The Golden Hour Soirée', date='2026-10-24')
    response = api_client.get(f'/api/events/{event.id}/public_info/')
    assert response.status_code == 200
    assert response.data['name'] == 'The Golden Hour Soirée'
    assert str(response.data['id']) == str(event.id)


@pytest.mark.django_db
def test_public_info_returns_404_for_unknown_event(api_client):
    import uuid
    response = api_client.get(f'/api/events/{uuid.uuid4()}/public_info/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_set_security_pin_saves_hashed_pin(auth_client, user):
    from django.contrib.auth.hashers import check_password
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    response = auth_client.post(f'/api/events/{event.id}/set_security_pin/', {'pin': '4321'}, format='json')
    assert response.status_code == 200
    assert response.data['security_pin_set'] is True
    event.refresh_from_db()
    assert check_password('4321', event.security_pin)


@pytest.mark.django_db
def test_set_security_pin_clears_pin_when_null(auth_client, user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01',
                                  security_pin=make_password('1234'))
    response = auth_client.post(f'/api/events/{event.id}/set_security_pin/', {'pin': None}, format='json')
    assert response.status_code == 200
    assert response.data['security_pin_set'] is False
    event.refresh_from_db()
    assert event.security_pin is None


@pytest.mark.django_db
def test_set_security_pin_requires_auth(api_client, user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    response = api_client.post(f'/api/events/{event.id}/set_security_pin/', {'pin': '1234'}, format='json')
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_verify_security_pin_returns_token_on_success(api_client, user):
    from django.contrib.auth.hashers import make_password
    from django.core import signing
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01',
                                  security_pin=make_password('5678'))
    response = api_client.post(f'/api/events/{event.id}/verify_security_pin/', {'pin': '5678'}, format='json')
    assert response.status_code == 200
    assert 'token' in response.data
    # Verify token is valid and scoped correctly
    payload = signing.loads(response.data['token'], salt='security-checkin', max_age=43200)
    assert str(payload['event_id']) == str(event.id)
    assert payload['organizer_id'] == user.id


@pytest.mark.django_db
def test_verify_security_pin_returns_401_on_wrong_pin(api_client, user):
    from django.contrib.auth.hashers import make_password
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01',
                                  security_pin=make_password('5678'))
    response = api_client.post(f'/api/events/{event.id}/verify_security_pin/', {'pin': '0000'}, format='json')
    assert response.status_code == 401


@pytest.mark.django_db
def test_verify_security_pin_returns_403_when_no_pin_configured(api_client, user):
    event = Event.objects.create(owner=user, name='Test', date='2026-06-01')
    response = api_client.post(f'/api/events/{event.id}/verify_security_pin/', {'pin': '1234'}, format='json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_verify_security_pin_returns_404_for_unknown_event(api_client):
    import uuid
    response = api_client.post(f'/api/events/{uuid.uuid4()}/verify_security_pin/', {'pin': '1234'}, format='json')
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
pytest tests/test_security_gateway.py -k "public_info or security_pin" -v
```
Expected: FAIL — actions not found (404).

- [ ] **Step 3: Add the three new actions to EventViewSet in views.py**

Add these imports at the top of `backend/invitations/views.py`:

```python
from django.contrib.auth.hashers import make_password, check_password
from django.core import signing
from django.shortcuts import get_object_or_404
from rest_framework.throttling import AnonRateThrottle
from .serializers import SetSecurityPinSerializer
```

Add these three methods to the `EventViewSet` class (after `perform_create`):

```python
    @action(detail=True, methods=['get'], permission_classes=[], throttle_classes=[])
    def public_info(self, request, pk=None):
        event = get_object_or_404(Event, pk=pk)
        return Response({
            'id': str(event.id),
            'name': event.name,
            'date': str(event.date),
        })

    @action(detail=True, methods=['post'], permission_classes=[], throttle_classes=[AnonRateThrottle])
    def verify_security_pin(self, request, pk=None):
        event = get_object_or_404(Event, pk=pk)
        if not event.security_pin:
            return Response(
                {'detail': 'No security PIN configured for this event'},
                status=status.HTTP_403_FORBIDDEN,
            )
        pin = request.data.get('pin', '')
        if not check_password(str(pin), event.security_pin):
            return Response({'detail': 'Invalid PIN'}, status=status.HTTP_401_UNAUTHORIZED)
        token = signing.dumps(
            {'event_id': str(event.id), 'organizer_id': event.owner_id},
            salt='security-checkin',
        )
        return Response({'token': token})

    @action(detail=True, methods=['post'])
    def set_security_pin(self, request, pk=None):
        # get_queryset filters by owner — other organizers' events return 404
        event = self.get_object()
        serializer = SetSecurityPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pin = serializer.validated_data['pin']
        event.security_pin = make_password(pin) if pin is not None else None
        event.save(update_fields=['security_pin'])
        return Response({'security_pin_set': pin is not None})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_security_gateway.py -k "public_info or security_pin" -v
```
Expected: all new tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
pytest tests/ -v
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_security_gateway.py
git commit -m "feat: add public_info, verify_security_pin, set_security_pin to EventViewSet"
```

---

## Task 4: InvitationViewSet — rewrite check_in with token auth

**Files:**
- Modify: `backend/invitations/views.py`
- Test: `backend/tests/test_security_gateway.py`

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_security_gateway.py`:

```python
@pytest.fixture
def event_with_pin(user):
    from django.contrib.auth.hashers import make_password
    return Event.objects.create(
        owner=user, name='Pinned Event', date='2026-06-01',
        security_pin=make_password('1234')
    )


@pytest.fixture
def invitation_for_event(event_with_pin, monkeypatch):
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    return Invitation.objects.create(
        name='Test Guest', seat_number='A1', tag='VIP', event=event_with_pin
    )


def make_security_token(event_id, organizer_id):
    from django.core import signing
    return signing.dumps(
        {'event_id': str(event_id), 'organizer_id': organizer_id},
        salt='security-checkin',
    )


@pytest.mark.django_db
def test_check_in_with_valid_security_token(api_client, user, event_with_pin, invitation_for_event):
    token = make_security_token(event_with_pin.id, user.id)
    response = api_client.post(
        f'/api/invitations/{invitation_for_event.id}/check_in/',
        {},
        format='json',
        HTTP_X_SECURITY_TOKEN=token,
    )
    assert response.status_code == 200
    assert response.data['checked_in'] is True


@pytest.mark.django_db
def test_check_in_organizer_can_check_in_own_guest(auth_client, user, event_with_pin, invitation_for_event):
    # Organizer uses JWT auth (no token needed)
    response = auth_client.post(
        f'/api/invitations/{invitation_for_event.id}/check_in/',
        {},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['checked_in'] is True


@pytest.mark.django_db
def test_check_in_unauthenticated_without_token_returns_401(api_client, user, event_with_pin, invitation_for_event):
    response = api_client.post(
        f'/api/invitations/{invitation_for_event.id}/check_in/',
        {},
        format='json',
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_check_in_with_wrong_event_token_returns_403(api_client, user, event_with_pin, invitation_for_event):
    other_user = User.objects.create_user(username='other@x.com', email='other@x.com', password='pass')
    other_event = Event.objects.create(owner=other_user, name='Other', date='2026-07-01')
    token = make_security_token(other_event.id, other_user.id)
    response = api_client.post(
        f'/api/invitations/{invitation_for_event.id}/check_in/',
        {},
        format='json',
        HTTP_X_SECURITY_TOKEN=token,
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_check_in_with_invalid_token_returns_401(api_client, user, event_with_pin, invitation_for_event):
    response = api_client.post(
        f'/api/invitations/{invitation_for_event.id}/check_in/',
        {},
        format='json',
        HTTP_X_SECURITY_TOKEN='this.is.not.valid',
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_check_in_already_checked_in_returns_400(api_client, user, event_with_pin, invitation_for_event):
    token = make_security_token(event_with_pin.id, user.id)
    # First check-in
    api_client.post(f'/api/invitations/{invitation_for_event.id}/check_in/', {},
                    format='json', HTTP_X_SECURITY_TOKEN=token)
    # Second attempt
    response = api_client.post(f'/api/invitations/{invitation_for_event.id}/check_in/', {},
                                format='json', HTTP_X_SECURITY_TOKEN=token)
    assert response.status_code == 400


@pytest.mark.django_db
def test_check_in_organizer_cannot_check_in_other_organizers_guest(auth_client, other_user, monkeypatch):
    # auth_client is authenticated as `user`; other_user owns this event
    from invitations.models import Invitation
    monkeypatch.setattr(Invitation, 'generate_qr_code', lambda self: None)
    monkeypatch.setattr(Invitation, 'generate_e_invite', lambda self, **kwargs: None)
    other_event = Event.objects.create(owner=other_user, name='Other', date='2026-07-01')
    inv = Invitation.objects.create(name='Guest', seat_number='A1', tag='VIP', event=other_event)
    response = auth_client.post(f'/api/invitations/{inv.id}/check_in/', {}, format='json')
    assert response.status_code == 403
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
pytest tests/test_security_gateway.py -k "check_in" -v
```
Expected: most fail (currently check_in has no auth, so 200 when 401 is expected, etc.)

- [ ] **Step 3: Rewrite the check_in action in InvitationViewSet**

In `backend/invitations/views.py`, replace the existing `check_in` method with:

```python
    @action(detail=True, methods=['post'], permission_classes=[])
    def check_in(self, request, pk=None):
        invitation = get_object_or_404(Invitation, pk=pk)
        token = request.headers.get('X-Security-Token')

        if token:
            try:
                payload = signing.loads(token, salt='security-checkin', max_age=43200)
            except signing.SignatureExpired:
                return Response(
                    {'detail': 'Security session expired. Please re-enter the PIN.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            except signing.BadSignature:
                return Response(
                    {'detail': 'Invalid security token.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if str(payload['event_id']) != str(invitation.event_id):
                return Response(
                    {'detail': 'Token scoped to wrong event.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif request.user and request.user.is_authenticated:
            if invitation.event.owner_id != request.user.id:
                return Response(
                    {'detail': 'Not your event.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if invitation.checked_in:
            return Response({'detail': 'Already checked in'}, status=status.HTTP_400_BAD_REQUEST)

        invitation.checked_in = True
        invitation.checked_in_at = timezone.now()
        invitation.save()
        return Response(InvitationSerializer(invitation).data)
```

Also update `get_permissions` — remove `check_in` from the open list since the action now handles its own auth:

```python
    def get_permissions(self):
        if self.action == 'retrieve':
            return []
        if self.action in ('admin_undo_check_in', 'regenerate_images'):
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_security_gateway.py -k "check_in" -v
```
Expected: all 8 PASS.

- [ ] **Step 5: Run full test suite**

```bash
pytest tests/ -v
```
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add backend/invitations/views.py backend/tests/test_security_gateway.py
git commit -m "feat: secure check_in endpoint — requires scoped token or organizer JWT"
```

---

## Task 5: Verify settings + run full backend test suite

The settings changes (throttle + CORS header) were already applied in Task 3, Step 0. This task confirms everything is wired together correctly.

**Files:** (no new changes)

- [ ] **Step 1: Run full backend test suite**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend
pytest tests/ -v
```
Expected: all passing (Tasks 1–4 tests + pre-existing tests).

- [ ] **Step 2: Commit settings changes if not yet committed**

If `backend/api/settings.py` was not committed as part of Task 3, commit it now:

```bash
git add backend/api/settings.py
git commit -m "chore: add anon throttle rate and X-Security-Token CORS header"
```

---

## Task 6: Next.js API routes — token cookie setter + logout

**Files:**
- Create: `web/src/app/api/auth/security/token/route.ts`
- Create: `web/src/app/api/auth/security/logout/route.ts`

- [ ] **Step 1: Create the token-setter route**

Create `web/src/app/api/auth/security/token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : null;

  if (!token) {
    return NextResponse.json({ ok: false, message: 'Token required' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('security_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/security',
    maxAge: 43200, // 12 hours
  });
  return res;
}
```

- [ ] **Step 2: Create the logout route**

Create `web/src/app/api/auth/security/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('security_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/security',
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -20
```
Expected: ✓ Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/auth/security/token/route.ts web/src/app/api/auth/security/logout/route.ts
git commit -m "feat: add Next.js API routes for security token cookie management"
```

---

## Task 7: Middleware — replace global security_auth with scoped checkin check

**Files:**
- Modify: `web/src/middleware.ts`

- [ ] **Step 1: Read current middleware**

Read `web/src/middleware.ts` to understand the full current logic before editing.

- [ ] **Step 2: Rewrite the middleware**

Replace the contents of `web/src/middleware.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/', '/login', '/logout', '/signup',
]);

const PUBLIC_PREFIXES = ['/invitation/', '/security/event/'];

const isPublicAsset = (pathname: string): boolean => {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/favicon.ico') return true;
  return /\.[a-zA-Z0-9]+$/.test(pathname);
};

const addSecurityHeaders = (res: NextResponse): NextResponse => {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || isPublicAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    // /invitation/* — guest public pages
    // /security/event/[id] — PIN login page (public)
    // BUT /security/event/[id]/checkin/* requires security_token cookie
    const isCheckinPath = /^\/security\/event\/[^/]+\/checkin/.test(pathname);
    if (isCheckinPath) {
      const hasToken = !!req.cookies.get('security_token')?.value;
      if (!hasToken) {
        const pinPage = pathname.replace(/\/checkin.*$/, '');
        return NextResponse.redirect(new URL(pinPage, req.url));
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // All other paths require organizer JWT
  const hasJwt = !!req.cookies.get('access_token')?.value;
  if (!hasJwt) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Vary', 'Cookie');
  addSecurityHeaders(res);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -20
```
Expected: ✓ Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat: replace global security_auth with event-scoped checkin cookie check"
```

---

## Task 8: New PIN login page — /security/event/[id]

**Files:**
- Create: `web/src/app/security/event/[id]/page.tsx`

- [ ] **Step 1: Create the directory and page**

```bash
mkdir -p /Users/sparrow/Documents/Webs/youareinvited/web/src/app/security/event/\[id\]
```

Create `web/src/app/security/event/[id]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface EventInfo {
  id: string;
  name: string;
  date: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export default function SecurityEventLoginPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/events/${eventId}/public_info/`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setEventInfo)
      .catch(() => setEventInfo(null))
      .finally(() => setLoadingEvent(false));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.match(/^\d{4,6}$/)) {
      setError('PIN must be 4–6 digits.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/verify_security_pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 403
          ? 'No security PIN is configured for this event.'
          : data.detail || 'Invalid PIN. Please try again.');
        return;
      }

      const { token } = await res.json();

      // Store in sessionStorage for API calls (httpOnly cookie can't be read by JS)
      sessionStorage.setItem(`security_token_${eventId}`, token);

      // Set httpOnly cookie via Next.js route (for middleware gate)
      await fetch('/api/auth/security/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      router.push(`/security/event/${eventId}/checkin`);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Aurora background ──────────────────────────────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <Aurora />
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-10 max-w-sm w-full text-center">
          <span className="material-symbols-outlined text-red-400 text-5xl block mb-4">event_busy</span>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Event Not Found</h1>
          <p className="text-on-surface-variant text-sm">This event link is invalid or the event has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
      <Aurora />

      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <span className="font-headline italic text-brand text-2xl">youareinvited</span>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
          {/* Shield icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-container/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-brand text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
            </div>
          </div>

          {/* Event info */}
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest text-center mb-1">Security Access</p>
          <h1 className="font-headline text-2xl text-on-lp-background text-center mb-1">{eventInfo.name}</h1>
          <p className="text-xs text-on-surface-variant text-center mb-6">
            {new Date(eventInfo.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>

          {/* PIN form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN"
                autoFocus
                className="w-full h-12 rounded-xl bg-surface-container border border-outline-variant/30 px-4 text-on-surface text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock_open</span>
                  Unlock Check-In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          PIN provided by the event organizer
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -20
```
Expected: ✓ Compiled successfully, new `/security/event/[id]` route appears in output.

- [ ] **Step 3: Commit**

```bash
git add 'web/src/app/security/event/[id]/page.tsx'
git commit -m "feat: add per-event security PIN login page"
```

---

## Task 9: New check-in page — /security/event/[id]/checkin

**Files:**
- Create: `web/src/app/security/event/[id]/checkin/page.tsx`

- [ ] **Step 1: Create the directory and page**

```bash
mkdir -p '/Users/sparrow/Documents/Webs/youareinvited/web/src/app/security/event/[id]/checkin'
```

Create `web/src/app/security/event/[id]/checkin/page.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { invitationService, Invitation } from '@/lib/api';

function CheckInPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [securityToken, setSecurityToken] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Read token from sessionStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem(`security_token_${eventId}`);
    if (!token) {
      router.replace(`/security/event/${eventId}`);
      return;
    }
    setSecurityToken(token);

    // Auto-load if invitation param in URL (from QR scan)
    const qrInvitation = searchParams.get('invitation');
    if (qrInvitation) {
      setInvitationId(qrInvitation);
      loadInvitation(qrInvitation, token);
    }
  }, [eventId]);

  const loadInvitation = useCallback(async (id: string, token: string) => {
    setLoading(true);
    setInvitation(null);
    try {
      const data = await invitationService.getById(id);
      // Verify this invitation belongs to the event this token is scoped to
      if (data.event !== eventId) {
        alert('This invitation belongs to a different event.');
        setInvitationId('');
        return;
      }
      setInvitation(data);
    } catch {
      alert('Invitation not found. Check the ID and try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const handleLookUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationId.trim() || !securityToken) return;
    await loadInvitation(invitationId.trim(), securityToken);
  };

  const handleCheckIn = async () => {
    if (!invitation || invitation.checked_in || !securityToken) return;
    setCheckingIn(true);
    try {
      const updated = await invitationService.checkIn(invitation.id, securityToken);
      setInvitation(updated);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setSessionExpired(true);
        sessionStorage.removeItem(`security_token_${eventId}`);
        await fetch('/api/auth/security/logout', { method: 'POST' });
      } else {
        alert('Check-in failed. Please try again.');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(`security_token_${eventId}`);
    await fetch('/api/auth/security/logout', { method: 'POST' });
    router.push(`/security/event/${eventId}`);
  };

  const handleScanNext = () => {
    setInvitation(null);
    setInvitationId('');
  };

  // ── Aurora ─────────────────────────────────────────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  // Session expired state
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-10 max-w-sm w-full text-center">
          <span className="material-symbols-outlined text-amber-500 text-5xl block mb-4">timer_off</span>
          <h2 className="font-headline text-2xl text-on-lp-background mb-2">Session Expired</h2>
          <p className="text-on-surface-variant text-sm mb-6">Your 12-hour session has ended. Please re-enter the PIN.</p>
          <button
            onClick={() => router.push(`/security/event/${eventId}`)}
            className="w-full h-11 rounded-full bg-brand text-white font-semibold text-sm"
          >
            Re-enter PIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background">
      <Aurora />

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-brand" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
          <span className="font-headline italic text-brand text-lg">Gate Scanner</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Logout
        </button>
      </header>

      <main className="max-w-lg mx-auto px-5 pb-10 space-y-4">
        {/* Look-up form */}
        {!invitation && (
          <form onSubmit={handleLookUp} className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-6">
            <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Look Up Guest</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={invitationId}
                onChange={(e) => setInvitationId(e.target.value)}
                placeholder="Paste invitation ID"
                className="flex-1 h-11 rounded-xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                autoFocus
              />
              <button
                type="submit"
                disabled={!invitationId.trim() || loading}
                className="h-11 px-5 rounded-full bg-brand text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">search</span>
                    Find
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">QR scan auto-loads the guest via the URL parameter</p>
          </form>
        )}

        {/* Guest card */}
        {invitation && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-6">
            {/* Already checked in */}
            {invitation.checked_in ? (
              <>
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5">
                  <span className="material-symbols-outlined text-red-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700">Already Checked In</p>
                    {invitation.checked_in_at && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {new Date(invitation.checked_in_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-center text-sm font-semibold text-on-lp-background mb-1">{invitation.name}</p>
                <div className="flex justify-center gap-2 mt-2 mb-5">
                  {invitation.seat_number && (
                    <span className="text-xs bg-brand-container/40 text-brand font-semibold px-3 py-1 rounded-full">Seat {invitation.seat_number}</span>
                  )}
                  {invitation.tag && (
                    <span className="text-xs bg-secondary-container/40 text-on-surface font-semibold px-3 py-1 rounded-full">{invitation.tag}</span>
                  )}
                </div>
                <button onClick={handleScanNext} className="w-full h-11 rounded-full bg-on-lp-background text-white font-semibold text-sm">
                  Scan Next Guest
                </button>
              </>
            ) : (
              <>
                {/* Ready to check in */}
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-green-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <h2 className="font-headline text-2xl text-on-lp-background mb-1">{invitation.name}</h2>
                  <span className="inline-block text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">Ready to Check In</span>
                </div>

                <div className="flex justify-center gap-2 mb-5">
                  {invitation.seat_number && (
                    <div className="flex items-center gap-1.5 bg-brand-container/40 px-3 py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-brand text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chair</span>
                      <span className="text-sm font-semibold text-brand">Seat {invitation.seat_number}</span>
                    </div>
                  )}
                  {invitation.tag && (
                    <div className="flex items-center gap-1.5 bg-secondary-container/40 px-3 py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-on-surface text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
                      <span className="text-sm font-semibold text-on-surface">{invitation.tag}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {checkingIn ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                      Check In Guest
                    </>
                  )}
                </button>

                <button onClick={handleScanNext} className="w-full mt-3 text-xs text-on-surface-variant hover:text-on-surface text-center">
                  Cancel — scan a different guest
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SecurityCheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    }>
      <CheckInPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -20
```
Expected: ✓ Compiled successfully, `/security/event/[id]/checkin` route appears.

- [ ] **Step 3: Commit**

```bash
git add 'web/src/app/security/event/[id]/checkin/page.tsx'
git commit -m "feat: add event-scoped security check-in page"
```

---

## Task 10: Event page Security card + api.ts + remove old security files

**Files:**
- Modify: `web/src/app/events/[id]/page.tsx`
- Modify: `web/src/lib/api.ts`
- Delete: `web/src/app/security/page.tsx`, `web/src/app/security/login/page.tsx`, `web/src/app/security/check-in/[id]/page.tsx`, `web/src/app/api/auth/security/login/route.ts`, `web/src/app/security/logout/route.ts`

- [ ] **Step 1: Read the event page to understand the layout**

Read `web/src/app/events/[id]/page.tsx` in full before editing. Find:
1. Where state variables are declared (look for `const [` blocks at the top of the component)
2. Where handlers are declared (look for `const handle` functions)
3. Where the right-column sidebar is rendered — look for `lg:col-span-1` or the template card section
4. Where event data is loaded — look for the `useEffect` that calls `eventService.getById`
5. The `event` state variable type — it likely includes fields from `EventSerializer`; confirm it can accommodate the new `has_security_pin` field (it will come through automatically since the type uses `any` or a broad interface)

- [ ] **Step 2: Update api.ts — add securityToken param to checkIn**

In `web/src/lib/api.ts`, find the `checkIn` method in `invitationService` and update it to accept an optional `securityToken`:

```typescript
checkIn: (id: string, securityToken?: string) =>
  api.post(`/invitations/${id}/check_in/`, {}, {
    headers: securityToken ? { 'X-Security-Token': securityToken } : {},
  }),
```

- [ ] **Step 2: Add Security card to event page**

Read `web/src/app/events/[id]/page.tsx` to find where the right-column sidebar ends (after the template card), then add a Security card. The card goes in the right column (`lg:col-span-1`), after the existing template/info content.

Find the section with the template card in the right column and append this Security card after it (before the closing tag of the right column div):

```tsx
{/* Security Card */}
<div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5">
  <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-4">Security Access</p>

  {/* PIN input */}
  <div className="mb-3">
    <label className="text-xs text-on-surface-variant mb-1 block">Security PIN (4–6 digits)</label>
    <div className="flex gap-2">
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={securityPin}
        onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
        placeholder={securityPinSet ? '••••' : 'Set a PIN'}
        className="flex-1 h-10 rounded-xl bg-surface-container border border-outline-variant/30 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-center tracking-widest"
      />
      <button
        onClick={handleSavePin}
        disabled={savingPin || securityPin.length < 4}
        className="h-10 px-4 rounded-full bg-brand text-white text-xs font-semibold disabled:opacity-50"
      >
        {savingPin ? '...' : 'Save'}
      </button>
    </div>
  </div>

  {/* Clear button */}
  {securityPinSet && (
    <button
      onClick={handleClearPin}
      className="text-xs text-on-surface-variant hover:text-red-500 transition-colors mb-3 block"
    >
      Clear PIN
    </button>
  )}

  {/* Copy staff link */}
  <button
    onClick={handleCopyStaffLink}
    className="w-full flex items-center justify-center gap-2 h-10 rounded-full border border-outline-variant/40 text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
  >
    <span className="material-symbols-outlined text-sm">link</span>
    {staffLinkCopied ? 'Copied!' : 'Copy Staff Link'}
  </button>
  <p className="text-xs text-on-surface-variant text-center mt-2">Share this link + PIN with your security team</p>
</div>
```

Add the required state variables and handlers to the component (near the other state declarations):

```tsx
const [securityPin, setSecurityPin] = useState('');
// Initialized from event.has_security_pin (returned by EventSerializer) after event loads
const [securityPinSet, setSecurityPinSet] = useState(false);
const [savingPin, setSavingPin] = useState(false);
const [staffLinkCopied, setStaffLinkCopied] = useState(false);
```

In the `useEffect` (or wherever the event is loaded and set into state), add one line after the event data is received to initialize `securityPinSet`:

```tsx
// After: setEvent(data)  ← find this line in the existing load logic
setSecurityPinSet(Boolean(data.has_security_pin));
```

`has_security_pin` is now returned by `EventSerializer` — it is `true` if a PIN is already hashed on the event, `false` otherwise. This ensures the masked `••••` display and "Clear PIN" button appear correctly on page load.

And these handlers (near other handlers):

```tsx
const handleSavePin = async () => {
  if (securityPin.length < 4 || !event) return;
  setSavingPin(true);
  try {
    await api.post(`/events/${event.id}/set_security_pin/`, { pin: securityPin });
    setSecurityPinSet(true);
    setSecurityPin('');
  } catch {
    alert('Failed to save PIN. Please try again.');
  } finally {
    setSavingPin(false);
  }
};

const handleClearPin = async () => {
  if (!event) return;
  setSavingPin(true);
  try {
    await api.post(`/events/${event.id}/set_security_pin/`, { pin: null });
    setSecurityPinSet(false);
  } catch {
    alert('Failed to clear PIN.');
  } finally {
    setSavingPin(false);
  }
};

const handleCopyStaffLink = () => {
  if (!event) return;
  const link = `${window.location.origin}/security/event/${event.id}`;
  navigator.clipboard.writeText(link).then(() => {
    setStaffLinkCopied(true);
    setTimeout(() => setStaffLinkCopied(false), 2000);
  });
};
```

Also check if the event has an existing PIN on load — add to the existing `loadEvent` / data-fetching logic. The API doesn't return the raw PIN but returns whether one is set via `set_security_pin`. For now, assume `securityPinSet` defaults to `false` and updates when the organizer saves a new one. (A future enhancement can add a `has_security_pin` field to `EventSerializer`.)

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -25
```
Expected: ✓ Compiled successfully

If there are TypeScript errors in the event page (e.g. `api` import not available), check the existing imports at the top of the file — `api` is imported from `@/lib/api` in the existing code.

- [ ] **Step 4: Delete old security files**

```bash
rm web/src/app/security/page.tsx
rm web/src/app/security/login/page.tsx
rm -rf 'web/src/app/security/check-in'
rm web/src/app/api/auth/security/login/route.ts
rm web/src/app/security/logout/route.ts
```

- [ ] **Step 5: Verify build still passes after deletions**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/web && npm run build 2>&1 | tail -25
```
Expected: ✓ Compiled successfully — old routes gone, no import errors.

- [ ] **Step 6: Run backend tests one final time**

```bash
cd /Users/sparrow/Documents/Webs/youareinvited/backend && pytest tests/ -v
```
Expected: all passing.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/api.ts
git add 'web/src/app/events/[id]/page.tsx'
git add -A web/src/app/security/
git add web/src/app/api/auth/security/
git commit -m "feat: add Security card to event page, update api.ts, remove old security pages"
```

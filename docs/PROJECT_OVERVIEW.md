# YouAreInvited Project Overview

## What this program does

YouAreInvited is a full-stack event invitation platform.

It helps event organizers:

- create events
- upload or design invitation templates
- add guests
- generate a unique QR code for each guest
- generate a shareable e-invite image for each guest
- manage guest lists and event stats

It also helps venue staff check guests in when they arrive, and gives platform admins a separate dashboard to manage users and monitor growth.

## Who uses it

### 1. Organizers

Organizers sign up, log in, create events, add guests, and manage invitation lists.

### 2. Guests

Guests open a personalized invitation page using a unique URL. They can view their invitation, see their QR code, download the invite image, and share it through WhatsApp.

### 3. Security staff

Security staff use a password-protected check-in area to look up a guest by invitation ID or follow the QR-code link directly, then mark that guest as checked in.

### 4. Platform admins

Platform admins use a separate admin frontend to:

- see total users, events, invitations, and check-ins
- review growth over time
- view and edit user plans
- toggle watermark overrides
- inspect a user's events
- delete accounts and their data

## Main user flow

1. A visitor lands on the public homepage.
2. The organizer signs up or logs in.
3. The organizer creates an event.
4. The organizer can upload a custom invitation background and define where the guest name, guest tag, and QR code should appear on that design.
5. The organizer adds guests to the event.
6. For each guest, the backend generates:
   - a unique invitation record
   - a QR code
   - a personalized e-invite image
   - a public invitation URL
7. The guest opens their invitation page and presents the QR code at the venue.
8. Security opens the check-in page from the QR code or enters the invitation ID manually.
9. Security confirms the guest and checks them in.
10. The organizer and platform admin can monitor progress through dashboards and stats.

## What the system stores

The core data model is:

- `User`
  - organizer account
- `UserProfile`
  - plan (`free` or `pro`)
  - watermark override
- `Event`
  - event name, date, description
  - optional background image template
  - saved placement zones for QR code, name, and tag
- `Invitation`
  - guest name
  - seat number
  - guest tag/category
  - QR code image
  - e-invite image
  - checked-in state and timestamp

## Main parts of the repo

### `web/`

This is the main Next.js app for:

- the public homepage
- organizer sign up and login
- organizer dashboard
- event creation and guest management
- guest invitation pages
- security login and check-in screens

### `admin/`

This is a separate Next.js app for platform administration.

It is intended for staff users and focuses on:

- platform KPIs
- user management
- plan management
- watermark controls

### `backend/`

This is the Django + Django REST Framework backend.

It is responsible for:

- authentication
- event and invitation APIs
- QR code generation
- e-invite image generation
- check-in status tracking
- platform admin APIs
- media storage using local files or Cloudinary

## Important behaviors

- The homepage is public.
- Organizer pages like `/dashboard` and `/events/...` require login.
- Guest invitation pages are public so invite links can be opened directly.
- Security pages require a separate security password in the web app.
- QR codes point to the security check-in flow, not just the guest invitation page.
- The backend can place dynamic guest data onto an uploaded invitation design.
- Free/pro plan data exists at the user profile level, and watermark behavior is tied to that profile.

## Outputs the program generates

For each invitation, the system can generate:

- a unique guest-facing invitation URL
- a unique security check-in URL
- a QR code image
- a personalized invitation image
- a WhatsApp share link

## In one sentence

This program is an event invitation and venue check-in system that lets organizers create branded digital invitations, lets guests access them through unique links and QR codes, lets security verify arrivals, and lets platform admins manage the whole system.

# Event Invitation System

A full-stack web application for managing event invitations with QR codes, built with Next.js and Django.

## Features

- 🎫 Create personalized invitations with name, seat number, and category tags
- 📱 Automatic QR code generation for each invitation
- 🖼️ Beautiful e-invite images with embedded QR codes
- ✅ One-way check-in system (guests can check in, but only admins can undo)
- 💬 WhatsApp sharing integration
- 📊 Admin dashboard with real-time statistics
- 🎨 Modern, responsive UI with Tailwind CSS

## Tech Stack

### Frontend
- **Next.js 14** (React framework)
- **TypeScript**
- **Tailwind CSS**
- **Axios** for API calls
- **React Icons**

### Backend
- **Django 5.0**
- **Django REST Framework**
- **SQLite** (easily replaceable with PostgreSQL/MySQL)
- **Pillow** for image processing
- **qrcode** for QR code generation

## Project Structure

```
invitation-system/
├── backend/
│   ├── invitation_backend/     # Django project settings
│   │   ├── settings.py
│   │   └── urls.py
│   ├── invitations/            # Main app
│   │   ├── models.py           # Invitation model
│   │   ├── serializers.py      # DRF serializers
│   │   ├── views.py            # API endpoints
│   │   ├── admin.py            # Django admin config
│   │   └── urls.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx            # Home page
    │   │   ├── admin/              # Admin dashboard
    │   │   └── invitation/[id]/    # Guest invitation page
    │   └── lib/
    │       └── api.ts              # API service
    ├── package.json
    └── next.config.js
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (for admin access):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start Django server:**
   ```bash
   python manage.py runserver
   ```

Backend will run at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

Frontend will run at `http://localhost:3000`

## Usage Guide

### For Event Organizers (Admin)

1. **Access Admin Dashboard:**
   - Go to `http://localhost:3000/admin`
   - Or use Django admin at `http://localhost:8000/admin`

2. **Create Invitation:**
   - Click "Create Invitation"
   - Enter guest name, seat number, and category/tag
   - System automatically generates:
     - Unique invitation page
     - QR code
     - Shareable e-invite image

3. **Manage Guests:**
   - View all invitations in a table
   - Track check-in status
   - Edit guest details
   - Undo check-ins (admin only)
   - Delete invitations

4. **View Statistics:**
   - Total invitations
   - Checked-in count
   - Pending count
   - Check-in rate percentage

### For Guests

1. **Access Invitation:**
   - Open unique URL: `http://localhost:3000/invitation/{unique-id}`
   - Or scan QR code from e-invite image

2. **View Invitation:**
   - See personalized welcome message
   - View seat number and category
   - See QR code for venue check-in

3. **Check In:**
   - Click "Check In Now" button
   - Confirm action (cannot be undone by guest)
   - See check-in confirmation with timestamp

4. **Share Invitation:**
   - Share via WhatsApp button
   - Download e-invite image
   - Forward QR code

## API Endpoints

### Invitations
- `GET /api/invitations/` - List all invitations
- `POST /api/invitations/` - Create new invitation
- `GET /api/invitations/{id}/` - Get specific invitation
- `PATCH /api/invitations/{id}/` - Update invitation
- `DELETE /api/invitations/{id}/` - Delete invitation
- `POST /api/invitations/{id}/check_in/` - Check in guest
- `POST /api/invitations/{id}/admin_undo_check_in/` - Undo check-in (admin)
- `GET /api/invitations/{id}/regenerate_images/` - Regenerate QR & e-invite
- `GET /api/invitations/stats/` - Get statistics

## Configuration

### Backend Configuration

Set these env vars in the `backend` Vercel project:

```env
SECRET_KEY=your-secret-key-here
DEBUG=False
BACKEND_URL=https://backend.v0.youare-invited.com
ALLOWED_HOSTS=127.0.0.1,localhost,.vercel.app,backend.v0.youare-invited.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://www.youare-invited.com
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://www.youare-invited.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Frontend Configuration

Create `.env.local` in `web/` for local development:

```env
BACKEND_URL=http://127.0.0.1:8000
```

For production:

```env
BACKEND_URL=https://backend.v0.youare-invited.com
```

Leave `NEXT_PUBLIC_API_URL` unset in production. The browser should call
`https://www.youare-invited.com/api/...`, and the web Vercel project will rewrite
that to `BACKEND_URL` server-side. Seeing the web-domain `/api/...` request in
DevTools is expected.

## Customization

### E-Invite Design

Edit `backend/invitations/models.py`, `generate_e_invite()` method:
- Change colors
- Modify layout
- Add event details (date, time, venue)
- Change fonts
- Add logo/images

### Frontend Styling

Edit `frontend/tailwind.config.js` for colors:
```js
theme: {
  extend: {
    colors: {
      primary: '#1a1a2e',    // Main background
      secondary: '#16213e',   // Secondary background
      accent: '#e94560',      // Accent/CTA color
      light: '#a8dadc',       // Light text
    },
  },
}
```

## Deployment

### Backend (Django)
- Deploy to: DigitalOcean, Heroku, AWS, etc.
- Use Gunicorn as WSGI server
- Set up PostgreSQL database
- Configure static/media file serving (S3, Cloudinary)

### Frontend (Next.js)
- Deploy to: Vercel, Netlify, AWS Amplify
- Set environment variables
- Configure API URL

## Security Considerations

1. **Change SECRET_KEY** in production
2. **Add authentication** for admin endpoints
3. **Set up HTTPS** for production
4. **Configure CORS** properly
5. **Rate limiting** for API endpoints
6. **Input validation** and sanitization

## Future Enhancements

- [ ] Email notifications
- [ ] SMS reminders
- [ ] Multiple event support
- [ ] Custom invitation templates
- [ ] Bulk import from CSV
- [ ] Guest RSVP functionality
- [ ] Table/seating arrangement view
- [ ] Analytics and reporting
- [ ] Multi-language support

## Troubleshooting

### QR Codes not generating
- Ensure Pillow is installed correctly
- Check media directory permissions
- Verify MEDIA_ROOT and MEDIA_URL settings

### CORS errors
- Check CORS_ALLOWED_ORIGINS in Django settings
- Verify frontend URL matches allowed origins

### Images not loading
- Ensure Django server is running
- Check media files are being served (DEBUG=True for dev)
- Verify image paths in API responses

## License

MIT License - Feel free to use this for your events!

## Support

For issues or questions, please create an issue in the repository.

# Quick Start Guide

## Setup in 5 Minutes

### 1. Backend Setup (Terminal 1)

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate
# Or on Windows:
# venv\Scripts\activate

# Install packages
pip install -r requirements.txt

# Setup database
python manage.py makemigrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# Username: admin
# Email: admin@example.com
# Password: (choose a password)

# Start server
python manage.py runserver
```

✅ Backend running at http://localhost:8000

### 2. Frontend Setup (Terminal 2)

```bash
cd frontend

# Install packages
npm install

# Start dev server
npm run dev
```

✅ Frontend running at http://localhost:3000

## Test It Out

1. **Visit Home**: http://localhost:3000
2. **Go to Admin**: http://localhost:3000/admin
3. **Create an Invitation**:
   - Name: John Doe
   - Seat: A-15
   - Tag: VIP

4. **View Invitation**: Click "View" on the created invitation
5. **Test Check-in**: Click "Check In Now"
6. **Share**: Try the WhatsApp share button

## Default URLs

- **Frontend Home**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Django Admin**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/invitations/

## Common Issues

### Backend won't start
```bash
# Make sure you're in the venv
source venv/bin/activate
# Check if Django is installed
python -c "import django; print(django.__version__)"
```

### Frontend won't start
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Images not showing
- Make sure Django server is running on port 8000
- Check `backend/media/` directory exists
- Run migrations again if needed

## What's Next?

1. Customize the e-invite design in `backend/invitations/models.py`
2. Change colors in `frontend/tailwind.config.js`
3. Add your event details to the invitation template
4. Test with multiple invitations
5. Deploy to production!

## Need Help?

Check the main README.md for detailed documentation.

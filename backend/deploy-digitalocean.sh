#!/bin/bash
# DigitalOcean Droplet Deployment Script for Django Backend
# Run this on your backend Droplet after initial setup

set -e

echo "🚀 Deploying YouAreInvited Backend to DigitalOcean..."

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    postgresql-client \
    git \
    supervisor \
    nginx

# Clone repository
if [ ! -d "/app/youareinvited" ]; then
    echo "📥 Cloning repository..."
    sudo mkdir -p /app
    sudo git clone https://github.com/YOUR_USERNAME/youareinvited.git /app/youareinvited
else
    echo "✅ Repository already exists, pulling latest..."
    cd /app/youareinvited && sudo git pull
fi

# Create Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd /app/youareinvited/backend
sudo python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
sudo venv/bin/pip install --upgrade pip
sudo venv/bin/pip install -r requirements.txt

# Create .env file (edit with your values)
echo "📝 Creating .env file..."
sudo tee /app/youareinvited/backend/.env > /dev/null <<EOF
DIGITALOCEAN=True
DEBUG=False
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
DATABASE_URL=postgresql://username:password@your-postgres-ip:5432/youareinvited
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,your-backend-ip
BACKEND_URL=https://your-domain.com
FRONTEND_URL=https://your-frontend-domain.com
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
USE_S3_STORAGE=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
EOF

echo "⚠️  IMPORTANT: Edit /app/youareinvited/backend/.env with your actual values!"
echo "   - DATABASE_URL (PostgreSQL connection)"
echo "   - AWS credentials"
echo "   - Domain names"

# Run migrations
echo "🗄️  Running database migrations..."
cd /app/youareinvited/backend
source venv/bin/activate
python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create gunicorn systemd service
echo "⚙️  Setting up Gunicorn service..."
sudo tee /etc/systemd/system/youareinvited-backend.service > /dev/null <<EOF
[Unit]
Description=YouAreInvited Django Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/app/youareinvited/backend
Environment="PATH=/app/youareinvited/backend/venv/bin"
EnvironmentFile=/app/youareinvited/backend/.env
ExecStart=/app/youareinvited/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind unix:/run/youareinvited-backend.sock \
    api.wsgi:application

Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable youareinvited-backend
sudo systemctl start youareinvited-backend

# Configure Nginx reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/youareinvited-backend > /dev/null <<EOF
upstream youareinvited_backend {
    server unix:/run/youareinvited-backend.sock fail_timeout=0;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://youareinvited_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/youareinvited-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Install SSL certificate (Let's Encrypt)
echo "🔒 Installing SSL certificate..."
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit /app/youareinvited/backend/.env with your actual values"
echo "   2. Run: sudo systemctl restart youareinvited-backend"
echo "   3. Check status: sudo systemctl status youareinvited-backend"
echo "   4. View logs: sudo journalctl -u youareinvited-backend -f"
echo "   5. Update DNS to point to this Droplet's IP"
echo "   6. Renew SSL: sudo certbot renew (automatic)"
echo ""

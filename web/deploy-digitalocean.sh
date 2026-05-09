#!/bin/bash
# DigitalOcean Droplet Deployment Script for Next.js Frontend
# Run this on your frontend Droplet after initial setup

set -e

echo "🚀 Deploying YouAreInvited Frontend to DigitalOcean..."

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
echo "📦 Installing dependencies..."
sudo apt install -y git supervisor nginx

# Clone repository
if [ ! -d "/app/youareinvited" ]; then
    echo "📥 Cloning repository..."
    sudo mkdir -p /app
    sudo git clone https://github.com/YOUR_USERNAME/youareinvited.git /app/youareinvited
else
    echo "✅ Repository already exists, pulling latest..."
    cd /app/youareinvited && sudo git pull
fi

# Install Node dependencies
echo "📦 Installing Node dependencies..."
cd /app/youareinvited/web
sudo npm install

# Create .env.production file
echo "📝 Creating .env.production file..."
sudo tee /app/youareinvited/web/.env.production > /dev/null <<EOF
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com
NODE_ENV=production
EOF

echo "⚠️  IMPORTANT: Edit /app/youareinvited/web/.env.production with your actual values!"
echo "   - NEXT_PUBLIC_API_URL (your backend domain)"
echo "   - NEXT_PUBLIC_FRONTEND_URL (your frontend domain)"

# Build Next.js app
echo "🔨 Building Next.js application..."
cd /app/youareinvited/web
sudo npm run build

# Create next.js systemd service
echo "⚙️  Setting up Next.js service..."
sudo tee /etc/systemd/system/youareinvited-frontend.service > /dev/null <<EOF
[Unit]
Description=YouAreInvited Next.js Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/app/youareinvited/web
EnvironmentFile=/app/youareinvited/web/.env.production
ExecStart=/usr/bin/npm start

Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable youareinvited-frontend
sudo systemctl start youareinvited-frontend

# Configure Nginx reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/youareinvited-frontend > /dev/null <<EOF
upstream youareinvited_frontend {
    server 127.0.0.1:3000 fail_timeout=0;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://youareinvited_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location /_next/static {
        proxy_cache_valid 60m;
        proxy_pass http://youareinvited_frontend;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/youareinvited-frontend /etc/nginx/sites-enabled/
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
echo "   1. Edit /app/youareinvited/web/.env.production with your actual values"
echo "   2. Run: sudo systemctl restart youareinvited-frontend"
echo "   3. Check status: sudo systemctl status youareinvited-frontend"
echo "   4. View logs: sudo journalctl -u youareinvited-frontend -f"
echo "   5. Update DNS to point to this Droplet's IP"
echo "   6. Renew SSL: sudo certbot renew (automatic)"
echo ""

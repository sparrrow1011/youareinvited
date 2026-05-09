# Docker Deployment Guide

Deploy YouAreInvited using Docker Compose on a single DigitalOcean Droplet.

## Prerequisites

- DigitalOcean Droplet (Ubuntu 22.04, $6-12/month)
- 2GB+ RAM, 2GB+ storage
- Docker and Docker Compose installed

## Step 1: Create a DigitalOcean Droplet

1. Go to [DigitalOcean.com](https://www.digitalocean.com)
2. Create Droplet with:
   - **Image:** Ubuntu 22.04 x64
   - **Size:** $6+/month (1GB RAM minimum, 2GB recommended)
   - **Region:** Closest to you

## Step 2: Connect to Droplet

```bash
ssh root@your-droplet-ip
```

## Step 3: Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Step 4: Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/youareinvited.git
cd youareinvited
```

## Step 5: Configure Environment

```bash
# Copy example to actual .env
cp .env.example .env

# Edit with your actual values
nano .env
```

**Required values:**
```
DB_PASSWORD=your-secure-password
SECRET_KEY=generate-with: python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,your-droplet-ip
BACKEND_URL=https://yourdomain.com (or http://your-droplet-ip:8000)
FRONTEND_URL=https://yourdomain.com (or http://your-droplet-ip:3000)
AWS_ACCESS_KEY_ID=your-key (or leave blank to use local storage)
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
```

## Step 6: Build and Start Containers

```bash
# Build images
docker-compose build

# Start all services (postgres, backend, frontend)
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Output should show:**
```
youareinvited-postgres    Up (healthy)
youareinvited-backend     Up
youareinvited-frontend    Up
```

## Step 7: Create Admin User

```bash
# Enter backend container
docker-compose exec backend bash

# Create superuser
python manage.py createsuperuser

# Exit container
exit
```

## Step 8: Setup Nginx Reverse Proxy (Optional)

For domain routing and SSL:

```bash
# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/youareinvited << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/youareinvited /etc/nginx/sites-enabled/

# Test and restart
nginx -t
systemctl restart nginx

# Setup SSL (Let's Encrypt)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 9: Verify Services

### Access Your App

- **Frontend:** http://your-droplet-ip:3000 (or https://yourdomain.com)
- **Backend API:** http://your-droplet-ip:8000 (or https://api.yourdomain.com)
- **Django Admin:** http://your-droplet-ip:8000/admin/ (use superuser credentials)

### Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Check Service Health

```bash
# SSH into Droplet
ssh root@your-droplet-ip

# Enter backend
docker-compose exec backend bash

# Check database connection
python manage.py shell
>>> from django.db import connection
>>> connection.cursor()  # If no error, DB is connected
>>> exit()

# Exit container
exit
```

## Common Commands

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Full rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50

# Specific service
docker-compose logs -f backend
```

### Database Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U youareinvited youareinvited > backup.sql

# Restore database
docker-compose exec -T postgres psql -U youareinvited youareinvited < backup.sql
```

### Update Code

```bash
# Pull latest from GitHub
git pull

# Rebuild containers
docker-compose build

# Restart
docker-compose up -d
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Rebuild
docker-compose down
docker-compose build
docker-compose up -d
```

### Database connection error

```bash
# Check postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Port already in use

```bash
# Check what's using the port
netstat -tuln | grep 8000

# Change ports in docker-compose.yml
# Change "8000:8000" to "8001:8000" etc
nano docker-compose.yml
docker-compose up -d
```

### Migrations not running

```bash
# Manually run migrations
docker-compose exec backend python manage.py migrate

# Check migration status
docker-compose exec backend python manage.py showmigrations
```

## Monitoring

### Check Resource Usage

```bash
# SSH to droplet
ssh root@your-droplet-ip

# Check CPU/Memory
docker stats

# Check disk space
df -h

# Check Docker volumes
docker volume ls
docker volume inspect youareinvited_postgres_data
```

### Auto-restart on Droplet Reboot

```bash
# Ensure Docker starts on boot
systemctl enable docker

# Services auto-restart with "restart: unless-stopped" policy
# (already configured in docker-compose.yml)
```

## File Locations

```
/root/youareinvited/
├── .env                    # Your environment variables
├── docker-compose.yml      # Docker services
├── backend/
│   ├── Dockerfile
│   ├── api/
│   │   └── settings.py
│   └── manage.py
├── web/
│   ├── Dockerfile
│   └── src/
└── DOCKER_DEPLOYMENT.md    # This file
```

## Security Notes

1. **Change default passwords** in `.env` file
2. **Use strong SECRET_KEY** (generate with `python3 -c 'import secrets; print(secrets.token_urlsafe(50))'`)
3. **Set DEBUG=False** in production
4. **Use HTTPS** with Let's Encrypt SSL
5. **Restrict SSH** to your IP (via DigitalOcean firewall)
6. **Regular backups** of database and media files
7. **Keep Docker images updated** (`docker-compose pull && docker-compose up -d`)

## Cost Breakdown

- **Droplet:** $6-12/month (1GB RAM)
- **Domain:** ~$10/year (from registrar)
- **Total:** ~$7-13/month all-in

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify .env configuration
3. Check DigitalOcean Droplet resources (disk, RAM)
4. Rebuild: `docker-compose down && docker-compose build && docker-compose up -d`

Happy deploying! 🚀

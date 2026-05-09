# DigitalOcean Deployment Guide

This guide walks you through deploying YouAreInvited to DigitalOcean Droplets (VPS).

## Prerequisites

- DigitalOcean account
- GitHub account with your repository
- Domain name (optional but recommended)

## Cost Estimate

- Backend Droplet: $5/month
- Frontend Droplet: $5/month
- PostgreSQL Droplet: $5/month
- **Total: $15/month**

## Step 1: Create Droplets

### 1a. Create Backend Droplet
1. Go to [DigitalOcean.com](https://www.digitalocean.com)
2. Click **Create** → **Droplet**
3. Choose:
   - **Image:** Ubuntu 22.04 x64
   - **Size:** $5/month (512MB RAM, 1 vCPU)
   - **Region:** Closest to you
   - **VPC Network:** Create new
   - **Hostname:** `youareinvited-backend`
4. Click **Create Droplet**

### 1b. Create Frontend Droplet
Repeat above for frontend with:
- **Hostname:** `youareinvited-frontend`

### 1c. Create PostgreSQL Droplet
Repeat above for PostgreSQL with:
- **Hostname:** `youareinvited-postgres`

## Step 2: Setup PostgreSQL Droplet

### Connect to PostgreSQL Droplet

```bash
ssh root@your-postgres-ip
```

### Run Deployment Script

```bash
# Download script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/youareinvited/main/backend/deploy-postgresql-droplet.sh

# Make executable
chmod +x deploy-postgresql-droplet.sh

# Run
./deploy-postgresql-droplet.sh
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE youareinvited;
CREATE USER youareinvited WITH PASSWORD 'your-secure-password';
ALTER ROLE youareinvited SET client_encoding TO 'utf8';
ALTER ROLE youareinvited SET default_transaction_isolation TO 'read committed';
ALTER ROLE youareinvited SET default_transaction_deferrable TO on;
ALTER ROLE youareinvited SET default_transaction_read_committed TO on;
GRANT ALL PRIVILEGES ON DATABASE youareinvited TO youareinvited;
EOF

# Allow remote connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '0.0.0.0'/" /etc/postgresql/*/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Get your PostgreSQL connection string:**
```
postgresql://youareinvited:your-secure-password@postgres-droplet-ip:5432/youareinvited
```

## Step 3: Setup Backend Droplet

### Connect to Backend Droplet

```bash
ssh root@your-backend-ip
```

### Download and Run Deployment Script

```bash
# Download script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/youareinvited/main/backend/deploy-digitalocean.sh

# Make executable
chmod +x deploy-digitalocean.sh

# Run
./deploy-digitalocean.sh
```

### Edit Configuration

After running the script:

```bash
# Edit .env file with your values
sudo nano /app/youareinvited/backend/.env
```

Update these values:
```
DATABASE_URL=postgresql://youareinvited:password@postgres-droplet-ip:5432/youareinvited
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,backend-droplet-ip
BACKEND_URL=https://api.your-domain.com (or http://backend-droplet-ip:8000)
FRONTEND_URL=https://your-domain.com
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
CLOUDINARY_URL=your-cloudinary-url (if using)
TWILIO_ACCOUNT_SID=your-twilio-sid (if using)
TWILIO_AUTH_TOKEN=your-twilio-token (if using)
```

### Restart Services

```bash
# Restart backend service
sudo systemctl restart youareinvited-backend

# Check status
sudo systemctl status youareinvited-backend

# View logs
sudo journalctl -u youareinvited-backend -f
```

## Step 4: Setup Frontend Droplet

### Connect to Frontend Droplet

```bash
ssh root@your-frontend-ip
```

### Download and Run Deployment Script

```bash
# Download script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/youareinvited/main/web/deploy-digitalocean.sh

# Make executable
chmod +x deploy-digitalocean.sh

# Run
./deploy-digitalocean.sh
```

### Edit Configuration

```bash
# Edit .env.production file
sudo nano /app/youareinvited/web/.env.production
```

Update:
```
NEXT_PUBLIC_API_URL=https://api.your-domain.com (or http://backend-ip:8000)
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com (or http://frontend-ip)
```

### Restart Services

```bash
sudo systemctl restart youareinvited-frontend
sudo systemctl status youareinvited-frontend
sudo journalctl -u youareinvited-frontend -f
```

## Step 5: Configure Networking

### Enable Private Network (DigitalOcean VPC)

1. Go to DigitalOcean dashboard
2. Click **Networking** → **VPC**
3. Add all three Droplets to the same VPC
4. Update DATABASE_URL to use private IP:
   ```
   postgresql://youareinvited:password@postgres-private-ip:5432/youareinvited
   ```
5. Update BACKEND_URL to use private IP:
   ```
   http://backend-private-ip:8000
   ```

### Configure Firewall (Optional but Recommended)

1. Go to **Networking** → **Firewalls**
2. Create new firewall
3. Allow:
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
   - SSH (22) from your IP only
   - PostgreSQL (5432) from backend droplet only
4. Apply to all three droplets

## Step 6: Setup Domain & SSL

### Point Domain to Frontend

1. Get frontend droplet IP
2. Go to your domain registrar
3. Add A record: `@ → frontend-droplet-ip`
4. Add A record: `www → frontend-droplet-ip`

### Setup SSL Certificate

SSL was auto-installed by deployment script using Let's Encrypt.

**Check certificate status:**
```bash
sudo certbot certificates
```

**Manual renewal:**
```bash
sudo certbot renew
```

Renewal runs automatically daily.

## Step 7: Verify Deployment

### Check Backend

```bash
# SSH to backend droplet
ssh root@backend-ip

# Check service status
sudo systemctl status youareinvited-backend

# View logs
sudo journalctl -u youareinvited-backend -n 50

# Test Django admin
curl http://localhost:8000/admin/
```

### Check Frontend

```bash
# SSH to frontend droplet
ssh root@frontend-ip

# Check service status
sudo systemctl status youareinvited-frontend

# View logs
sudo journalctl -u youareinvited-frontend -n 50

# Test Next.js
curl http://localhost:3000/
```

### Check Database

```bash
# SSH to postgres droplet
ssh root@postgres-ip

# Connect to PostgreSQL
sudo -u postgres psql youareinvited

# Check tables
\dt

# Exit
\q
```

## Common Commands

### View Logs

```bash
# Backend logs
sudo journalctl -u youareinvited-backend -f

# Frontend logs
sudo journalctl -u youareinvited-frontend -f

# System logs
sudo journalctl -xe
```

### Restart Services

```bash
# Restart all
sudo systemctl restart youareinvited-backend
sudo systemctl restart youareinvited-frontend

# Or specific
sudo systemctl restart youareinvited-backend
```

### Update Code

```bash
# SSH to the droplet
ssh root@your-ip

# Pull latest code
cd /app/youareinvited
sudo git pull

# For backend updates
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
sudo systemctl restart youareinvited-backend

# For frontend updates
cd ../web
npm install
npm run build
sudo systemctl restart youareinvited-frontend
```

### Monitor Resources

```bash
# SSH to droplet
ssh root@your-ip

# Check CPU and memory
htop

# Check disk usage
df -h

# Check logs for errors
sudo journalctl -p err -n 50
```

## Troubleshooting

### Backend not responding

```bash
sudo systemctl status youareinvited-backend
sudo journalctl -u youareinvited-backend -n 100
sudo systemctl restart youareinvited-backend
```

### Frontend not loading

```bash
sudo systemctl status youareinvited-frontend
sudo journalctl -u youareinvited-frontend -n 100
sudo systemctl restart youareinvited-frontend
```

### Database connection error

1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL is correct
3. Check firewall allows connection
4. Verify database and user exist

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
sudo certbot renew

# View SSL logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Scaling & Optimization

### When to upgrade

- **Backend:** If CPU > 80% consistently, upgrade to $10/mo (1GB RAM)
- **Frontend:** If CPU > 80% consistently, upgrade to $10/mo (1GB RAM)
- **Database:** If storage > 80%, upgrade to $10/mo or add volume

### Auto-scaling setup (optional)

DigitalOcean doesn't offer auto-scaling for Droplets. For auto-scaling, consider:
- Kubernetes (DigitalOcean DOKS)
- Railway (easier)
- Heroku

## Backup Strategy

### Manual backups

```bash
# Backup database
ssh root@postgres-ip
sudo -u postgres pg_dump youareinvited > youareinvited-backup.sql
scp root@postgres-ip:youareinvited-backup.sql .

# Backup media files (if not on S3)
ssh root@backend-ip
tar -czf media-backup.tar.gz /app/youareinvited/backend/media
scp root@backend-ip:media-backup.tar.gz .
```

### DigitalOcean automated backups

1. Go to Droplet settings
2. Enable **Backups**
3. Backups cost $0.20/month per droplet

## Additional Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com)
- [Django Deployment Guide](https://docs.djangoproject.com/en/5.0/howto/deployment/)
- [Next.js Production Guide](https://nextjs.org/docs/deployment/static-exports)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## Support

For issues:
1. Check logs: `sudo journalctl -u service-name -n 100`
2. Verify configuration files
3. Check DigitalOcean status page
4. Post issue on GitHub

Happy deploying! 🚀

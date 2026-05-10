#!/bin/bash
# ============================================================
# YouAreInvited — Production Deploy Script
# Target: root@178.128.164.135
# Usage:  ./deploy.sh
# ============================================================

set -e

DROPLET_IP="178.128.164.135"
DROPLET_USER="root"
APP_DIR="/app/youareinvited"
BACKEND_DOMAIN="backend.v0.youare-invited.com"
FRONTEND_DOMAIN="youare-invited.com"
CERTBOT_EMAIL="babalolasgn@gmail.com"

# ── Pre-flight checks ────────────────────────────────────────
if [ ! -f ".env.prod" ]; then
  echo ""
  echo "❌  .env.prod not found."
  echo "    Copy .env.prod.example → .env.prod and fill in your values."
  echo ""
  echo "    cp .env.prod.example .env.prod && nano .env.prod"
  echo ""
  exit 1
fi

echo ""
echo "🚀  Deploying YouAreInvited to ${DROPLET_IP}..."
echo ""

# ── 1. Create remote directory ───────────────────────────────
echo "📁  Creating remote directory..."
ssh ${DROPLET_USER}@${DROPLET_IP} "mkdir -p ${APP_DIR}"

# ── 2. Sync code ─────────────────────────────────────────────
echo "📦  Syncing code..."
rsync -az --progress \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude '.env.prod' \
  --exclude '.env.prod.example' \
  --exclude 'backend/.env' \
  --exclude 'web/.env.local' \
  --exclude 'postgres_data' \
  --exclude '.worktrees' \
  ./ ${DROPLET_USER}@${DROPLET_IP}:${APP_DIR}/

# ── 2. Upload production env ──────────────────────────────────
echo "🔑  Uploading .env.prod..."
scp .env.prod ${DROPLET_USER}@${DROPLET_IP}:${APP_DIR}/.env

# ── 3. Remote setup + deploy ──────────────────────────────────
echo "🔧  Running remote setup..."
ssh ${DROPLET_USER}@${DROPLET_IP} bash << REMOTE
set -e

APP_DIR="${APP_DIR}"
BACKEND_DOMAIN="${BACKEND_DOMAIN}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN}"
CERTBOT_EMAIL="${CERTBOT_EMAIL}"

echo ""
echo "──────────────────────────────────────────"
echo "  Server: \$(hostname) (\$(date))"
echo "──────────────────────────────────────────"

# ── Swap file (prevents OOM kills during docker build) ────────
if [ ! -f /swapfile ]; then
  echo "💾  Creating 2GB swap file..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "✅  Swap enabled."
else
  echo "✅  Swap already configured."
fi

# ── Install Docker ────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "🐳  Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "✅  Docker already installed."
fi

# ── Install Docker Compose plugin ────────────────────────────
if ! docker compose version &>/dev/null 2>&1; then
  echo "📦  Installing Docker Compose plugin..."
  apt-get update -qq
  apt-get install -y docker-compose-plugin
else
  echo "✅  Docker Compose already installed."
fi

# ── Install nginx ─────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "🌐  Installing nginx..."
  apt-get update -qq
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
else
  echo "✅  nginx already installed."
fi

# ── Install certbot ───────────────────────────────────────────
if ! command -v certbot &>/dev/null; then
  echo "🔒  Installing certbot..."
  apt-get update -qq
  apt-get install -y certbot python3-certbot-nginx
else
  echo "✅  certbot already installed."
fi

# ── nginx config ──────────────────────────────────────────────
echo "🌐  Configuring nginx..."
cp \${APP_DIR}/nginx/backend.conf  /etc/nginx/sites-available/youareinvited-backend
ln -sf /etc/nginx/sites-available/youareinvited-backend  /etc/nginx/sites-enabled/youareinvited-backend
# Frontend is on Vercel — no nginx config needed for it
rm -f /etc/nginx/sites-enabled/youareinvited-frontend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── Build backend image ───────────────────────────────────────
# (Frontend runs on Vercel — not built here)
echo "🐳  Building backend image..."
cd \${APP_DIR}
docker compose -f docker-compose.prod.yml build backend

# ── Start / restart containers ────────────────────────────────
echo "▶️   Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# ── Wait for backend to be ready ─────────────────────────────
echo "⏳  Waiting for backend to start..."
for i in \$(seq 1 30); do
  if curl -sf http://127.0.0.1:8000 > /dev/null 2>&1; then
    echo "✅  Backend is up."
    break
  fi
  sleep 3
done

# ── SSL certificates ──────────────────────────────────────────
if [ ! -d "/etc/letsencrypt/live/\${BACKEND_DOMAIN}" ]; then
  echo "🔒  Obtaining SSL for \${BACKEND_DOMAIN}..."
  certbot --nginx -d \${BACKEND_DOMAIN} \
    --non-interactive --agree-tos -m \${CERTBOT_EMAIL} --redirect
else
  echo "✅  SSL already configured for \${BACKEND_DOMAIN}."
fi

# Frontend is on Vercel — no SSL cert needed here for the frontend domain.

systemctl reload nginx

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  ✅  Deployment complete!"
echo ""
echo "  Frontend : https://\${FRONTEND_DOMAIN}"
echo "  Backend  : https://\${BACKEND_DOMAIN}"
echo ""
echo "  Container status:"
docker compose -f \${APP_DIR}/docker-compose.prod.yml ps
echo "════════════════════════════════════════════"
echo ""
REMOTE

echo ""
echo "🎉  Done! Your app is live."
echo ""
echo "    Frontend : https://${FRONTEND_DOMAIN}"
echo "    Backend  : https://${BACKEND_DOMAIN}"
echo ""
echo "  Useful remote commands:"
echo "    ssh root@${DROPLET_IP} 'docker logs youareinvited-backend --tail 50'"
echo "    ssh root@${DROPLET_IP} 'docker logs youareinvited-frontend --tail 50'"
echo "    ssh root@${DROPLET_IP} 'docker compose -f ${APP_DIR}/docker-compose.prod.yml ps'"
echo ""

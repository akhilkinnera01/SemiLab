# SemiLab - On-Premises Deployment Guide
**Deployment Type:** Docker (Local/On-Premises)
**Status:** Ready for Day 7 deployment
**Target:** Self-hosted lab environment

---

## 🎯 What You'll Get

A fully self-contained SemiLab instance running on your infrastructure:
- ✅ Frontend (React web UI)
- ✅ Backend (NestJS API)
- ✅ Database (PostgreSQL)
- ✅ Cache (Redis)
- ✅ All in Docker containers

---

## 🔧 Prerequisites

### For Your Server

**Minimum:**
- Linux server (Ubuntu 20.04+ recommended)
- 4GB RAM
- 20GB disk space
- Docker & Docker Compose installed

**Recommended:**
- Ubuntu 22.04 LTS
- 8GB RAM
- 50GB disk space
- Docker 24+, Docker Compose 2.x

### Docker Installation (if needed)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📦 Deployment Steps (Day 7)

### Step 1: Clone Repository to Your Server

```bash
# On your server
cd /opt  # or your preferred location
git clone https://github.com/akhilkinnera01/SemiLab.git
cd SemiLab
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp src/backend/.env.example src/backend/.env

# Edit for your environment
nano src/backend/.env

# Key settings to update:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres:5432/semilab"
# JWT_SECRET="Change this to something secure"
# CORS_ORIGIN="http://your-server-ip:3000,http://your-domain.com"
# NODE_ENV="production"
```

### Step 3: Update Docker Compose

```bash
# Update docker-compose.yml for production
# Change postgres password
# Set proper volumes
# Configure network if needed
```

### Step 4: Start Services

```bash
# Start all services
docker-compose up -d

# Verify services running
docker-compose ps

# You should see:
# - semilab-db (PostgreSQL)
# - semilab-redis (Redis)
# - semilab-backend (API)
# - semilab-frontend (React UI)
```

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Create test user (optional)
docker-compose exec backend npm run seed
```

### Step 6: Access SemiLab

```
Frontend: http://your-server-ip:3000
API: http://your-server-ip:3000/api
```

---

## 🐳 Docker Compose Configuration

### Complete Production Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: semilab-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password_here
      POSTGRES_DB: semilab
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: semilab-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    container_name: semilab-backend
    environment:
      - DATABASE_URL=postgresql://postgres:your_password@postgres:5432/semilab
      - JWT_SECRET=your_jwt_secret_here
      - NODE_ENV=production
      - CORS_ORIGIN=http://localhost:3000,http://your-domain.com
      - PORT=3000
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./src/backend/src:/app/src

  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile
    container_name: semilab-frontend
    ports:
      - "80:3000"
    environment:
      - REACT_APP_API_URL=http://your-server-ip:3001/api
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 🔒 Security for On-Premises

### Essential

1. **Change Default Passwords**
   - PostgreSQL: Use strong password
   - JWT_SECRET: Generate with: `openssl rand -base64 32`

2. **Firewall Rules**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS (later with reverse proxy)
   sudo ufw allow 22/tcp    # SSH (already open usually)
   ```

3. **Backup Database**
   ```bash
   # Daily automated backup
   docker-compose exec postgres pg_dump -U postgres semilab > backup_$(date +%Y%m%d).sql
   ```

4. **Update Regularly**
   ```bash
   git pull origin main
   docker-compose pull
   docker-compose up -d
   ```

### Recommended

1. **SSL/HTTPS**
   - Use Let's Encrypt with Certbot
   - Reverse proxy (nginx/Apache)

2. **Reverse Proxy Setup**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
       }
   }
   ```

3. **Data Encryption**
   - Encrypt `/var/lib/docker/volumes` partition
   - Use encrypted backups

4. **Access Control**
   - Restrict database port (5432) to localhost only
   - Use firewall rules
   - SSH key-based auth only

---

## 📊 Monitoring & Maintenance

### Check Status

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Check resource usage
docker stats
```

### Backup Strategy

```bash
# Automated daily backup script
cat > /opt/SemiLab/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U postgres semilab > $BACKUP_DIR/db_$DATE.sql

# Volumes backup
tar -czf $BACKUP_DIR/volumes_$DATE.tar.gz /var/lib/docker/volumes

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/SemiLab/backup.sh

# Schedule with crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/SemiLab/backup.sh") | crontab -
```

### Database Maintenance

```bash
# Monthly vacuum and analyze
docker-compose exec postgres vacuumdb -U postgres -d semilab

# Check database size
docker-compose exec postgres psql -U postgres -d semilab -c "SELECT pg_size_pretty(pg_database_size('semilab'))"
```

---

## 🚨 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Verify ports not in use
sudo netstat -tlnp | grep 3000

# Rebuild container
docker-compose down
docker-compose up --build
```

### Database Connection Error

```bash
# Verify database is running
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check environment variables
docker-compose config | grep DATABASE_URL
```

### Out of Disk Space

```bash
# Clean up old images/volumes
docker image prune -a
docker volume prune

# Check current usage
docker system df
```

---

## 📈 Scaling (Future)

### Currently
- Single server deployment
- Good for 50-100 concurrent users

### Future Upgrades
- Add load balancer (nginx)
- Separate database server
- Redis clustering
- Multi-region replication

---

## 🔗 Access Information

### After Deployment

**Frontend:**
```
URL: http://your-server-ip:3000
Admin: Create first account during setup
```

**API:**
```
Base URL: http://your-server-ip:3001/api
Auth: Bearer token (JWT)
Docs: Check README.md for endpoint list
```

**Database:**
```
Host: localhost (from server)
Port: 5432
Database: semilab
User: postgres
Password: (set in .env)
```

---

## 📞 Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Execute database command
docker-compose exec postgres psql -U postgres -d semilab

# SSH into container
docker-compose exec backend /bin/sh

# Update code
git pull origin main
docker-compose up -d --build
```

---

## ✅ Post-Deployment Checklist

- [ ] All containers running (`docker-compose ps`)
- [ ] Database initialized and accessible
- [ ] Frontend loading (visit http://your-ip:3000)
- [ ] API responding (test /api/auth/me endpoint)
- [ ] Can create users
- [ ] Can login successfully
- [ ] Backups scheduled
- [ ] Firewall configured
- [ ] SSL/HTTPS working (if configured)
- [ ] Monitoring setup (logs checked)

---

## 🎓 Next Steps (If Issues)

1. **Logs first:** Always check `docker-compose logs`
2. **Network:** Ensure ports are accessible
3. **Data:** Verify database initialized
4. **Permissions:** Check file permissions
5. **Resources:** Ensure adequate RAM/disk

---

**SemiLab is ready for on-premises deployment!**

Day 7 deployment: Docker containers, fully self-hosted, complete control.

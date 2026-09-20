# FieldOps

A centralized field operations and infrastructure deployment management platform for tracking customer deployments, managing environment credentials with AES-256-GCM encryption, scheduling operational reminders, and auditing infrastructure activities.

---

## 🏗 System Architecture

The application is built as a distributed microservice stack managed via Docker Compose:

| Service | Technology | Port(s) | Description |
| :--- | :--- | :--- | :--- |
| **Nginx** | Nginx Alpine | `80`, `443` | Reverse proxy, TLS termination, static asset serving, rate limiting |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | `3000` (internal / dev: `3000`) | Web dashboard and UI |
| **Backend API** | FastAPI, Python 3.12, SQLAlchemy, Pydantic | `8000` | REST API, authentication, credential encryption engine |
| **Database** | PostgreSQL 16 | `5432` | Relational database (`appdb`) |
| **Cache / Broker** | Redis 7 | `6379` | Celery message broker and cache |
| **Worker** | Celery Worker | N/A | Asynchronous tasks and reminder execution |
| **Scheduler** | Celery Beat | N/A | Periodic cron tasks (daily DB backups, reminder checks) |
| **Object Storage** | MinIO (S3 compatible) | `9000` (API), `9001` (Console) | Deployment reports and configuration file attachments |

---

## 📋 Prerequisites

### For Local Development
- **Python**: 3.12+ (or 3.10+)
- **Node.js**: v20+ and **npm**
- **Docker & Docker Compose**: For running containerized backing services (PostgreSQL, Redis, MinIO)
- **OpenSSL**: For generating keys and tokens

### For Production Deployment
- **OS**: Ubuntu 22.04 LTS (recommended) or any modern Linux distribution
- **Docker Engine**: v24.0+ and **Docker Compose**: v2.20+ (or `docker-compose`)
- **OpenSSL & Zstandard (`zstd`)**: For encryption key generation and compressed backups
- **Hardware**: Minimum 2 vCPUs, 4GB RAM, 20GB+ SSD storage

---

## 💻 Running the Development Server

You can run the full development stack using **a single Docker Compose command with live hot reloading**, or run the services individually on your host machine.

---

### Option A: Single Docker Compose (Recommended) 🚀

This spins up the complete stack (Frontend, Backend API, Celery Worker, Celery Beat, PostgreSQL, Redis, MinIO) in a single command with:
- **Instant Hot Reloading (Vite HMR)** for React code changes (`./frontend` mounted into container with isolated `node_modules`).
- **Live Reloading (Uvicorn `--reload`)** for Python code changes (`./backend` mounted into container).
- **Automated Startup Tasks**: Applies database migrations (`alembic upgrade head`) and seeds default admin credentials (`seed_data.py`) automatically on launch.
- **Port Conflict Protection**: Default host ports are configured to avoid collisions if you have existing local databases or web apps running.

#### 1. Setup Environment

```bash
# Copy the environment template
cp .env.example .env
```

> [!NOTE]
> If you have existing Docker containers or local databases using ports `5432`, `3000`, or `8000`, you can adjust the port mappings in your `.env` file (defaults: Frontend `3002`, Backend `8001`, Postgres `5433`).

#### 2. Start the Stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

*(Add `-d` if you want to run containers in the background)*

#### 3. Access Your Services

- 🌐 **Frontend UI (Hot Reloading)**: [http://localhost:3002](http://localhost:3002) (or `${FRONTEND_PORT}`)
- ⚡ **Backend API & Swagger Docs**: [http://localhost:8001/docs](http://localhost:8001/docs) (or `${BACKEND_PORT}`)
- 🗄 **MinIO Object Storage Console**: [http://localhost:9001](http://localhost:9001)
- 📊 **PostgreSQL**: `localhost:5433` (or `${POSTGRES_PORT}`)

#### 4. Stopping the Dev Stack

```bash
docker compose -f docker-compose.dev.yml down
```

---

### Option B: Local Host Development (Hybrid)

If you prefer running FastAPI or Vite natively on your machine:

#### 1. Start Infrastructure Services Only

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis minio
```

#### 2. Backend Setup & Run

In your first terminal:

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate
# (On Windows: venv\Scripts\activate)

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed data
DATABASE_URL="postgresql://postgres:supersecurepassword123@localhost:5433/appdb" alembic upgrade head
DATABASE_URL="postgresql://postgres:supersecurepassword123@localhost:5433/appdb" python ../scripts/seed_data.py

# Start FastAPI dev server
DATABASE_URL="postgresql://postgres:supersecurepassword123@localhost:5433/appdb" uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup & Run

In your second terminal:

```bash
cd frontend
npm install
npm run dev
```

Requests to `/api/*` will automatically be proxied to `http://localhost:8000`.

---

### Default Credentials

| Service | Username | Password |
| :--- | :--- | :--- |
| **FieldOps App** | `admin` | `admin123` |
| **MinIO Console** | `minioadmin` | `supersecureminiopassword123` (or `${MINIO_PASSWORD}`) |
| **PostgreSQL** | `postgres` | `supersecurepassword123` (or `${POSTGRES_PASSWORD}`) |

---

## 🚀 Production Deployment Guide

This section covers a full production deployment using Docker Compose, Nginx reverse proxy with TLS/SSL, systemd service management, and automated backups.

### Step 1: System Directory Setup

Prepare standard deployment and data paths on the host server:

```bash
# Application directory
sudo mkdir -p /opt/deployment-tracker
sudo chown -R $USER:$USER /opt/deployment-tracker

# Secrets directory (Master Encryption Key)
sudo mkdir -p /etc/deployment-tracker/secrets
sudo chmod 700 /etc/deployment-tracker/secrets

# TLS/SSL Certificates directory
sudo mkdir -p /etc/deployment-tracker/certs
sudo chmod 755 /etc/deployment-tracker/certs

# Backups directory
sudo mkdir -p /mnt/backups/deployment-tracker
sudo chown -R $USER:$USER /mnt/backups/deployment-tracker
sudo chmod 755 /mnt/backups/deployment-tracker
```

### Step 2: Generate Master Encryption Key

The application encrypts credentials using **AES-256-GCM**. It requires a 32-byte hexadecimal key:

```bash
# Generate 32-byte random key (64 hex characters)
openssl rand -hex 32 | sudo tee /etc/deployment-tracker/secrets/master.key > /dev/null

# Restrict permissions (Read-only by owner)
sudo chmod 400 /etc/deployment-tracker/secrets/master.key
sudo chown root:root /etc/deployment-tracker/secrets/master.key
```

> [!CAUTION]
> **BACK UP THE MASTER KEY TO SECURE OFFLINE STORAGE!**
> If the master key is lost or regenerated, all previously encrypted deployment credentials will become **permanently unrecoverable**.

### Step 3: Configure SSL/TLS Certificates

Nginx terminates TLS on port `443`.

#### Option A: Self-Signed Certificate (Internal / Staging)
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /etc/deployment-tracker/certs/server.key \
  -out /etc/deployment-tracker/certs/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=$(curl -s ifconfig.me || echo 'localhost')"

sudo chmod 444 /etc/deployment-tracker/certs/server.crt
sudo chmod 400 /etc/deployment-tracker/certs/server.key
```

#### Option B: Valid CA or Let's Encrypt (Production Domain)
Copy your fullchain certificate and private key into `/etc/deployment-tracker/certs/`:
- Certificate: `/etc/deployment-tracker/certs/server.crt` (permission: `444`)
- Private Key: `/etc/deployment-tracker/certs/server.key` (permission: `400`)

### Step 4: Clone Repository & Configure Environment

```bash
# Clone repository to /opt/deployment-tracker
git clone <repo-url> /opt/deployment-tracker
cd /opt/deployment-tracker

# Create production .env file
cp .env.example .env
chmod 600 .env
```

Edit `.env` and set strong, unique random secrets:

```ini
POSTGRES_PASSWORD=your_super_strong_postgres_password
JWT_SECRET=your_super_strong_jwt_secret_key
MINIO_PASSWORD=your_super_strong_minio_password
ENVIRONMENT=production
```

> [!TIP]
> You can generate strong keys using: `openssl rand -hex 32`

### Step 5: Build Frontend Static Assets

Nginx serves frontend assets directly from `./frontend/dist`. Build the production bundle before launching Nginx:

```bash
cd /opt/deployment-tracker/frontend
npm install
npm run build
cd /opt/deployment-tracker
```

### Step 6: Initialize Database & Run Migrations

Start the database container first, run migrations, and seed initial data:

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Wait until healthy (pg_isready check)
docker compose ps

# 3. Start backend to execute migrations
docker compose up -d backend
docker compose exec backend alembic upgrade head

# 4. Seed default roles and admin account
docker compose exec backend python scripts/seed_data.py
```

### Step 7: Launch Full Application Stack

```bash
docker compose up -d
```

Check running containers and health checks:
```bash
docker compose ps
```

All services should report `Up` or `Up (healthy)`:
- `deployment-tracker-db`
- `deployment-tracker-redis`
- `deployment-tracker-minio`
- `deployment-tracker-api`
- `deployment-tracker-celery-worker`
- `deployment-tracker-celery-beat`
- `deployment-tracker-frontend`
- `deployment-tracker-nginx`

Verify deployment health:
```bash
curl -k -f https://localhost/api/health
# Output: {"status":"ok"}
```

---

## ⚙️ Systemd Service Configuration (Auto-Start on Boot)

To ensure the application starts on system reboot and automatically restarts on failure, install the systemd unit:

1. Copy service definition:
   ```bash
   sudo cp deployment-tracker.service /etc/systemd/system/
   ```

2. Review `/etc/systemd/system/deployment-tracker.service`:
   > [!IMPORTANT]
   > Ensure `ExecStartPre` does not use `-v` (which deletes persistent volumes):
   > ```ini
   > ExecStartPre=/usr/bin/docker compose down
   > ExecStart=/usr/bin/docker compose up
   > ExecStop=/usr/bin/docker compose down
   > ```

3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable deployment-tracker
   sudo systemctl start deployment-tracker
   ```

4. Check status and logs:
   ```bash
   sudo systemctl status deployment-tracker
   sudo journalctl -u deployment-tracker -f
   ```

---

## 🔒 Security & Firewall (UFW) Configuration

For production servers, restrict access using Ubuntu UFW:

```bash
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTPS (optionally restrict to your VPN or office static IP)
sudo ufw allow 443/tcp
# Or restrict to specific IP:
# sudo ufw allow from <AUTHORIZED_IP> to any port 443 proto tcp

# Allow HTTP for HTTPS redirect
sudo ufw allow 80/tcp

# Enable firewall
sudo ufw enable
```

---

## 💾 Backups & Disaster Recovery

### Automated Backups
Celery Beat executes `tasks.backup_database` daily at **02:00 UTC**, compressing PostgreSQL dumps with Zstandard into `/mnt/backups/deployment-tracker/`.

### Manual Backup
To trigger an immediate backup manually:
```bash
bash /opt/deployment-tracker/scripts/backup.sh
```
Backups older than 30 days are automatically pruned.

### Database Restoration

To restore the database from a compressed backup file:

```bash
# 1. Ensure postgres is running
docker compose up -d postgres

# 2. Run restore script
bash /opt/deployment-tracker/scripts/restore.sh /mnt/backups/deployment-tracker/db-YYYYMMDD_HHMMSS.sql.zst
```

Or perform a manual restore:
```bash
zstd -d /mnt/backups/deployment-tracker/db-YYYYMMDD_HHMMSS.sql.zst --stdout | \
  docker compose exec -T postgres psql -U postgres -d appdb
```

---

## 🔍 Diagnostics & Troubleshooting

| Goal | Command |
| :--- | :--- |
| **Check container statuses** | `docker compose ps` |
| **View logs across all services** | `docker compose logs -f --tail=50` |
| **View backend API logs** | `docker compose logs -f backend` |
| **View Celery worker logs** | `docker compose logs -f celery_worker` |
| **Test DB connection directly** | `docker compose exec postgres psql -U postgres -d appdb -c "SELECT 1;"` |
| **Test Redis connection** | `docker compose exec redis redis-cli ping` |
| **Test MinIO live health** | `curl -s http://localhost:9000/minio/health/live` |
| **Query audit logs** | `docker compose exec postgres psql -U postgres -d appdb -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;"` |
| **Restart the full stack** | `docker compose restart` |

Refer to [`Deployment Tracker.md`](file:///Users/kahmeng/Documents/GitHub/deptrack/Deployment%20Tracker.md) and [`Deployment Checklist.md`](file:///Users/kahmeng/Documents/GitHub/deptrack/Deployment%20Checklist.md) for detailed incident resolution and step-by-step launch verification.

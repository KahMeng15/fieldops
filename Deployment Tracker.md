# Deployment Tracker - Troubleshooting Guide

---

## 🔍 DIAGNOSTIC COMMANDS

### Quick System Status Check

```bash
# Overall status
sudo systemctl status deployment-tracker

# All containers running?
docker-compose ps

# Any container errors?
docker-compose logs --tail=50

# Database connectivity
docker-compose exec postgres psql -U postgres -d appdb -c "SELECT 1;"

# Redis connectivity
docker-compose exec redis redis-cli ping

# MinIO connectivity
curl -s http://localhost:9000/minio/health/live

# API health
curl http://localhost:8000/api/health

# Frontend loading
curl -k https://localhost/ | head -20
```

---

## ⚠️ COMMON ISSUES & FIXES

### Issue: Containers won't start / "docker-compose up -d" fails

**Symptoms:**
```
ERROR: The Compose file is invalid
ERROR: Unable to load certificate
ERROR: Connection refused
```

**Debug:**
```bash
# Check docker daemon running
sudo systemctl status docker

# Check docker-compose syntax
docker-compose config

# Check permissions on mounted directories
ls -la /etc/deployment-tracker/secrets/
ls -la /etc/deployment-tracker/certs/
ls -la /mnt/backups/deployment-tracker/

# Check .env file exists and has no parse errors
cat .env | grep -v "^#" | grep -v "^$"
```

**Fixes:**
```bash
# Restart docker daemon
sudo systemctl restart docker

# Rebuild images (don't use cache)
docker-compose build --no-cache

# Remove dangling containers
docker-compose down -v  # WARNING: Deletes volumes!

# Check disk space
df -h
# If < 10% free, clean up old backups:
find /mnt/backups/deployment-tracker -name "db-*.sql.zst" -mtime +30 -delete
```

---

### Issue: "Master key not found" / Encryption fails

**Symptoms:**
```
FileNotFoundError: [Errno 2] No such file or directory: '/run/secrets/master.key'
ValueError: Master key must be 32 bytes
```

**Debug:**
```bash
# Check if key exists on host
ls -la /etc/deployment-tracker/secrets/master.key

# Check if mounted into container
docker-compose exec backend ls -la /run/secrets/master.key

# Check key format (should be 64 hex chars)
cat /etc/deployment-tracker/secrets/master.key | wc -c  # Should be 65 (64 chars + newline)
```

**Fixes:**
```bash
# Regenerate key (this will break all encrypted credentials!)
openssl rand -hex 32 > /etc/deployment-tracker/secrets/master.key
chmod 400 /etc/deployment-tracker/secrets/master.key

# Restart backend to reload key
docker-compose restart backend

# If this is a NEW deployment, run migrations again:
docker-compose exec backend alembic upgrade head
```

**Prevention:**
- Always back up the master key before generating a new one
- Never delete `/etc/deployment-tracker/secrets/master.key`

---

### Issue: Database won't start / "pg_isready" fails

**Symptoms:**
```
postgres_1  | FATAL: database files are incompatible with server
postgres_1  | FATAL: lock file "postmaster.pid" already exists
postgres_1  | Connection refused
```

**Debug:**
```bash
# Check postgres logs
docker-compose logs postgres

# Check if postgres data directory is corrupted
ls -la postgres_data/

# Check database connections still open
docker-compose exec postgres psql -U postgres -d appdb -c "SELECT * FROM pg_stat_activity;"
```

**Fixes:**
```bash
# Soft restart (try first)
docker-compose restart postgres
docker-compose exec postgres pg_isready

# If still fails, clean data directory
docker-compose down
rm -rf postgres_data/
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

**⚠️ WARNING:** Deleting `postgres_data/` destroys all application data. Restore from backup first:
```bash
docker-compose down
rm -rf postgres_data/
docker-compose up -d postgres
zstd -d /mnt/backups/deployment-tracker/db-TIMESTAMP.sql.zst --stdout | \
  docker-compose exec -T postgres psql -U postgres -d appdb
```

---

### Issue: API returns "401 Unauthorized" for all requests

**Symptoms:**
```
{"detail": "Invalid authentication credentials"}
HTTP/1.1 401 Unauthorized
```

**Debug:**
```bash
# Check JWT secret in .env
grep JWT_SECRET .env

# Check token in Authorization header
# Expected format: Authorization: Bearer <token>

# Verify token is valid (decode manually)
python3 -c "import base64; token='<your-token>'; print(base64.urlsafe_b64decode(token.split('.')[1] + '==='))"

# Check if user exists in database
docker-compose exec postgres psql -U postgres -d appdb -c "SELECT * FROM users LIMIT 5;"
```

**Fixes:**
```bash
# Generate new JWT_SECRET if corrupted
python3 -c "import secrets; print(secrets.token_hex(32))"
# Update .env, then:
docker-compose restart backend

# If user not in database, seed defaults:
docker-compose exec backend python scripts/seed_data.py

# Test login directly
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

### Issue: "Credential reveal" returns empty or garbage

**Symptoms:**
```
{"credential": null}
or
{"credential": "corrupt binary data"}
```

**Debug:**
```bash
# Check if credential exists in database
docker-compose exec postgres psql -U postgres -d appdb \
  -c "SELECT id, credential_type, LENGTH(encrypted_payload) FROM credentials LIMIT 5;"

# Check encryption key is correct
cat /etc/deployment-tracker/secrets/master.key

# Check for audit log of reveal attempt
docker-compose exec postgres psql -U postgres -d appdb \
  -c "SELECT * FROM audit_logs WHERE action='reveal_credential' ORDER BY timestamp DESC LIMIT 3;"
```

**Fixes:**
```bash
# If master key was regenerated, old credentials are unrecoverable
# Solution: Delete old credentials, create new ones
docker-compose exec postgres psql -U postgres -d appdb \
  -c "DELETE FROM credentials;"

# Verify encryption is working with a new credential
curl -X POST http://localhost:8000/api/credentials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_id": "<deployment-uuid>",
    "credential_type": "ip_address",
    "label": "Test IP",
    "encrypted_payload": "192.168.1.1"
  }'

# Reveal it
curl -X POST http://localhost:8000/api/credentials/<cred-id>/reveal \
  -H "Authorization: Bearer <token>"
```

---

### Issue: Celery jobs not running / "No module named 'tasks'"

**Symptoms:**
```
celery_worker_1  | ModuleNotFoundError: No module named 'tasks'
celery_worker_1  | Task crashed
```

**Debug:**
```bash
# Check celery worker logs
docker-compose logs celery_worker

# Verify tasks.py exists
docker-compose exec celery_worker ls -la /app/tasks.py

# Check if Redis is running
docker-compose exec redis redis-cli ping

# Check celery can connect to broker
docker-compose exec celery_worker celery -A tasks inspect ping
```

**Fixes:**
```bash
# Restart celery services
docker-compose restart celery_worker celery_beat

# Clear stuck tasks (⚠️ loses pending jobs)
docker-compose exec redis redis-cli FLUSHDB

# Verify tasks are being registered
docker-compose exec celery_worker celery -A tasks inspect registered

# Test a manual task execution
docker-compose exec celery_worker python -c "from tasks import process_reminders; process_reminders()"
```

---

### Issue: Backup fails / "pg_dump: command not found"

**Symptoms:**
```
backup.sh: line XX: pg_dump: command not found
No such file or directory
```

**Debug:**
```bash
# Check if backup script is executable
ls -la backup.sh

# Run backup manually with verbose output
bash -x backup.sh

# Check if pg_dump is available inside postgres container
docker-compose exec postgres which pg_dump
```

**Fixes:**
```bash
# Make script executable
chmod +x backup.sh

# Use docker-compose exec to run pg_dump (already in container)
docker-compose exec -T postgres pg_dump -U postgres appdb | zstd -19 > /tmp/test-backup.sql.zst

# Update backup.sh to use correct path:
docker-compose -f /opt/deployment-tracker/docker-compose.yml exec -T postgres pg_dump ...

# Verify backup created
ls -lh /mnt/backups/deployment-tracker/db-*.sql.zst
```

---

### Issue: "Connection refused" when accessing https://server-ip

**Symptoms:**
```
curl: (7) Failed to connect to localhost port 443: Connection refused
```

**Debug:**
```bash
# Check if Nginx is running
docker-compose ps | grep nginx

# Check Nginx logs
docker-compose logs nginx

# Check TLS certificates
ls -la /etc/deployment-tracker/certs/

# Test backend is reachable from Nginx container
docker-compose exec nginx curl http://backend:8000/api/health
```

**Fixes:**
```bash
# Verify certificates exist and are valid
openssl x509 -in /etc/deployment-tracker/certs/server.crt -text -noout

# Check Nginx config syntax
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload

# Check firewall allows 443
sudo ufw status | grep 443
sudo ufw allow 443

# Test with curl, ignore cert warning
curl -k https://localhost/
```

---

### Issue: "Rate limit exceeded" / "429 Too Many Requests"

**Symptoms:**
```
HTTP/1.1 429 Too Many Requests
{"detail": "Rate limit exceeded"}
```

**Debug:**
```bash
# Check if this is legitimate (brute-force attack?)
docker-compose logs nginx | grep "429"

# Check rate limiting config in nginx.conf
grep -A 5 "limit_req_zone" nginx.conf
```

**Fixes:**
```bash
# This is working as designed (login endpoint allows 5 req/min)
# If legitimate user being blocked:

# 1. Whitelist their IP in nginx.conf
# 2. Increase rate limit (not recommended)
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;  # Increased to 10/min

# 3. Restart Nginx
docker-compose restart nginx
```

---

### Issue: Out of disk space / Backups accumulating

**Symptoms:**
```
df: cannot access '...': No space left on device
backup.sh: Cannot write to /mnt/backups/deployment-tracker
```

**Debug:**
```bash
# Check disk usage
df -h

# Check backup directory size
du -sh /mnt/backups/deployment-tracker/

# Find largest files
find /mnt/backups/deployment-tracker -name "*.sql.zst" -exec ls -lh {} \; | sort -k5 -h
```

**Fixes:**
```bash
# Delete backups older than 30 days (if not already done by retention policy)
find /mnt/backups/deployment-tracker -name "db-*.sql.zst" -mtime +30 -delete

# Manually delete specific old backup
rm /mnt/backups/deployment-tracker/db-20260801_020000.sql.zst

# Monitor disk space regularly
watch df -h

# Archive old backups to external storage (NAS, USB, etc.)
cp /mnt/backups/deployment-tracker/db-*.sql.zst /media/external-backup/
```

---

### Issue: Can't log in / "Invalid credentials"

**Symptoms:**
```
HTTP/1.1 401 Unauthorized
{"detail": "Invalid credentials"}
```

**Debug:**
```bash
# Check if admin user exists
docker-compose exec postgres psql -U postgres -d appdb \
  -c "SELECT username, email FROM users WHERE username='admin';"

# Check password hash (should not be plaintext)
docker-compose exec postgres psql -U postgres -d appdb \
  -c "SELECT username, password_hash FROM users WHERE username='admin';"

# Enable debug logging in FastAPI
export PYTHONVERBOSE=1
docker-compose restart backend
```

**Fixes:**
```bash
# Reset admin password
docker-compose exec backend python -c "
from app.db import SessionLocal
from app.models import User
from app.auth import get_password_hash
db = SessionLocal()
admin = db.query(User).filter_by(username='admin').first()
if admin:
    admin.password_hash = get_password_hash('admin123')
    db.commit()
    print('Password reset to: admin123')
else:
    print('Admin user not found')
"

# Or use the seed script to recreate all defaults
docker-compose exec backend python scripts/seed_data.py --force

# Try login again
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

### Issue: Frontend loads but API requests fail / CORS error

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Debug:**
```bash
# Check CORS headers in API response
curl -i http://localhost:8000/api/deployments

# Check if Access-Control-Allow-Origin is set
curl -i -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  http://localhost:8000/api/deployments
```

**Fixes:**
```bash
# Add CORS middleware in FastAPI (backend/main.py)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost", "https://<server-ip>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Restart backend
docker-compose restart backend
```

---

## 🔧 MAINTENANCE PROCEDURES

### Weekly

```bash
# Check disk usage
df -h

# Verify backups exist
ls -lh /mnt/backups/deployment-tracker/ | tail -7

# Check systemd service status
sudo systemctl status deployment-tracker
```

### Monthly

```bash
# Test backup restoration (non-production)
# 1. Backup production: /opt/deployment-tracker/backup.sh
# 2. Restore to test DB and verify data integrity
# 3. Document findings

# Update security patches
docker-compose pull
docker-compose build --no-cache
docker-compose up -d

# Review audit logs for suspicious activity
docker-compose exec postgres psql -U postgres -d appdb \
  -c "SELECT user_id, action, COUNT(*) as count FROM audit_logs 
       WHERE timestamp > NOW() - INTERVAL '30 days' 
       GROUP BY user_id, action ORDER BY count DESC;"
```

### Quarterly

```bash
# Upgrade TLS certificate (before expiry)
# Generate new cert 30 days before expiry
openssl req -x509 -newkey rsa:4096 -keyout server.key \
  -out server.crt -days 365 -nodes

# Rotate admin password
docker-compose exec backend python scripts/reset_user_password.py --user admin

# Review and update RBAC roles/permissions if needed

# Capacity planning: check logs for slow queries
docker-compose logs postgres | grep "SLOW"
```

---

## 📊 MONITORING CHECKLIST

Add these to your monitoring system (Prometheus, Grafana, etc.):

- [ ] PostgreSQL disk usage
- [ ] Redis memory usage
- [ ] MinIO storage usage
- [ ] Celery task queue depth
- [ ] API response time (p50, p95, p99)
- [ ] Failed login attempts (rate limit events)
- [ ] Backup success/failure
- [ ] Certificate expiry date (alert 30 days before)
- [ ] Systemd service restart count

---

## 🆘 ESCALATION PATH

If issue cannot be resolved locally:

1. **Collect diagnostics:**
   ```bash
   docker-compose logs > /tmp/logs.txt
   docker stats --no-stream > /tmp/stats.txt
   docker-compose ps > /tmp/containers.txt
   df -h > /tmp/disk.txt
   ps aux > /tmp/processes.txt
   ```

2. **Document error** with timestamps and reproduction steps

3. **Review this guide again** for similar issues

4. **Check FastAPI/React documentation** for library-specific errors

5. **Review PostgreSQL error logs:**
   ```bash
   docker-compose exec postgres tail -100 /var/log/postgresql/postgresql.log
   ```

6. **Contact:** [Your escalation contact]

---
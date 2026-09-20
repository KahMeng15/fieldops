================================================================================
DEPLOYMENT TRACKER - PRODUCTION DEPLOYMENT CHECKLIST
================================================================================
Timeline: ASAP (Days 1-3)
Date Started: _______________
Owner: _______________
Status: [ ] IN PROGRESS  [ ] COMPLETE  [ ] FAILED

================================================================================
PHASE 0: PRE-DEPLOYMENT (Day -1)
================================================================================

SECRETS & KEYS
  [ ] Create /etc/deployment-tracker/secrets/ directory
  [ ] Generate master encryption key (openssl rand -hex 32)
  [ ] Set permissions to 400
  [ ] Back up master key to OFFLINE storage (USB, password manager)
      Location: _______________________________________________
      Backup Verified: _______________

ENVIRONMENT FILE
  [ ] Create .env in project root
  [ ] Add to .gitignore (verify with: git status | grep .env)
  [ ] Set POSTGRES_PASSWORD (strong random)
  [ ] Set JWT_SECRET (strong random)
  [ ] Set MINIO_PASSWORD (strong random)
  [ ] Set ENVIRONMENT=production

FIREWALL & NETWORK
  [ ] Identify remote static IP: _______________
  [ ] Document local network subnet: _______________
  [ ] Configure UFW:
      - [ ] sudo ufw default deny incoming
      - [ ] sudo ufw allow from <static-ip> to any port 443
      - [ ] sudo ufw allow 22/tcp
      - [ ] sudo ufw enable
  [ ] Test access from authorized IP: curl -k https://<server-ip>
  [ ] Test access denied from random IP (should timeout)

BACKUP INFRASTRUCTURE
  [ ] Create /mnt/backups/deployment-tracker directory
  [ ] Set ownership to ubuntu user
  [ ] Set permissions 755
  [ ] Test backup script: bash ./backup.sh
  [ ] Verify compressed backup exists: ls -lh /mnt/backups/deployment-tracker/
  [ ] Check disk space available: df -h /mnt/backups/

TLS CERTIFICATES
  [ ] Create /etc/deployment-tracker/certs directory
  [ ] Generate self-signed cert:
      sudo openssl req -x509 -newkey rsa:4096 -keyout server.key \
      -out server.crt -days 365 -nodes
  [ ] Verify cert exists: ls -la /etc/deployment-tracker/certs/
  [ ] Set permissions: crt=444, key=400

DIRECTORY STRUCTURE FINAL CHECK
  [ ] /etc/deployment-tracker/secrets/master.key (400)
  [ ] /etc/deployment-tracker/certs/server.crt (444)
  [ ] /etc/deployment-tracker/certs/server.key (400)
  [ ] /mnt/backups/deployment-tracker/ (755)

CODE & DOCKER SETUP
  [ ] Clone repository to /opt/deployment-tracker
  [ ] Verify docker-compose.yml syntax: docker-compose config
  [ ] Verify Dockerfiles build: docker-compose build
  [ ] Pull all base images: docker-compose pull
  [ ] Verify nginx.conf syntax: docker run --rm -t -a stdin nginx nginx -t < nginx.conf

================================================================================
PHASE 1: DEPLOYMENT DAY (Launch)
================================================================================

DATABASE INITIALIZATION
  [ ] Start database only: docker-compose up postgres -d
  [ ] Wait 10s for health check to pass: docker-compose ps
  [ ] Run migrations: docker-compose exec backend alembic upgrade head
      Output: _____________________________________________________________
  [ ] Seed initial data: docker-compose exec backend python scripts/seed_data.py
  [ ] Verify tables created: 
      docker-compose exec postgres psql -U postgres -d appdb -c "\dt"

FULL STACK STARTUP
  [ ] Start all services: docker-compose up -d
  [ ] Wait 20s for all health checks
  [ ] Check status: docker-compose ps
      All containers should show: STATUS = Up (healthy)
  [ ] Review logs for errors: docker-compose logs --tail=100 | grep -i error
      Errors found: [ ] YES [ ] NO

API HEALTH CHECKS
  [ ] Test basic health: curl http://localhost:8000/api/health
      Response: ________________________________________________________
  [ ] Test login endpoint: curl -X POST http://localhost:8000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"admin123"}'
      Response includes access_token: [ ] YES [ ] NO
  [ ] Test token refresh: 
      Response: ________________________________________________________

FRONTEND VERIFICATION
  [ ] Test HTTP redirect: curl http://localhost/
      Should redirect to https: [ ] YES [ ] NO
  [ ] Open browser: https://<server-ip> (accept self-signed cert)
  [ ] Login page loads: [ ] YES [ ] NO
  [ ] Login with admin/admin123
  [ ] Dashboard page loads: [ ] YES [ ] NO
  [ ] Navigation works: [ ] YES [ ] NO

CELERY BACKGROUND JOBS
  [ ] Check worker logs: docker-compose logs celery_worker | tail -20
  [ ] Check beat logs: docker-compose logs celery_beat | tail -20
  [ ] Create test reminder (via API or UI)
  [ ] Verify job executed within 1 minute
  [ ] Check backup job scheduled: 
      Expected: 2 AM daily
      Verified: [ ] YES [ ] NO

AUDIT LOGGING
  [ ] Perform login action (audit event 1)
  [ ] Perform create deployment (audit event 2)
  [ ] Reveal a credential (audit event 3)
  [ ] Query audit logs:
      docker-compose exec postgres psql -U postgres -d appdb \
      -c "SELECT COUNT(*) FROM audit_logs;"
      Count: _____ (should be >= 3)

MINION & FILE STORAGE
  [ ] Access MinIO console: http://localhost:9001
  [ ] Login with minioadmin / <MINIO_PASSWORD>
  [ ] Create bucket: deployments-config-reports
  [ ] Test file upload (create empty test file)
  [ ] Verify file in bucket: [ ] YES [ ] NO
  [ ] Delete test file

BACKUP VERIFICATION
  [ ] Manual backup test: /opt/deployment-tracker/backup.sh
  [ ] Check backup file: ls -lh /mnt/backups/deployment-tracker/db-*.sql.zst
      File exists: [ ] YES [ ] NO
      Size (should be 10MB-100MB): _______________

SECURITY VERIFICATION
  [ ] HTTPS enforcement: All http:// should redirect to https:// 
      Verified: [ ] YES [ ] NO
  [ ] Invalid JWT rejection: 
      curl -H "Authorization: Bearer invalid" http://localhost:8000/api/deployments
      Should return 401 Unauthorized: [ ] YES [ ] NO
  [ ] Rate limiting on login (send 10 rapid requests):
      6th+ should return 429 Too Many Requests: [ ] YES [ ] NO
  [ ] Firewall blocks unauthorized IP:
      From untrusted network: curl -k https://<server-ip>
      Should timeout after 10s: [ ] YES [ ] NO

TEAM & ROLE SETUP
  [ ] Create team 1: "Field Team A"
  [ ] Create team 2: "HQ Admin"
  [ ] Create users:
      - admin (Team: HQ Admin, Role: admin)
      - manager1 (Team: Field Team A, Role: manager)
      - engineer1 (Team: Field Team A, Role: engineer)
  [ ] Test RBAC:
      - [ ] Engineer cannot create deployment (403)
      - [ ] Manager can create deployment (201)
      - [ ] Viewer cannot edit deployment (403)

SYSTEMD SERVICE INSTALLATION
  [ ] Create /etc/systemd/system/deployment-tracker.service
  [ ] Reload systemd: sudo systemctl daemon-reload
  [ ] Enable on boot: sudo systemctl enable deployment-tracker
  [ ] Stop docker-compose: docker-compose down
  [ ] Start via systemd: sudo systemctl start deployment-tracker
  [ ] Verify running: sudo systemctl status deployment-tracker
      Status should show: active (running)
  [ ] Test restart: sudo systemctl restart deployment-tracker
      Wait 5s, check status: sudo systemctl status deployment-tracker
      Status should show: active (running)

================================================================================
PHASE 2: POST-DEPLOYMENT (Days 1-3)
================================================================================

MONITORING & LOGGING
  [ ] Day 1: Check systemd journal for errors
      sudo journalctl -u deployment-tracker --since "1 hour ago"
      Errors found: [ ] YES [ ] NO
  [ ] Day 1: Check PostgreSQL logs
      docker-compose logs postgres | grep -i error
  [ ] Day 1: Verify daily backup completed
      ls -lh /mnt/backups/deployment-tracker/ | tail -5

BACKUP RESTORATION TEST
  [ ] Stop services: docker-compose down
  [ ] Extract backup: 
      zstd -d /mnt/backups/deployment-tracker/db-*.sql.zst --stdout > /tmp/restore.sql
  [ ] Restore to test DB:
      docker-compose up -d postgres
      docker-compose exec postgres psql -U postgres -d appdb < /tmp/restore.sql
  [ ] Verify data:
      docker-compose exec postgres psql -U postgres -d appdb \
      -c "SELECT COUNT(*) FROM deployments;"
      Row count matches pre-backup: [ ] YES [ ] NO
  [ ] Restart production: docker-compose up -d

DOCUMENTATION & HANDOFF
  [ ] Document admin credentials in password manager (encrypted)
  [ ] Document SSH key location: _______________
  [ ] Document master key backup location: _______________
  [ ] Create on-call rotation document
  [ ] Send access credentials to team (encrypted, separate message)
  [ ] Provide team onboarding guide (PDF/wiki)
  [ ] Establish escalation contact for prod issues
      Contact: _______________
      Backup: _______________

PERFORMANCE BASELINE
  [ ] Measure startup time:
      time docker-compose up -d
      Startup time: _______________ seconds
  [ ] Measure API latency (GET /api/deployments):
      curl -w "%{time_total}\n" https://localhost/api/deployments
      Latency: _______________ seconds
  [ ] Check disk usage:
      df -h /mnt/backups/deployment-tracker/
      Usage: _______________
  [ ] Check container memory:
      docker stats --no-stream

SMOKE TESTS (Final)
  [ ] Login as admin: [ ] PASS [ ] FAIL
  [ ] Login as manager: [ ] PASS [ ] FAIL
  [ ] Login as engineer: [ ] PASS [ ] FAIL
  [ ] Create deployment: [ ] PASS [ ] FAIL
  [ ] Add engineer to deployment: [ ] PASS [ ] FAIL
  [ ] Add loaned item: [ ] PASS [ ] FAIL
  [ ] Create credential: [ ] PASS [ ] FAIL
  [ ] Reveal credential (audit logged): [ ] PASS [ ] FAIL
  [ ] Update deployment status: [ ] PASS [ ] FAIL
  [ ] View audit log: [ ] PASS [ ] FAIL

================================================================================
SIGN-OFF
================================================================================

Date Completed: _______________
Deployed By: _______________
Verified By: _______________
Backup Location Confirmed: _______________
Master Key Backup Verified: _______________

PRODUCTION DEPLOYMENT: [ ] APPROVED FOR USE

Notes/Issues:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

================================================================================
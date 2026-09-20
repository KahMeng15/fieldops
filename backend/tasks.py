from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timedelta
import subprocess
import os
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.models import Reminder, AuditLog

celery_app = Celery(
    "tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.beat_schedule = {
    'process-reminders': {
        'task': 'tasks.process_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    'backup-database': {
        'task': 'tasks.backup_database',
        'schedule': crontab(hour=2, minute=0),
    },
}
celery_app.conf.timezone = 'UTC'

@celery_app.task
def process_reminders():
    db: Session = SessionLocal()
    try:
        reminders = db.query(Reminder).filter(
            Reminder.status == "pending",
            Reminder.trigger_date <= datetime.utcnow()
        ).all()
        
        for reminder in reminders:
            engineer = reminder.engineer
            deployment = reminder.deployment
            
            # In-app notification logic would go here
            
            audit = AuditLog(
                action="reminder_triggered",
                resource_type="reminder",
                resource_id=reminder.id,
                notes=f"Auto-triggered for {engineer.username if engineer else 'unknown'}",
                ip_address="127.0.0.1"
            )
            db.add(audit)
        
        db.commit()
    finally:
        db.close()

@celery_app.task
def snooze_reminder(reminder_id: str, days: int = 7):
    db: Session = SessionLocal()
    try:
        reminder = db.query(Reminder).get(reminder_id)
        if reminder and reminder.snooze_count < reminder.max_snoozes:
            reminder.trigger_date = reminder.trigger_date + timedelta(days=days)
            reminder.snooze_count += 1
            reminder.status = "snoozed"
            db.commit()
            return {"status": "snoozed", "new_trigger": reminder.trigger_date}
        else:
            return {"status": "max_snoozes_reached"}
    finally:
        db.close()

@celery_app.task
def backup_database():
    backup_dir = "/mnt/backups/deployment-tracker"
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/db-{timestamp}.sql.zst"
    
    cmd = f"docker-compose -f /opt/deployment-tracker/docker-compose.yml exec -T postgres pg_dump -U postgres appdb | zstd -19 > {backup_file}"
    result = subprocess.run(cmd, shell=True, capture_output=True)
    
    db: Session = SessionLocal()
    try:
        if result.returncode == 0:
            audit = AuditLog(
                action="backup_created",
                resource_type="system",
                notes=f"Backup: {backup_file}",
                ip_address="127.0.0.1"
            )
            db.add(audit)
            db.commit()
            return {"status": "success", "file": backup_file}
        else:
            return {"status": "failed", "error": result.stderr.decode()}
    finally:
        db.close()

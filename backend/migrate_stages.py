import json
from sqlalchemy import text
from app.db.base import SessionLocal

DEPLOYMENT_STAGES = [
    "Initiated",
    "Device Received",
    "Box Prepared",
    "Kick Off Meeting Done",
    "Deployment in progress",
    "Preparing UAT/FAT/Documentation",
    "Waiting for signature",
    "Complete",
]

POC_STAGES = [
    "Initiated",
    "Box allocated",
    "Box prepared",
    "Pre-POC Meeting Done",
    "Deployment pending",
    "Deployment in progress",
    "Review Policy",
    "Collect Report",
    "POC Complete",
    "Post POC Meeting",
    "Complete",
    "Change to deployment",
]

def migrate():
    db = SessionLocal()
    try:
        # Add column if not exists
        db.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS stage_statuses JSONB;"))
        db.commit()

        # Fetch all deployments
        result = db.execute(text("SELECT id, deployment_type, pre_poc_status, poc_status, post_poc_status, kickoff_status, materials_status, uat_fat_status, stage_statuses FROM deployments;"))
        rows = result.fetchall()

        updated_count = 0
        for row in rows:
            dep_id = row[0]
            dep_type = row[1]
            pre_poc_st = (row[2] or "").lower()
            poc_st = (row[3] or "").lower()
            post_poc_st = (row[4] or "").lower()
            kickoff_st = (row[5] or "").lower()
            materials_st = (row[6] or "").lower()
            uat_fat_st = (row[7] or "").lower()
            existing_stages = row[8]

            stages = POC_STAGES if dep_type == "POC" else DEPLOYMENT_STAGES
            stage_map = {}

            # Populate initial stage_map from legacy fields or default
            highest_completed_idx = 0

            if dep_type == "POC":
                if pre_poc_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 3) # Pre-POC Meeting Done
                elif pre_poc_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Pre-POC Meeting Done"] = "pending"

                if poc_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 8) # POC Complete
                elif poc_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Deployment in progress"] = "pending"

                if post_poc_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 10) # Post POC Meeting
                elif post_poc_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Post POC Meeting"] = "pending"
            else:
                if kickoff_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 3) # Kick Off Meeting Done
                elif kickoff_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Kick Off Meeting Done"] = "pending"

                if materials_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 2) # Box Prepared
                elif materials_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Box Prepared"] = "pending"

                if uat_fat_st in ["done", "complete", "completed"]:
                    highest_completed_idx = max(highest_completed_idx, 7) # Complete
                elif uat_fat_st in ["in progress", "pending", "follow-up"]:
                    stage_map["Preparing UAT/FAT/Documentation"] = "pending"

            # Always mark Initiated as complete by default
            for i, st_name in enumerate(stages):
                if i <= highest_completed_idx:
                    stage_map[st_name] = "complete"
                elif st_name not in stage_map:
                    stage_map[st_name] = "not_started"

            db.execute(
                text("UPDATE deployments SET stage_statuses = :stages WHERE id = :id;"),
                {"stages": json.dumps(stage_map), "id": dep_id}
            )
            updated_count += 1

        db.commit()
        print(f"Successfully migrated stage_statuses for {updated_count} deployments.")
    except Exception as e:
        db.rollback()
        print("Migration failed:", e)
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

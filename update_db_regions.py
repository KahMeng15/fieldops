import sys
import os
import json

# Add backend directory to sys.path to import app modules
sys.path.append(os.path.abspath('./backend'))

from app.db.session import SessionLocal
from app.models.lookup import LookupCategory
from app.api.endpoints.settings import DEFAULT_REGION_SETTINGS

def update_db():
    db = SessionLocal()
    try:
        setting_cat = db.query(LookupCategory).filter_by(name="region_settings").first()
        if setting_cat:
            setting_cat.description = json.dumps(DEFAULT_REGION_SETTINGS)
            db.commit()
            print("Successfully updated database with new regions!")
        else:
            print("No region_settings found in db, it will be created on next access.")
    finally:
        db.close()

if __name__ == "__main__":
    update_db()

from app.api.endpoints.settings import reset_deployment_field_settings
from app.db.base import SessionLocal
import json
from app.models import LookupCategory, LookupValue
from app.core.config import settings

db = SessionLocal()

# Set up fake user
class FakeRole:
    name = "admin"
class FakeUser:
    role = FakeRole()

async def run():
    res = await reset_deployment_field_settings(request=None, db=db, current_user=FakeUser())
    cat = db.query(LookupCategory).filter_by(name="deployment_field_settings").first()
    data = json.loads(cat.description)
    print("DB JSON options for lead_engineer:")
    print([f for f in data["fields"] if f["key"] == "lead_engineer"][0].get("options"))
    
    # check lookupvalues
    cat2 = db.query(LookupCategory).filter_by(name="field_lead_engineer").first()
    if cat2:
        vals = db.query(LookupValue).filter_by(category_id=cat2.id).all()
        print("LookupValues count for field_lead_engineer:", len(vals))

import asyncio
asyncio.run(run())

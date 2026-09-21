import json
import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List

class StateDistrictItem(BaseModel):
    state: str
    districts: List[str]

# add to backend/app/api/endpoints/settings.py

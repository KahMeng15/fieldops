import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, DateTime, Enum, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class Role(Base):
    __tablename__ = "roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    permissions = Column(JSONB, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Team(Base):
    __tablename__ = "teams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team")
    role = relationship("Role")

class Company(Base):
    __tablename__ = "companies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    locations = relationship("Location", back_populates="company", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="company")

class Location(Base):
    __tablename__ = "locations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    datacenter_tier = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    company = relationship("Company", back_populates="locations")
    deployments = relationship("Deployment", back_populates="location_rel")

class DeploymentType(str, enum.Enum):
    POC = "POC"
    Deployment = "Deployment"

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    deployed_product = Column(String, nullable=True)
    deployment_date = Column(DateTime, default=datetime.utcnow)
    internal_group_name = Column(String)
    customer_name = Column(String, index=True)
    location = Column(String)
    account_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    deployment_type = Column(String)
    pre_poc_status = Column(String)
    poc_status = Column(String)
    post_poc_status = Column(String)
    server_collected_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    company = relationship("Company", back_populates="deployments")
    location_rel = relationship("Location", back_populates="deployments")
    account_owner = relationship("User", foreign_keys=[account_owner_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    engineers = relationship("DeploymentEngineer", back_populates="deployment")
    loaned_items = relationship("LoanedItem", back_populates="deployment")
    credentials = relationship("Credential", back_populates="deployment")
    config_reports = relationship("ConfigReport", back_populates="deployment")

class EngineerRoleType(str, enum.Enum):
    lead_engineer = "lead_engineer"
    assisting_lead = "assisting_lead"
    field_engineer = "field_engineer"

class DeploymentEngineer(Base):
    __tablename__ = "deployment_engineers"
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role_type = Column(Enum(EngineerRoleType))
    assigned_at = Column(DateTime, default=datetime.utcnow)

    deployment = relationship("Deployment", back_populates="engineers")
    user = relationship("User")

class ItemType(str, enum.Enum):
    Server = "Server"
    Transceiver = "Transceiver"
    UTP = "UTP"
    Power_Cables = "Power Cables"

class ItemStatus(str, enum.Enum):
    loaned = "loaned"
    returned = "returned"
    lost = "lost"
    damaged = "damaged"

class LoanedItem(Base):
    __tablename__ = "loaned_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"))
    item_type = Column(Enum(ItemType))
    serial_number = Column(String, unique=True, index=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.loaned)
    loaned_at = Column(DateTime, default=datetime.utcnow)
    returned_at = Column(DateTime, nullable=True)
    expected_return_date = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    deployment = relationship("Deployment", back_populates="loaned_items")

class ReminderStatus(str, enum.Enum):
    pending = "pending"
    dismissed = "dismissed"
    snoozed = "snoozed"
    completed = "completed"

class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"))
    engineer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    trigger_date = Column(DateTime)
    status = Column(Enum(ReminderStatus), default=ReminderStatus.pending)
    snooze_count = Column(Integer, default=0)
    max_snoozes = Column(Integer, default=3)
    reminder_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    deployment = relationship("Deployment")
    engineer = relationship("User")

class Credential(Base):
    __tablename__ = "credentials"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"))
    credential_type = Column(String)
    label = Column(String)
    encrypted_payload = Column(LargeBinary)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    deployment = relationship("Deployment", back_populates="credentials")
    created_by = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String)
    resource_type = Column(String)
    resource_id = Column(UUID(as_uuid=True))
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    ip_address = Column(String)  # Using String for INET to avoid postgresql dialect issue if sqlite used in test
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text)
    
    user = relationship("User")

class LookupCategory(Base):
    __tablename__ = "lookup_categories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class LookupValue(Base):
    __tablename__ = "lookup_values"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("lookup_categories.id"))
    value = Column(String)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConfigReport(Base):
    __tablename__ = "config_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"))
    file_name = Column(String)
    minio_object_key = Column(String, unique=True)
    file_size_bytes = Column(Integer)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    deployment = relationship("Deployment", back_populates="config_reports")
    uploaded_by = relationship("User")

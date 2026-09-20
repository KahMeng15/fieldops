import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.base import Base, get_db
from app.models import User, Role, Team
from app.core.security import get_password_hash
import uuid

# SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]

@pytest.fixture
def admin_user(db):
    role = Role(name="admin", permissions=["create_deployment", "delete_deployment", "create_credential", "reveal_credential"])
    db.add(role)
    team = Team(name="HQ")
    db.add(team)
    db.commit()
    
    user = User(
        username="admin",
        email="admin@test.com",
        password_hash=get_password_hash("admin123"),
        role_id=role.id,
        team_id=team.id
    )
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def engineer_user(db):
    role = Role(name="engineer", permissions=["view_deployment"])
    db.add(role)
    team = Team(name="Field")
    db.add(team)
    db.commit()
    
    user = User(
        username="engineer",
        email="engineer@test.com",
        password_hash=get_password_hash("eng123"),
        role_id=role.id,
        team_id=team.id
    )
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def auth_headers(client, admin_user):
    response = client.post("/api/auth/login", json={"username": admin_user.username, "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def engineer_headers(client, engineer_user):
    response = client.post("/api/auth/login", json={"username": engineer_user.username, "password": "eng123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

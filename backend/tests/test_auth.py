import pytest
from fastapi.testclient import TestClient

def test_login_success(client: TestClient, admin_user):
    response = client.post("/api/auth/login", json={
        "username": admin_user.username,
        "password": "admin123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials(client: TestClient):
    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong"
    })
    assert response.status_code == 401

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sanity_check():
    assert True

def test_app_can_import():
    assert app is not None

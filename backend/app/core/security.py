import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta
from typing import Any

from jose import jwt

from app.core.config import settings

SECURITY_FILE = "/app/data/security.json"
ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None


def get_password_hash(password: str, salt: str | None = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    # Simple SHA256 with salt
    hash_obj = hashlib.sha256((password + salt).encode("utf-8"))
    return f"{salt}${hash_obj.hexdigest()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, hash_val = hashed_password.split("$")
        return get_password_hash(plain_password, salt) == hashed_password
    except ValueError:
        return False


def is_setup() -> bool:
    return os.path.exists(SECURITY_FILE)


def setup_password(password: str):
    hashed = get_password_hash(password)
    os.makedirs(os.path.dirname(SECURITY_FILE), exist_ok=True)
    with open(SECURITY_FILE, "w") as f:
        json.dump({"hashed_password": hashed}, f)


def check_password(password: str) -> bool:
    if not is_setup():
        return False
    try:
        with open(SECURITY_FILE) as f:
            data = json.load(f)
            return verify_password(password, data.get("hashed_password", ""))
    except Exception:
        return False

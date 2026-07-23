import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta
from typing import Any

from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 100_000


def get_security_file_path() -> str:
    return os.path.join(settings.DATA_DIR, "security.json")


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
    # Strong PBKDF2-HMAC-SHA256 with 100,000 iterations
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    )
    return f"pbkdf2${salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        parts = hashed_password.split("$")
        if len(parts) == 3 and parts[0] == "pbkdf2":
            salt = parts[1]
            return get_password_hash(plain_password, salt) == hashed_password
        elif len(parts) == 2:
            # Fallback backward compatibility for legacy SHA256 hashes
            salt, hash_val = parts
            legacy_hash = hashlib.sha256(
                (plain_password + salt).encode("utf-8")
            ).hexdigest()
            return legacy_hash == hash_val
        return False
    except ValueError:
        return False


def is_setup() -> bool:
    return os.path.exists(get_security_file_path())


def setup_password(password: str):
    hashed = get_password_hash(password)
    sec_path = get_security_file_path()
    os.makedirs(os.path.dirname(sec_path), exist_ok=True)
    tmp_path = f"{sec_path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump({"hashed_password": hashed}, f, indent=2)
    os.replace(tmp_path, sec_path)


def check_password(password: str) -> bool:
    sec_path = get_security_file_path()
    if not is_setup():
        return False
    try:
        with open(sec_path, encoding="utf-8") as f:
            data = json.load(f)
            return verify_password(password, data.get("hashed_password", ""))
    except Exception:
        return False

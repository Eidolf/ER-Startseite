import hashlib
import json
import os
import secrets
from typing import Optional

SECURITY_FILE = "/app/data/security.json"


def get_password_hash(password: str, salt: Optional[str] = None) -> str:
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

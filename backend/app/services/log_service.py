import datetime
from collections import deque
from typing import Any

_MAX_LOGS = 500
_LOG_BUFFER: deque[dict[str, Any]] = deque(maxlen=_MAX_LOGS)
_SYSTEM_LOG_LEVEL = "INFO"

_LEVEL_SEVERITY = {
    "DEBUG": 10,
    "INFO": 20,
    "WARNING": 30,
    "ERROR": 40,
}


def add_system_log(level: str, message: str, details: dict[str, Any] | None = None):
    """Adds a log entry to the in-memory log buffer."""
    level_upper = level.upper()
    iso_now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    entry = {
        "timestamp": iso_now,
        "level": level_upper,
        "message": message,
        "details": details or {},
    }
    _LOG_BUFFER.appendleft(entry)


def get_system_logs(min_level: str = "DEBUG", limit: int = 100) -> list[dict[str, Any]]:
    """Retrieves logs filtered by minimum log level."""
    target_sev = _LEVEL_SEVERITY.get(min_level.upper(), 10)
    result: list[dict[str, Any]] = []

    for entry in _LOG_BUFFER:
        entry_sev = _LEVEL_SEVERITY.get(entry["level"], 20)
        if entry_sev >= target_sev:
            result.append(entry)
            if len(result) >= limit:
                break

    return result


def clear_system_logs():
    """Clears the log buffer."""
    _LOG_BUFFER.clear()


def set_system_log_level(level: str):
    """Sets the active system log level."""
    global _SYSTEM_LOG_LEVEL
    if level.upper() in _LEVEL_SEVERITY:
        _SYSTEM_LOG_LEVEL = level.upper()


def get_system_log_level() -> str:
    """Gets the active system log level."""
    return _SYSTEM_LOG_LEVEL

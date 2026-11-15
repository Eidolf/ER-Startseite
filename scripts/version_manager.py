#!/usr/bin/env python3
"""Calculate ER-Startseite release versions from stable Git tags."""

import argparse
import os
import re
import subprocess
import sys
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path

VERSION_FILE = Path("VERSION")
STABLE_TAG_PATTERN = re.compile(
    r"^v?(?P<year>\d{4})\.(?P<month>\d{1,2})\.(?P<patch>\d+)$"
)
RUN_ID_PATTERN = re.compile(r"^\d+(?:\.\d+)*$")
FILE_CONFIGS = (
    (VERSION_FILE, None),
    (Path("backend/pyproject.toml"), r'version = "[^"]+"'),
    (Path("frontend/package.json"), r'"version": "[^"]+"'),
)


def parse_stable_tag(tag: str) -> tuple[int, int, int] | None:
    """Parse stable CalVer tags, including historical unprefixed tags."""
    match = STABLE_TAG_PATTERN.fullmatch(tag)
    if match is None:
        return None

    version = (
        int(match.group("year")),
        int(match.group("month")),
        int(match.group("patch")),
    )
    if version[0] < 1 or not 1 <= version[1] <= 12 or version[2] < 1:
        return None
    return version


def get_git_tags() -> list[str]:
    """Return repository tags, failing rather than silently using VERSION."""
    try:
        result = subprocess.run(
            ["git", "tag", "--list"],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as error:
        raise RuntimeError("Git is required to determine the stable version.") from error
    except subprocess.CalledProcessError as error:
        detail = error.stderr.strip() or str(error)
        raise RuntimeError(f"Unable to read Git tags: {detail}") from error
    return result.stdout.splitlines()


def calculate_next_version(
    release_type: str,
    tags: Iterable[str],
    now: datetime | None = None,
    run_id: str | None = None,
) -> str:
    """Return a stable candidate or unique nightly candidate based on stable tags."""
    if release_type not in {"stable", "nightly"}:
        raise ValueError(f"Unsupported release type: {release_type}")

    current_time = datetime.now(timezone.utc) if now is None else now
    if current_time.tzinfo is None:
        raise ValueError("The supplied time must include a timezone.")
    current_time = current_time.astimezone(timezone.utc)
    current_period = (current_time.year, current_time.month)

    stable_versions = [
        version for tag in tags if (version := parse_stable_tag(tag)) is not None
    ]
    latest_stable = max(stable_versions, default=None)
    if latest_stable is not None and latest_stable[:2] > current_period:
        raise ValueError(
            "The latest stable tag is in a future UTC month; refusing to create "
            "a version that would move backwards."
        )

    patch = (
        latest_stable[2] + 1
        if latest_stable is not None and latest_stable[:2] == current_period
        else 1
    )
    base_version = f"{current_time.year}.{current_time.month}.{patch}"
    if release_type == "stable":
        return base_version

    if run_id is None or RUN_ID_PATTERN.fullmatch(run_id) is None:
        raise ValueError("Nightly releases require a numeric unique run ID.")
    timestamp = current_time.strftime("%Y%m%d.%H%M")
    return f"{base_version}-nightly.{timestamp}.{run_id}"


def read_version() -> str:
    if not VERSION_FILE.exists():
        raise FileNotFoundError(f"{VERSION_FILE} not found.")
    return VERSION_FILE.read_text(encoding="utf-8").strip()


def write_version(version: str) -> None:
    """Update VERSION and the product's Python and frontend version mirrors."""
    if parse_stable_tag(version) is None or version.startswith("v"):
        raise ValueError(f"VERSION must be a stable CalVer version, got {version!r}.")

    staged_updates: list[tuple[Path, str, str]] = []
    for path, pattern in FILE_CONFIGS:
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        if pattern is None:
            updated = f"{version}\n"
        else:
            if re.search(pattern, content) is None:
                raise ValueError(f"Pattern {pattern!r} not found in {path}.")
            updated = re.sub(
                pattern,
                lambda _: (
                    f'version = "{version}"'
                    if path.name == "pyproject.toml"
                    else f'"version": "{version}"'
                ),
                content,
                count=1,
            )
        staged_updates.append((path, content, updated))

    backups: dict[Path, str] = {}
    applied: list[Path] = []
    try:
        for path, old_content, updated in staged_updates:
            temporary_path = path.with_name(f".tmp_{path.name}")
            temporary_path.write_text(updated, encoding="utf-8")
            backups[path] = old_content
            os.replace(temporary_path, path)
            applied.append(path)
    except OSError as error:
        for path in applied:
            path.write_text(backups[path], encoding="utf-8")
        raise OSError(f"Unable to update version files: {error}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--action",
        required=True,
        choices=("get-current", "calculate", "write"),
    )
    parser.add_argument("--type", choices=("stable", "nightly"))
    parser.add_argument("--run-id")
    parser.add_argument("--version")
    args = parser.parse_args()

    try:
        if args.action == "get-current":
            print(read_version())
        elif args.action == "calculate":
            if args.type is None:
                parser.error("--type is required for calculate.")
            version = calculate_next_version(
                args.type,
                get_git_tags(),
                run_id=args.run_id,
            )
            print(version)
        else:
            if args.version is None:
                parser.error("--version is required for write.")
            write_version(args.version)
    except (FileNotFoundError, OSError, RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()

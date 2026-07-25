#!/usr/bin/env python3
import datetime
import argparse
import sys
import os
import re

VERSION_FILE = 'VERSION'

def get_current_date():
    return datetime.datetime.now(datetime.timezone.utc)

def read_version():
    if not os.path.exists(VERSION_FILE):
        print(f"Error: {VERSION_FILE} not found.", file=sys.stderr)
        sys.exit(1)
    with open(VERSION_FILE, 'r') as f:
        return f.read().strip()

def write_version(version):
    if not isinstance(version, str) or not re.match(r'^\d{4}\.\d{1,2}\.\d+(?:-[a-zA-Z0-9.\-+]+)?$', version.strip()):
        print(f"Error: Invalid version format: {version!r}. Version must match release format (e.g. 2026.7.1 or 2026.7.1-beta).", file=sys.stderr)
        sys.exit(1)

    version = version.strip()

    file_configs = [
        (VERSION_FILE, None, f"{version}\n"),
        ('backend/pyproject.toml', r'version = "[^"]+"', f'version = "{version}"'),
        ('frontend/package.json', r'"version": "[^"]+"', f'"version": "{version}"'),
    ]

    staged_updates = []
    backups = {}

    for path, pattern, replacement in file_configs:
        if not os.path.exists(path):
            continue
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except OSError as e:
            print(f"Error reading {path}: {e}", file=sys.stderr)
            sys.exit(1)

        if pattern is None:
            new_content = replacement
        else:
            if not re.search(pattern, content):
                print(f"Error: Pattern {pattern!r} not found in {path}", file=sys.stderr)
                sys.exit(1)
            new_content = re.sub(pattern, replacement, content, count=1)

        staged_updates.append((path, content, new_content))

    applied_files = []
    try:
        for path, old_content, new_content in staged_updates:
            dir_name = os.path.dirname(path) or '.'
            tmp_path = os.path.join(dir_name, f".tmp_{os.path.basename(path)}")

            with open(tmp_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            backups[path] = old_content
            os.replace(tmp_path, path)
            applied_files.append(path)
            print(f"Updated {path} version to {version}")

    except Exception as e:
        print(f"Error during version update: {e}. Rolling back...", file=sys.stderr)
        for path in applied_files:
            try:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(backups[path])
            except Exception as rollback_err:
                print(f"Critical error rolling back {path}: {rollback_err}", file=sys.stderr)
        sys.exit(1)

def parse_version(version_str):
    # Regex for YYYY.MM.Patch(-Suffix)?
    match = re.match(r'^(\d{4})\.(\d{1,2})\.(\d+)(?:-(.+))?$', version_str)
    if not match:
        raise ValueError(f"Invalid version format: {version_str}")
    
    year = int(match.group(1))
    month = int(match.group(2))
    patch = int(match.group(3))
    suffix = match.group(4)
    
    return year, month, patch, suffix

def calculate_next_version(release_type):
    current_version_str = read_version()
    now = get_current_date()
    current_year, current_month = now.year, now.month
    
    try:
        v_year, v_month, v_patch, v_suffix = parse_version(current_version_str)
    except ValueError:
        v_year, v_month, v_patch, v_suffix = 0, 0, 0, None

    # Determine "Base" patch level
    if v_year == current_year and v_month == current_month:
        if v_suffix and 'dev' in v_suffix:
            # If we are on a dev version (e.g. 2025.12.0-dev), it means we are working towards 2025.12.0.
            # So for the release, we keep the patch.
            new_patch = v_patch
        else:
            # If we are on a stable version (2025.12.0) or beta (2025.12.0-beta),
            # and we want a NEW release, typically we increment.
            # However, if 2025.12.0-beta exists, and we want 2025.12.0 (Stable),
            # we should reuse the patch.
            
            # Simple logic:
            # If we are bumping dev AFTER release, v_suffix will be 'dev'.
            # If v_suffix is 'beta', we usually want to move to stable (same patch) or next beta.
            # Strategy: If suffix is present (dev/beta), keep patch.
            # If suffix is empty (stable), increment patch.
            if v_suffix:
                new_patch = v_patch
            else:
                new_patch = v_patch + 1
    else:
        new_patch = 1 # Reset on new month
        
    base = f"{current_year}.{current_month}.{new_patch}"
    
    if release_type == 'stable':
        return base
    elif release_type == 'beta':
        return f"{base}-beta"
    elif release_type == 'nightly':
        timestamp = now.strftime('%Y%m%d.%H%M')
        return f"{base}-nightly.{timestamp}"
    else:
        raise ValueError("Unknown release type")

def bump_dev_version():
    current_version_str = read_version()
    now = get_current_date()
    
    try:
        year, month, patch, suffix = parse_version(current_version_str)
    except ValueError:
        # If invalid (e.g. nightly), rely on date
        return f"{now.year}.{now.month}.1-dev"

    # Always increment patch for next dev cycle
    new_patch = patch + 1
    
    # Handle Year/Month rollover just in case script runs across month boundary
    if year != now.year or month != now.month:
        return f"{now.year}.{now.month}.1-dev"
        
    return f"{year}.{month}.{new_patch}-dev"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', required=True, choices=['get-current', 'calculate', 'bump-dev', 'write'])
    parser.add_argument('--type', choices=['stable', 'beta', 'nightly'], help='Release type for calculation')
    parser.add_argument('--version', help='Version to write')
    
    args = parser.parse_args()
    
    if args.action == 'get-current':
        print(read_version())
            
    elif args.action == 'calculate':
        if not args.type:
            print("Error: --type required for calculate", file=sys.stderr)
            sys.exit(1)
        new_v = calculate_next_version(args.type)
        print(new_v)
        
    elif args.action == 'bump-dev':
        new_v = bump_dev_version()
        print(new_v)
        
    elif args.action == 'write':
        if not args.version:
             print("Error: --version required for write", file=sys.stderr)
             sys.exit(1)
        write_version(args.version)

if __name__ == '__main__':
    main()

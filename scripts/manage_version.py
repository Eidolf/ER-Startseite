#!/usr/bin/env python3
import sys
import re
import argparse

VERSION_FILE = "VERSION"

def read_version():
    try:
        with open(VERSION_FILE, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "0.0.0"

def write_version(version):
    with open(VERSION_FILE, "w") as f:
        f.write(version)

def parse_version(version_str):
    # Regex for SemVer (simplified)
    # Match: Major.Minor.Patch(-Prerelease)?
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$", version_str)
    if not match:
        raise ValueError(f"Invalid version string: {version_str}")
    return {
        "major": int(match.group(1)),
        "minor": int(match.group(2)),
        "patch": int(match.group(3)),
        "prerelease": match.group(4)
    }

def bump_version(current_str, bump_type, prerelease_tag=None):
    v = parse_version(current_str)
    
    if bump_type == "major":
        v["major"] += 1
        v["minor"] = 0
        v["patch"] = 0
        v["prerelease"] = None
    elif bump_type == "minor":
        v["minor"] += 1
        v["patch"] = 0
        v["prerelease"] = None
    elif bump_type == "patch":
        v["patch"] += 1
        v["prerelease"] = None
    elif bump_type == "beta":
        # Logic for beta bump
        # If already beta, bump the beta number (e.g. beta.1 -> beta.2)
        # If not, append -beta.1
        if v["prerelease"] and v["prerelease"].startswith(prerelease_tag or "beta"):
             parts = v["prerelease"].split('.')
             if len(parts) > 1 and parts[-1].isdigit():
                 new_num = int(parts[-1]) + 1
                 v["prerelease"] = f"{parts[0]}.{new_num}"
             else:
                 v["prerelease"] = f"{prerelease_tag or 'beta'}.1"
        else:
            v["prerelease"] = f"{prerelease_tag or 'beta'}.1"
    elif bump_type == "dev":
         # Bump to next patch version + dev
         # Only if not already prerelease, or handling specific dev logic
         # User asked for "bump to next development version"
         # Usually means 1.0.0 -> 1.0.1-dev
         if not v["prerelease"]:
             v["patch"] += 1
         v["prerelease"] = "dev"
    
    new_version = f"{v['major']}.{v['minor']}.{v['patch']}"
    if v["prerelease"]:
        new_version += f"-{v['prerelease']}"
    
    return new_version

def main():
    parser = argparse.ArgumentParser(description="Manage project version")
    parser.add_argument("action", choices=["read", "bump"])
    parser.add_argument("--type", choices=["major", "minor", "patch", "beta", "dev"], help="Type of bump")
    parser.add_argument("--tag", default="beta", help="Prerelease tag (default: beta)")
    
    args = parser.parse_args()
    
    current = read_version()
    
    if args.action == "read":
        print(current)
    elif args.action == "bump":
        if not args.type:
            print("Error: --type is required for bump action")
            sys.exit(1)
        new_v = bump_version(current, args.type, args.tag)
        write_version(new_v)
        print(new_v)

if __name__ == "__main__":
    main()

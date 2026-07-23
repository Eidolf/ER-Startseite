#!/usr/bin/env python3
"""
Manifest Generator for ER-Startseite.
Scans the codebase to generate project_manifest.json idempotently.
"""

import ast
import json
import os
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def get_file_tree() -> dict[str, str]:
    """Generates file tree mappings for core project directories and files."""
    return {
        "backend": "FastAPI backend service directory",
        "backend/app/main.py": "Main FastAPI application entry point and global routes",
        "backend/app/api/v1/router.py": "Central API router aggregating v1 endpoint modules",
        "backend/app/api/v1/endpoints": "Endpoint handler modules (apps, auth, config, media, proxy, registry)",
        "backend/app/core": "Core configuration, security, exceptions, and premium app definitions",
        "backend/app/schemas": "Pydantic data validation and serialization models",
        "backend/app/services": "Business logic services (AppService, AuthService, ConfigService, RegistryService)",
        "backend/app/repositories": "Persistence layer handling JSON-file storage repositories",
        "frontend": "React TypeScript frontend application directory",
        "frontend/src/main.tsx": "Frontend application entry point rendering App root",
        "frontend/src/App.tsx": "Main application dashboard component with grid layout and state",
        "frontend/src/components": "UI components for app tiles, modals, settings, and widgets",
        "frontend/src/components/widgets": "Dashboard widgets (ClockWidget, WeatherWidget, CalendarWidget)",
        "frontend/src/hooks": "Custom React hooks (useAppStats)",
        "frontend/src/registries": "Service-specific API integrations for Arr stack and home services",
        "frontend/src/utils": "Utility modules including fetchProxy for CORS-safe API calls",
        "data": "Persistent data storage directory for config.json and apps.json",
        "docs": "Documentation directory containing setup and architecture guides",
        "scripts": "Utility and build maintenance scripts",
        "docker-compose.yml": "Docker Compose configuration for local development",
        "Makefile": "Developer shortcut commands for installation, linting, and testing",
        "check-prepush.sh": "Pre-flight validation script enforcing code quality before git push"
    }


def parse_backend_models() -> dict:
    """Parses Pydantic schema models from backend/app/schemas and backend/app/core."""
    models = {}
    target_files = [
        ROOT_DIR / "backend" / "app" / "schemas" / "app.py",
        ROOT_DIR / "backend" / "app" / "schemas" / "config.py",
        ROOT_DIR / "backend" / "app" / "schemas" / "common.py",
        ROOT_DIR / "backend" / "app" / "core" / "premium_apps.py"
    ]

    for filepath in target_files:
        if not filepath.exists():
            continue
        rel_path = filepath.relative_to(ROOT_DIR).as_posix()
        tree = ast.parse(filepath.read_text(encoding="utf-8"))

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                base_names = [b.id for b in node.bases if isinstance(b, ast.Name)]
                if "BaseModel" in base_names or any("Base" in name for name in base_names):
                    fields = {}
                    for item in node.body:
                        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                            field_name = item.target.id
                            field_type = ast.unparse(item.annotation) if hasattr(ast, "unparse") else "Any"
                            fields[field_name] = field_type

                    models[node.name] = {
                        "file": rel_path,
                        "fields": fields,
                        "relationships": []
                    }
    return models


def parse_backend_services() -> dict:
    """Parses Service classes and methods from backend/app/services."""
    services = {}
    services_dir = ROOT_DIR / "backend" / "app" / "services"

    if not services_dir.exists():
        return services

    for filepath in services_dir.glob("*.py"):
        if filepath.name == "__init__.py":
            continue
        rel_path = filepath.relative_to(ROOT_DIR).as_posix()
        tree = ast.parse(filepath.read_text(encoding="utf-8"))

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and "Service" in node.name:
                methods = []
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        if item.name.startswith("_"):
                            continue
                        doc = ast.get_docstring(item) or f"Execute {item.name}"
                        sig_args = [arg.arg for arg in item.args.args if arg.arg != "self"]
                        signature = f"{item.name}({', '.join(sig_args)})"
                        methods.append({
                            "name": item.name,
                            "signature": signature,
                            "description": doc.split("\n")[0]
                        })

                services[node.name] = {
                    "file": rel_path,
                    "methods": methods
                }
    return services


def parse_backend_endpoints() -> list:
    """Parses API endpoints from FastAPI router files."""
    endpoints = []
    endpoints_dir = ROOT_DIR / "backend" / "app" / "api" / "v1" / "endpoints"

    prefix_map = {
        "apps.py": "/api/v1/apps",
        "auth.py": "/api/v1/auth",
        "config.py": "/api/v1/config",
        "media.py": "/api/v1/media",
        "proxy.py": "/api/v1/proxy",
        "registry.py": "/api/v1/registry"
    }

    if endpoints_dir.exists():
        for filepath in sorted(endpoints_dir.glob("*.py")):
            if filepath.name == "__init__.py":
                continue
            base_prefix = prefix_map.get(filepath.name, "/api/v1")
            rel_path = filepath.relative_to(ROOT_DIR).as_posix()
            content = filepath.read_text(encoding="utf-8")
            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute):
                            if decorator.func.attr in ["get", "post", "put", "delete", "patch"]:
                                method = decorator.func.attr.upper()
                                route_subpath = ""
                                if decorator.args:
                                    if isinstance(decorator.args[0], ast.Constant):
                                        route_subpath = decorator.args[0].value

                                full_path = f"{base_prefix}{route_subpath}".rstrip("/")
                                if not full_path:
                                    full_path = base_prefix

                                doc = ast.get_docstring(node) or f"{method} {full_path}"
                                summary = doc.split("\n")[0].strip()

                                response_model = "dict"
                                for kw in decorator.keywords:
                                    if kw.arg == "response_model":
                                        response_model = ast.unparse(kw.value) if hasattr(ast, "unparse") else "Schema"

                                endpoints.append({
                                    "path": full_path,
                                    "method": method,
                                    "summary": summary,
                                    "description": doc.strip(),
                                    "request_model": None,
                                    "response_model": response_model,
                                    "file": rel_path
                                })

    main_file = ROOT_DIR / "backend" / "app" / "main.py"
    if main_file.exists():
        rel_path = main_file.relative_to(ROOT_DIR).as_posix()
        main_endpoints = [
            {"path": "/health", "method": "GET", "summary": "Health check endpoint", "description": "Returns status, service name, and version", "request_model": None, "response_model": "dict", "file": rel_path},
            {"path": "/ready", "method": "GET", "summary": "Readiness check endpoint", "description": "Returns readiness status", "request_model": None, "response_model": "dict", "file": rel_path},
            {"path": "/manifest.webmanifest", "method": "GET", "summary": "Web App Manifest", "description": "Generates PWA webmanifest dynamically based on config", "request_model": None, "response_model": "dict", "file": rel_path}
        ]
        endpoints.extend(main_endpoints)

    return sorted(endpoints, key=lambda x: (x["path"], x["method"]))


def parse_frontend_assets() -> dict:
    """Parses frontend components, hooks, and routes."""
    components = {}
    hooks = {}
    routes = {
        "/": "App"
    }

    comp_dir = ROOT_DIR / "frontend" / "src" / "components"
    if comp_dir.exists():
        for filepath in sorted(comp_dir.rglob("*.tsx")):
            rel_path = filepath.relative_to(ROOT_DIR).as_posix()
            comp_name = filepath.stem
            components[comp_name] = {
                "file": rel_path,
                "description": f"UI Component {comp_name} for dashboard view or modal dialog"
            }

    hooks_dir = ROOT_DIR / "frontend" / "src" / "hooks"
    if hooks_dir.exists():
        for filepath in sorted(hooks_dir.glob("*.ts*")):
            rel_path = filepath.relative_to(ROOT_DIR).as_posix()
            hook_name = filepath.stem
            hooks[hook_name] = {
                "file": rel_path,
                "description": f"React hook {hook_name} for managing component state and stats fetching"
            }

    return {
        "components": components,
        "hooks": hooks,
        "routes": routes
    }


def generate_manifest() -> dict:
    """Assembles the full manifest dictionary."""
    return {
        "metadata": {
            "name": "ER-Startseite",
            "description": "Customizable self-hosted homepage dashboard and application launcher",
            "entry_points": {
                "backend": "backend/app/main.py",
                "frontend": "frontend/src/main.tsx"
            }
        },
        "file_tree": get_file_tree(),
        "db_models": parse_backend_models(),
        "services": parse_backend_services(),
        "endpoints": parse_backend_endpoints(),
        "frontend": parse_frontend_assets()
    }


def main():
    manifest_path = ROOT_DIR / "project_manifest.json"
    new_data = generate_manifest()

    if manifest_path.exists():
        try:
            existing_text = manifest_path.read_text(encoding="utf-8")
            existing_data = json.loads(existing_text)

            if existing_data == new_data:
                print("project_manifest.json is up-to-date. Skipping write.")
                return
        except Exception:
            pass

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(new_data, f, indent=2)
        f.write("\n")

    print(f"Successfully generated {manifest_path.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()

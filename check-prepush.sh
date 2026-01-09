#!/bin/bash
set -e

echo "🛫 Initiating Pre-Flight Checks..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

run_step() {
    echo "---------------------------------------------------"
    echo "👉 Running: $1"
    if eval "$2"; then
        echo -e "${GREEN}✅ PASSED: $1${NC}"
        ((pass_count+=1))
    else
        echo -e "${RED}❌ FAILED: $1${NC}"
        ((fail_count+=1))
        if [ "$3" == "critical" ]; then
            echo "🛑 Critical failure. Aborting."
            exit 1
        fi
    fi
}

# 1. Backend Checks
echo "Use 'poetry run' for python commands if needed."
run_step "Backend: Ruff Lint" "(cd backend && poetry run ruff check .)" "critical"
run_step "Backend: Black Format Check" "(cd backend && poetry run black --check .)" "critical"

# Optional Mypy (can be strict, allowing failure for now if config isn't strict yet)
# We use '|| true' to not crash script unless we want strict compliance
# Based on earlier task, user wanted to fix mypy errors, so we treat it as critical.
run_step "Backend: Mypy Type Check" "(cd backend && poetry run mypy .)" "critical"

# 2. Frontend Checks
run_step "Frontend: ESLint" "(cd frontend && npm run lint)" "critical"
run_step "Frontend: Build (Dry Run)" "(cd frontend && npm run build)" "critical"

# 3. Workflow Linting (actionlint)
if command -v actionlint >/dev/null 2>&1; then
    run_step "Workflow Lint: actionlint (local)" "actionlint" "critical"
elif command -v docker >/dev/null 2>&1; then
    # Fallback to docker if actionlint not installed locally
    echo "🤔 'actionlint' not found locally. Using Docker..."
    # Using rhysd/actionlint
    run_step "Workflow Lint: actionlint (docker)" "docker run --rm -v $(pwd):/repo --workdir /repo rhysd/actionlint:latest -color" "critical"
else
    echo "⚠️  'actionlint' and 'docker' not found. Skipping workflow linting."
fi

# 4. GitHub Actions Simulation (via act)
# Only if act is available
if command -v act >/dev/null 2>&1; then

    echo "---------------------------------------------------"
    echo "🎬 Running GitHub Actions Simulation (act)..."
    # We run the 'build' job from ci-orchestrator.yml if it exists, or just default.
    # Assuming 'ci-orchestrator.yml' has a job named 'build-and-test' or similar.
    # We will list workflows to see what's available
    
    # Run specific event or job? "push" is default.
    # Warning: act runs in Docker.
    
    # Attempt to dry-run first to check parsing
    if act -n >/dev/null 2>&1; then
       # Run actual build. NOTE: This might take time.
       # We restrict to a specific job if possible to be faster, e.g. "build".
       # If uncertain of job names, run all for push event.
       run_step "GitHub Actions (act)" "act push -j validate --container-architecture linux/amd64" "optional"
    else
       echo -e "${RED}❌ act dry-run failed. Check workflow syntax.${NC}"
       ((fail_count++))
    fi
else
    echo "⚠️  'act' not found. Skipping full CI simulation."
fi

echo "---------------------------------------------------"
echo "🏁 Pre-Flight Summary"
echo "Passed: $pass_count"
echo "Failed: $fail_count"

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🚀 READY FOR TAKEOFF (PUSH)${NC}"
    exit 0
else
    echo -e "${RED}🚫 FIX ERRORS BEFORE PUSHING${NC}"
    exit 1
fi

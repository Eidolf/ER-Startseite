#!/bin/bash
set -e

# Fix permissions for data directories
# We recursively chown the data and uploads folders to the appuser (1001)
# This fixes the issue where bind-mounted folders are owned by root on the host
echo "Fixing permissions for /app/data and /app/uploads..."
chown -R appuser:appuser /app/data /app/uploads

# Drop privileges and run the command as appuser
# 'exec' ensures the process replaces the shell (PID 1 handling)
echo "Starting application as appuser..."
exec gosu appuser "$@"

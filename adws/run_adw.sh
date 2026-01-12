#!/bin/bash
# ADW Runner Script
# Usage: ./run_adw.sh <issue-number> [adw-id]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
source venv/bin/activate

# Run ADW
python adw_plan_build.py "$@"

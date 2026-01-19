#!/bin/bash
# Run ADW Test workflow for a GitHub issue
# Usage: ./run_adw_test.sh <issue-number> [adw-id] [--skip-e2e]
#
# This script runs the self-healing test loop:
# 1. Runs the test suite (/test)
# 2. If tests fail, attempts to fix them (/resolve_failed_test)
# 3. Re-runs tests up to 4 times
# 4. Reports results to the GitHub issue

cd "$(dirname "$0")/adws"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Please run:"
    echo "  cd adws && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment and run
source venv/bin/activate
python adw_test.py "$@"

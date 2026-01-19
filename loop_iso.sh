#!/bin/bash
#
# Ralph-TAC-7 Hybrid Loop with Worktree Isolation
#
# This combines Ralph's iterative loop approach with TAC-7's worktree isolation
# for safe, concurrent development workflows.
#
# Usage:
#   ./loop_iso.sh <issue-number>              # Full SDLC in isolated worktree
#   ./loop_iso.sh <issue-number> plan         # Plan only
#   ./loop_iso.sh <issue-number> build        # Build only (requires existing plan)
#   ./loop_iso.sh <issue-number> --heavy      # Use Opus model
#   ./loop_iso.sh <issue-number> --cleanup    # Remove worktree after completion
#
# Environment:
#   ANTHROPIC_API_KEY - Required
#   CLAUDE_CODE_PATH  - Optional, defaults to 'claude'
#   GITHUB_PAT        - Optional, for GitHub integration
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PATH="${CLAUDE_CODE_PATH:-claude}"
DEFAULT_MODEL="sonnet"
HEAVY_MODEL="opus"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
ISSUE_NUMBER=""
MODE="sdlc"  # Default: full SDLC (plan + build)
MODEL="$DEFAULT_MODEL"
CLEANUP=false
MAX_BUILD_ITERATIONS=20

while [[ $# -gt 0 ]]; do
    case $1 in
        plan)
            MODE="plan"
            shift
            ;;
        build)
            MODE="build"
            shift
            ;;
        --heavy)
            MODEL="$HEAVY_MODEL"
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        --max-iterations)
            MAX_BUILD_ITERATIONS=$2
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./loop_iso.sh <issue-number> [plan|build] [--heavy] [--cleanup]"
            echo ""
            echo "Modes:"
            echo "  (default)  Full SDLC - Plan then Build in isolated worktree"
            echo "  plan       Plan only - Create implementation plan"
            echo "  build      Build only - Execute existing plan"
            echo ""
            echo "Options:"
            echo "  --heavy        Use Opus model for complex reasoning"
            echo "  --cleanup      Remove worktree after completion"
            echo "  --max-iterations N  Max build iterations (default: 20)"
            echo ""
            echo "Examples:"
            echo "  ./loop_iso.sh 42              # Full SDLC for issue #42"
            echo "  ./loop_iso.sh 42 plan         # Plan only"
            echo "  ./loop_iso.sh 42 build        # Build from existing plan"
            echo "  ./loop_iso.sh 42 --heavy      # Use Opus model"
            exit 0
            ;;
        [0-9]*)
            ISSUE_NUMBER=$1
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate issue number
if [[ -z "$ISSUE_NUMBER" ]]; then
    echo -e "${RED}Error: Issue number required${NC}"
    echo "Usage: ./loop_iso.sh <issue-number> [plan|build] [--heavy] [--cleanup]"
    exit 1
fi

# Verify ANTHROPIC_API_KEY
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    echo -e "${RED}Error: ANTHROPIC_API_KEY not set${NC}"
    exit 1
fi

# Generate ADW ID
ADW_ID=$(openssl rand -hex 4)
WORKTREE_PATH="${SCRIPT_DIR}/trees/${ADW_ID}"
LOG_DIR="${SCRIPT_DIR}/agents/${ADW_ID}/logs"
STATE_FILE="${SCRIPT_DIR}/agents/${ADW_ID}/adw_state.json"

# Calculate ports (deterministic based on ADW ID)
PORT_OFFSET=$((16#${ADW_ID:0:4} % 15))
BACKEND_PORT=$((3100 + PORT_OFFSET))
FRONTEND_PORT=$((3200 + PORT_OFFSET))

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Marriage Ministry - Hybrid Ralph Loop              ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC} Issue:      ${GREEN}#${ISSUE_NUMBER}${NC}"
echo -e "${CYAN}║${NC} ADW ID:     ${GREEN}${ADW_ID}${NC}"
echo -e "${CYAN}║${NC} Mode:       ${GREEN}${MODE^^}${NC}"
echo -e "${CYAN}║${NC} Model:      ${GREEN}${MODEL}${NC}"
echo -e "${CYAN}║${NC} Worktree:   ${GREEN}${WORKTREE_PATH}${NC}"
echo -e "${CYAN}║${NC} Ports:      ${GREEN}Backend=${BACKEND_PORT}, Frontend=${FRONTEND_PORT}${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$STATE_FILE")"

# Function to save state
save_state() {
    local mode=$1
    local iteration=$2
    cat > "$STATE_FILE" << EOF
{
  "adw_id": "${ADW_ID}",
  "issue_number": "${ISSUE_NUMBER}",
  "worktree_path": "${WORKTREE_PATH}",
  "backend_port": ${BACKEND_PORT},
  "frontend_port": ${FRONTEND_PORT},
  "mode": "${mode}",
  "iteration": ${iteration},
  "model_set": "${MODEL}"
}
EOF
}

# Function to create worktree
create_worktree() {
    local branch_name="feature/issue-${ISSUE_NUMBER}-adw-${ADW_ID}"

    echo -e "${BLUE}Creating isolated worktree...${NC}"

    # Ensure trees directory exists
    mkdir -p "${SCRIPT_DIR}/trees"

    # Fetch latest from origin
    git -C "$SCRIPT_DIR" fetch origin main --quiet 2>/dev/null || true

    # Create branch from main
    git -C "$SCRIPT_DIR" branch "$branch_name" origin/main 2>/dev/null || \
        git -C "$SCRIPT_DIR" branch "$branch_name" main 2>/dev/null || true

    # Create worktree
    git -C "$SCRIPT_DIR" worktree add "$WORKTREE_PATH" "$branch_name" 2>/dev/null || {
        echo -e "${YELLOW}Worktree may already exist, continuing...${NC}"
    }

    # Copy environment files
    if [[ -f "${SCRIPT_DIR}/.env.local" ]]; then
        cp "${SCRIPT_DIR}/.env.local" "${WORKTREE_PATH}/.env.local"
    fi

    # Create ports configuration
    cat > "${WORKTREE_PATH}/.ports.env" << EOF
PORT=${BACKEND_PORT}
VITE_PORT=${FRONTEND_PORT}
DEV_SERVER_PORT=${FRONTEND_PORT}
EOF

    # Install dependencies
    echo -e "${BLUE}Installing dependencies in worktree...${NC}"
    (cd "$WORKTREE_PATH" && npm install --silent) || true

    echo -e "${GREEN}Worktree ready at ${WORKTREE_PATH}${NC}"
}

# Function to run planning loop
run_plan() {
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  PLANNING PHASE${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    save_state "plan" 1

    local log_file="${LOG_DIR}/plan_iter1.jsonl"
    local prompt_file="${WORKTREE_PATH}/PROMPT_plan.md"

    # Ensure prompt file exists
    if [[ ! -f "$prompt_file" ]]; then
        cp "${SCRIPT_DIR}/PROMPT_plan.md" "$prompt_file" 2>/dev/null || {
            echo -e "${RED}Error: PROMPT_plan.md not found${NC}"
            return 1
        }
    fi

    echo -e "${BLUE}Running planning agent...${NC}"

    # Execute Claude Code in the worktree
    (cd "$WORKTREE_PATH" && \
        "$CLAUDE_PATH" \
            -p "$(cat "$prompt_file")" \
            --model "$MODEL" \
            --output-format stream-json \
            --verbose \
            --dangerously-skip-permissions \
    ) > "$log_file" 2>&1

    local exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}Planning complete!${NC}"
        return 0
    else
        echo -e "${RED}Planning failed with exit code ${exit_code}${NC}"
        return 1
    fi
}

# Function to run building loop
run_build() {
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  BUILDING PHASE${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local iteration=0
    local prompt_file="${WORKTREE_PATH}/PROMPT_build.md"
    local plan_file="${WORKTREE_PATH}/IMPLEMENTATION_PLAN.md"

    # Ensure prompt file exists
    if [[ ! -f "$prompt_file" ]]; then
        cp "${SCRIPT_DIR}/PROMPT_build.md" "$prompt_file" 2>/dev/null || {
            echo -e "${RED}Error: PROMPT_build.md not found${NC}"
            return 1
        }
    fi

    # Check for implementation plan
    if [[ ! -f "$plan_file" ]]; then
        echo -e "${RED}Error: IMPLEMENTATION_PLAN.md not found. Run planning first.${NC}"
        return 1
    fi

    while true; do
        iteration=$((iteration + 1))

        echo -e "${BLUE}Build iteration ${iteration}/${MAX_BUILD_ITERATIONS}${NC}"

        save_state "build" $iteration

        # Check if all tasks are complete
        local remaining=$(grep -c '^\s*- \[ \]' "$plan_file" 2>/dev/null || echo "0")
        if [[ "$remaining" -eq 0 ]]; then
            echo -e "${GREEN}All tasks completed!${NC}"
            break
        fi
        echo -e "${BLUE}Remaining tasks: ${remaining}${NC}"

        # Check iteration limit
        if [[ $iteration -gt $MAX_BUILD_ITERATIONS ]]; then
            echo -e "${YELLOW}Max iterations (${MAX_BUILD_ITERATIONS}) reached${NC}"
            break
        fi

        local log_file="${LOG_DIR}/build_iter${iteration}.jsonl"

        # Execute Claude Code in the worktree
        (cd "$WORKTREE_PATH" && \
            "$CLAUDE_PATH" \
                -p "$(cat "$prompt_file")" \
                --model "$MODEL" \
                --output-format stream-json \
                --verbose \
                --dangerously-skip-permissions \
        ) > "$log_file" 2>&1 || {
            echo -e "${YELLOW}Iteration ${iteration} had issues, continuing...${NC}"
        }

        echo -e "${GREEN}Iteration ${iteration} complete${NC}"
        echo ""

        # Brief pause
        sleep 2
    done

    return 0
}

# Function to cleanup worktree
cleanup_worktree() {
    if [[ "$CLEANUP" == true ]]; then
        echo -e "${BLUE}Cleaning up worktree...${NC}"
        git -C "$SCRIPT_DIR" worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
        echo -e "${GREEN}Worktree removed${NC}"
    fi
}

# Main execution
main() {
    # Create worktree
    create_worktree

    # Copy Ralph files to worktree if they don't exist
    for file in AGENTS.md PROMPT_plan.md PROMPT_build.md; do
        if [[ -f "${SCRIPT_DIR}/${file}" && ! -f "${WORKTREE_PATH}/${file}" ]]; then
            cp "${SCRIPT_DIR}/${file}" "${WORKTREE_PATH}/${file}"
        fi
    done

    case "$MODE" in
        plan)
            run_plan
            ;;
        build)
            run_build
            ;;
        sdlc)
            run_plan && run_build
            ;;
    esac

    local exit_code=$?

    # Show summary
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Workflow Complete                       ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC} ADW ID:     ${BLUE}${ADW_ID}${NC}"
    echo -e "${GREEN}║${NC} Worktree:   ${BLUE}${WORKTREE_PATH}${NC}"
    echo -e "${GREEN}║${NC} Logs:       ${BLUE}${LOG_DIR}${NC}"
    echo -e "${GREEN}║${NC} State:      ${BLUE}${STATE_FILE}${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

    # Cleanup if requested
    cleanup_worktree

    return $exit_code
}

# Run main
main

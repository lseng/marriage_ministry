# Hybrid Ralph + TAC-7 Workflow

This project implements a hybrid AI-driven development workflow combining:
- **Ralph Playbook**: Iterative loop architecture, context management, disposable plans
- **TAC-7 ADW**: Worktree isolation, state persistence, model selection

## Quick Start

### Simple Loop (Ralph-style)
```bash
# Planning mode - analyze specs, create implementation plan
./loop.sh plan

# Building mode - execute tasks from plan
./loop.sh

# With Opus model for complex tasks
./loop.sh --heavy
```

### Isolated Loop (TAC-7-style)
```bash
# Full SDLC for GitHub issue in isolated worktree
./loop_iso.sh 42

# Plan only
./loop_iso.sh 42 plan

# Build only
./loop_iso.sh 42 build

# With Opus model
./loop_iso.sh 42 --heavy

# Cleanup worktree after completion
./loop_iso.sh 42 --cleanup
```

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operational learnings (how to build/run/validate) |
| `IMPLEMENTATION_PLAN.md` | Prioritized task list (generated, disposable) |
| `PROMPT_plan.md` | Planning mode instructions for Claude |
| `PROMPT_build.md` | Building mode instructions for Claude |
| `loop.sh` | Simple Ralph-style loop orchestration |
| `loop_iso.sh` | Isolated loop with worktrees (TAC-7-style) |
| `specs/` | Requirement specifications (source of truth) |

### ADW Modules

| Module | Purpose |
|--------|---------|
| `adws/worktree_ops.py` | Git worktree management for isolation |
| `adws/model_selection.py` | Base vs heavy model selection |
| `adws/state.py` | Persistent state management |
| `adws/agent.py` | Claude Code CLI execution |

## Workflow Phases

### 1. Planning Phase
```
PROMPT_plan.md → Claude → IMPLEMENTATION_PLAN.md
```

1. **Orient**: Study specs and current code using parallel subagents
2. **Gap Analysis**: Compare specs vs implementation
3. **Generate Plan**: Create prioritized task list
4. **Validate**: Ensure tasks are atomic

### 2. Building Phase
```
IMPLEMENTATION_PLAN.md → Claude → Code + Commits
```

1. **Select Task**: Pick most important uncompleted task
2. **Investigate**: Study relevant code (don't assume not implemented!)
3. **Implement**: Make changes following patterns
4. **Validate**: Run backpressure (lint, build, test)
5. **Update Plan**: Mark complete, note discoveries
6. **Commit**: Semantic commit with changes

## Key Principles

### Context Management (Ralph)
- **One task per loop**: Fresh context prevents pollution
- **40-60% utilization**: Stay in the "smart zone"
- **Subagents for parallel work**: Memory extension via garbage collection
- **Disposable plans**: Regenerate cheaply when stale

### Backpressure (Ralph + TAC-7)
```bash
# Run in order - all must pass
npm run lint     # 0 warnings required
npm run build    # No TypeScript errors
npm run test:run # All tests pass
```

### Worktree Isolation (TAC-7)
- Each workflow gets isolated `trees/{adw_id}/` directory
- Dedicated port allocation (backend: 3100-3114, frontend: 3200-3214)
- Up to 15 concurrent workflows
- State persists in `agents/{adw_id}/adw_state.json`

### Model Selection (TAC-7)
| Model Set | Model | Use Case |
|-----------|-------|----------|
| BASE | Sonnet | Fast tasks: commits, validation, classification |
| HEAVY | Opus | Complex tasks: implementation, documentation |

## State Management

### State File Structure
```json
{
  "adw_id": "abc12345",
  "issue_number": "42",
  "branch_name": "feature/issue-42-adw-abc12345",
  "plan_file": "IMPLEMENTATION_PLAN.md",
  "worktree_path": "trees/abc12345",
  "backend_port": 3105,
  "frontend_port": 3205,
  "mode": "build",
  "iteration": 3,
  "model_set": "heavy"
}
```

### Directory Structure
```
project-root/
├── trees/                    # Isolated worktrees
│   └── {adw_id}/            # Complete repo copy
├── agents/                   # Shared state & logs
│   └── {adw_id}/
│       ├── adw_state.json   # Persistent state
│       └── logs/            # Iteration logs
├── specs/                    # Requirement specs
│   └── *.md                 # One per topic
└── (ralph files)            # AGENTS.md, PROMPT_*.md, etc.
```

## Claude Commands

### `/ralph plan`
Run planning phase - analyze specs and create implementation plan.

### `/ralph build`
Run building phase - execute tasks from the plan.

### `/ralph task "description"`
Execute a single task without the loop mechanism.

### `/ralph sdlc`
Run full software development lifecycle (plan + build).

## Operational Learnings

Keep `AGENTS.md` updated with discoveries:
- Non-obvious build steps
- Patterns that prevent bugs
- Information that saves future loops time

**Keep it brief (~60 lines)**. Status belongs in `IMPLEMENTATION_PLAN.md`.

## Comparison: When to Use What

| Scenario | Use |
|----------|-----|
| Quick local development | `./loop.sh` |
| Feature from GitHub issue | `./loop_iso.sh <issue>` |
| Complex multi-step feature | `./loop.sh --heavy` |
| Multiple concurrent workflows | `./loop_iso.sh` (multiple instances) |
| Exploratory planning | `./loop.sh plan` |

## Troubleshooting

### Loop not progressing
1. Check `IMPLEMENTATION_PLAN.md` for uncompleted tasks
2. Verify backpressure is passing (`npm run lint && npm run build && npm run test:run`)
3. Check logs in `agents/loop_logs/` or `agents/{adw_id}/logs/`

### Worktree issues
```bash
# List all worktrees
git worktree list

# Remove stale worktree
git worktree remove trees/{adw_id} --force

# Prune all stale worktrees
git worktree prune
```

### Port conflicts
Ports are allocated deterministically from ADW ID. If conflicts occur:
1. Check running processes: `lsof -i :3100-3214`
2. Kill conflicting process or use different ADW ID

## Credits

- **Ralph Playbook** by Geoffrey Huntley - Loop architecture, context management
- **TAC-7 ADW** - Worktree isolation, state persistence, model selection

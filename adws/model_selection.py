#!/usr/bin/env python3
"""Model selection strategy for ADW workflows.

Provides intelligent model selection based on task complexity,
similar to TAC-7's base vs heavy model approach.

Model Sets:
- BASE: Sonnet - Optimized for speed and cost (simple tasks)
- HEAVY: Opus - Optimized for complex reasoning (implementation, documentation)

Usage:
    from model_selection import get_model, ModelSet

    # Get model for a specific command
    model = get_model("/implement")  # Returns "opus"
    model = get_model("/commit")     # Returns "sonnet"

    # Force a specific model set
    model = get_model("/implement", model_set=ModelSet.BASE)  # Returns "sonnet"
"""

from enum import Enum
from typing import Literal, Optional

ModelName = Literal["sonnet", "opus", "haiku"]


class ModelSet(Enum):
    """Model selection strategy."""
    BASE = "base"      # Sonnet - fast, cost-effective
    HEAVY = "heavy"    # Opus - complex reasoning


# Commands that should use Opus in HEAVY mode
# These require deeper reasoning, multi-step planning, or creative output
HEAVY_COMMANDS = {
    # Planning and implementation (complex reasoning)
    "/implement",
    "/feature",
    "/bug",
    "/chore",

    # Test resolution (requires understanding failure context)
    "/resolve_failed_test",
    "/resolve_failed_e2e_test",

    # Documentation (requires comprehensive analysis)
    "/document",
    "/prd",

    # Complex generation
    "/migration",
    "/edge_function",
}

# Commands that should always use fast model (Sonnet)
# These are straightforward, pattern-based tasks
FAST_COMMANDS = {
    # Classification and simple extraction
    "/classify_issue",
    "/find_plan_file",
    "/generate_branch_name",

    # Git operations
    "/commit",
    "/pull_request",

    # Simple validation
    "/validate",
    "/run_tests",
    "/design_audit",

    # Component generation (pattern-based)
    "/component",
    "/hook",
    "/rls_policy",
}

# Default model for each set
MODEL_SET_DEFAULTS: dict[ModelSet, ModelName] = {
    ModelSet.BASE: "sonnet",
    ModelSet.HEAVY: "opus",
}


def get_model(
    command: str,
    model_set: Optional[ModelSet] = None,
    force_model: Optional[ModelName] = None,
) -> ModelName:
    """Get the appropriate model for a command.

    Args:
        command: The slash command (e.g., "/implement")
        model_set: Optional model set override (BASE or HEAVY)
        force_model: Optional specific model override

    Returns:
        Model name to use ("sonnet", "opus", or "haiku")
    """
    # Force override takes precedence
    if force_model:
        return force_model

    # If model set specified, use its default
    if model_set:
        return MODEL_SET_DEFAULTS[model_set]

    # Auto-select based on command
    if command in HEAVY_COMMANDS:
        return "opus"
    elif command in FAST_COMMANDS:
        return "sonnet"
    else:
        # Default to sonnet for unknown commands (cost-effective)
        return "sonnet"


def get_model_set_for_command(command: str) -> ModelSet:
    """Get the recommended model set for a command.

    Args:
        command: The slash command

    Returns:
        Recommended model set (BASE or HEAVY)
    """
    if command in HEAVY_COMMANDS:
        return ModelSet.HEAVY
    return ModelSet.BASE


def estimate_cost_factor(model: ModelName) -> float:
    """Get relative cost factor for a model.

    Sonnet is baseline (1.0), other models scaled relative.

    Args:
        model: Model name

    Returns:
        Relative cost factor
    """
    factors = {
        "haiku": 0.04,   # ~25x cheaper than Sonnet
        "sonnet": 1.0,   # Baseline
        "opus": 15.0,    # ~15x more expensive than Sonnet
    }
    return factors.get(model, 1.0)


def format_model_info(model: ModelName, command: str) -> str:
    """Format model selection info for logging.

    Args:
        model: Selected model
        command: Command being executed

    Returns:
        Formatted info string
    """
    model_set = get_model_set_for_command(command)
    cost_factor = estimate_cost_factor(model)

    return (
        f"Model: {model} ({model_set.value} set) | "
        f"Command: {command} | "
        f"Cost factor: {cost_factor}x"
    )


# Convenience functions for common patterns
def is_heavy_task(command: str) -> bool:
    """Check if a command is considered a heavy task."""
    return command in HEAVY_COMMANDS


def get_planning_model(model_set: ModelSet = ModelSet.BASE) -> ModelName:
    """Get model for planning tasks."""
    return get_model("/chore", model_set=model_set)


def get_implementation_model(model_set: ModelSet = ModelSet.HEAVY) -> ModelName:
    """Get model for implementation tasks."""
    return get_model("/implement", model_set=model_set)


def get_test_model(model_set: ModelSet = ModelSet.BASE) -> ModelName:
    """Get model for test execution tasks."""
    return get_model("/run_tests", model_set=model_set)

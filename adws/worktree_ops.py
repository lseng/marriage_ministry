#!/usr/bin/env python3
"""Worktree operations for isolated concurrent ADW workflows.

Provides git worktree management for running multiple ADW workflows
simultaneously without interference. Each workflow gets:
- Isolated git worktree at trees/{adw_id}/
- Dedicated port allocation for dev server
- Independent environment configuration

Inspired by TAC-7's worktree isolation architecture.
"""

import os
import subprocess
import shutil
import logging
from pathlib import Path
from typing import Optional, Tuple
from dataclasses import dataclass


@dataclass
class PortAllocation:
    """Port allocation for an ADW workflow."""
    backend: int
    frontend: int

    def to_env_dict(self) -> dict:
        """Convert to environment variables."""
        return {
            "PORT": str(self.backend),
            "VITE_PORT": str(self.frontend),
            "DEV_SERVER_PORT": str(self.frontend),
        }


# Port ranges for concurrent workflows (supports up to 15 concurrent ADWs)
BACKEND_PORT_START = 3100
FRONTEND_PORT_START = 3200
MAX_CONCURRENT_WORKFLOWS = 15


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent


def get_trees_dir() -> Path:
    """Get the trees directory for worktrees."""
    return get_project_root() / "trees"


def get_worktree_path(adw_id: str) -> Path:
    """Get the worktree path for a given ADW ID."""
    return get_trees_dir() / adw_id


def allocate_ports(adw_id: str) -> PortAllocation:
    """Allocate deterministic ports based on ADW ID.

    Uses first 4 hex chars of ADW ID to generate consistent port offset.
    This ensures the same ADW ID always gets the same ports.
    """
    # Use first 4 hex chars to generate offset (0-65535)
    hex_prefix = adw_id[:4] if len(adw_id) >= 4 else adw_id.ljust(4, '0')
    offset = int(hex_prefix, 16) % MAX_CONCURRENT_WORKFLOWS

    return PortAllocation(
        backend=BACKEND_PORT_START + offset,
        frontend=FRONTEND_PORT_START + offset,
    )


def create_worktree(
    adw_id: str,
    branch_name: str,
    logger: Optional[logging.Logger] = None,
) -> Tuple[Path, PortAllocation]:
    """Create an isolated git worktree for an ADW workflow.

    Args:
        adw_id: Unique ADW identifier
        branch_name: Git branch to checkout in the worktree
        logger: Optional logger for status messages

    Returns:
        Tuple of (worktree_path, port_allocation)

    Raises:
        subprocess.CalledProcessError: If git operations fail
    """
    log = logger or logging.getLogger(__name__)
    project_root = get_project_root()
    worktree_path = get_worktree_path(adw_id)

    # Ensure trees directory exists
    trees_dir = get_trees_dir()
    trees_dir.mkdir(exist_ok=True)

    # Check if worktree already exists
    if worktree_path.exists():
        log.info(f"Worktree already exists at {worktree_path}")
        return worktree_path, allocate_ports(adw_id)

    log.info(f"Creating worktree at {worktree_path} for branch {branch_name}")

    # Create the worktree
    subprocess.run(
        ["git", "worktree", "add", str(worktree_path), branch_name],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
    )

    # Allocate ports
    ports = allocate_ports(adw_id)

    # Copy environment files
    env_local = project_root / ".env.local"
    if env_local.exists():
        shutil.copy(env_local, worktree_path / ".env.local")
        log.info(f"Copied .env.local to worktree")

    # Create .ports.env file with port configuration
    ports_env = worktree_path / ".ports.env"
    with open(ports_env, "w") as f:
        for key, value in ports.to_env_dict().items():
            f.write(f"{key}={value}\n")
    log.info(f"Created .ports.env with backend={ports.backend}, frontend={ports.frontend}")

    # Install dependencies in worktree
    log.info("Installing dependencies in worktree...")
    subprocess.run(
        ["npm", "install"],
        cwd=worktree_path,
        check=True,
        capture_output=True,
        text=True,
    )

    log.info(f"Worktree created successfully at {worktree_path}")
    return worktree_path, ports


def remove_worktree(
    adw_id: str,
    logger: Optional[logging.Logger] = None,
) -> bool:
    """Remove a git worktree for an ADW workflow.

    Args:
        adw_id: Unique ADW identifier
        logger: Optional logger for status messages

    Returns:
        True if worktree was removed, False if it didn't exist
    """
    log = logger or logging.getLogger(__name__)
    project_root = get_project_root()
    worktree_path = get_worktree_path(adw_id)

    if not worktree_path.exists():
        log.info(f"Worktree {worktree_path} does not exist")
        return False

    log.info(f"Removing worktree at {worktree_path}")

    # Remove the worktree using git
    subprocess.run(
        ["git", "worktree", "remove", str(worktree_path), "--force"],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
    )

    log.info(f"Worktree removed successfully")
    return True


def list_worktrees(logger: Optional[logging.Logger] = None) -> list[dict]:
    """List all active worktrees.

    Returns:
        List of dicts with worktree info: {path, branch, head}
    """
    log = logger or logging.getLogger(__name__)
    project_root = get_project_root()

    result = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        cwd=project_root,
        capture_output=True,
        text=True,
        check=True,
    )

    worktrees = []
    current = {}

    for line in result.stdout.strip().split("\n"):
        if line.startswith("worktree "):
            if current:
                worktrees.append(current)
            current = {"path": line.split(" ", 1)[1]}
        elif line.startswith("HEAD "):
            current["head"] = line.split(" ", 1)[1]
        elif line.startswith("branch "):
            current["branch"] = line.split(" ", 1)[1]
        elif line == "detached":
            current["detached"] = True

    if current:
        worktrees.append(current)

    # Filter to only trees/ worktrees (ADW worktrees)
    trees_dir = str(get_trees_dir())
    adw_worktrees = [w for w in worktrees if w.get("path", "").startswith(trees_dir)]

    return adw_worktrees


def cleanup_stale_worktrees(
    max_age_hours: int = 24,
    logger: Optional[logging.Logger] = None,
) -> int:
    """Remove worktrees older than specified age.

    Args:
        max_age_hours: Maximum age in hours before cleanup
        logger: Optional logger for status messages

    Returns:
        Number of worktrees cleaned up
    """
    import time

    log = logger or logging.getLogger(__name__)
    trees_dir = get_trees_dir()

    if not trees_dir.exists():
        return 0

    cleaned = 0
    now = time.time()
    max_age_seconds = max_age_hours * 3600

    for worktree_dir in trees_dir.iterdir():
        if not worktree_dir.is_dir():
            continue

        # Check modification time
        mtime = worktree_dir.stat().st_mtime
        age_seconds = now - mtime

        if age_seconds > max_age_seconds:
            adw_id = worktree_dir.name
            log.info(f"Cleaning up stale worktree {adw_id} (age: {age_seconds/3600:.1f}h)")
            try:
                remove_worktree(adw_id, logger=log)
                cleaned += 1
            except subprocess.CalledProcessError as e:
                log.warning(f"Failed to remove worktree {adw_id}: {e}")

    return cleaned


def get_worktree_env(adw_id: str) -> dict:
    """Get environment variables for running commands in a worktree.

    Args:
        adw_id: Unique ADW identifier

    Returns:
        Dict of environment variables including port configuration
    """
    worktree_path = get_worktree_path(adw_id)
    ports = allocate_ports(adw_id)

    env = os.environ.copy()
    env.update(ports.to_env_dict())
    env["ADW_ID"] = adw_id
    env["ADW_WORKTREE"] = str(worktree_path)

    return env

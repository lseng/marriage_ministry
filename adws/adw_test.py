#!/usr/bin/env python3
"""
ADW Test - AI Developer Workflow for agentic testing with self-healing

Usage:
  cd adws && source venv/bin/activate && python adw_test.py <issue-number> [adw-id] [--skip-e2e]

Workflow:
1. Fetch GitHub issue details (if not in state)
2. Run application test suite
3. If tests fail, attempt to resolve failures
4. Re-run tests up to MAX_RETRY_ATTEMPTS
5. Report results to issue
6. Create commit and push

Environment Requirements:
- ANTHROPIC_API_KEY: Anthropic API key
- CLAUDE_CODE_PATH: Path to Claude CLI
- GITHUB_PAT: (Optional) GitHub Personal Access Token
"""

import json
import subprocess
import sys
import os
import logging
from pathlib import Path
from typing import Tuple, Optional, List

from dotenv import load_dotenv

# Load environment variables from parent directory
_env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(_env_path)

from data_types import (
    AgentTemplateRequest,
    GitHubIssue,
    AgentPromptResponse,
    TestResult,
    E2ETestResult,
    IssueClassSlashCommand,
)
from agent import execute_template
from github import (
    extract_repo_path,
    fetch_issue,
    make_issue_comment,
    get_repo_url,
)
from utils import make_adw_id, setup_logger, parse_json
from state import ADWState

# Agent name constants
AGENT_TESTER = "test_runner"
AGENT_E2E_TESTER = "e2e_test_runner"

# Maximum number of test retry attempts after resolution
MAX_TEST_RETRY_ATTEMPTS = 4
MAX_E2E_TEST_RETRY_ATTEMPTS = 2


def check_env_vars(logger: Optional[logging.Logger] = None) -> None:
    """Check that all required environment variables are set."""
    required_vars = [
        "ANTHROPIC_API_KEY",
        "CLAUDE_CODE_PATH",
    ]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        error_msg = "Error: Missing required environment variables:"
        if logger:
            logger.error(error_msg)
            for var in missing_vars:
                logger.error(f"  - {var}")
        else:
            print(error_msg, file=sys.stderr)
            for var in missing_vars:
                print(f"  - {var}", file=sys.stderr)
        sys.exit(1)


def parse_args() -> Tuple[Optional[str], Optional[str], bool]:
    """Parse command line arguments.
    Returns (issue_number, adw_id, skip_e2e)."""
    skip_e2e = False

    # Check for --skip-e2e flag in args
    if "--skip-e2e" in sys.argv:
        skip_e2e = True
        sys.argv.remove("--skip-e2e")

    if len(sys.argv) < 2:
        print("Usage: python adw_test.py <issue-number> [adw-id] [--skip-e2e]")
        print("Examples:")
        print("  python adw_test.py 123")
        print("  python adw_test.py 123 abc12345")
        print("  python adw_test.py 123 --skip-e2e")
        sys.exit(1)

    issue_number = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else None

    return issue_number, adw_id, skip_e2e


def format_issue_message(
    adw_id: str, agent_name: str, message: str, session_id: Optional[str] = None
) -> str:
    """Format a message for issue comments with ADW tracking."""
    if session_id:
        return f"{adw_id}_{agent_name}_{session_id}: {message}"
    return f"{adw_id}_{agent_name}: {message}"


def run_tests(adw_id: str, logger: logging.Logger) -> AgentPromptResponse:
    """Run the test suite using the /test command."""
    test_template_request = AgentTemplateRequest(
        agent_name=AGENT_TESTER,
        slash_command="/test",
        args=[],
        adw_id=adw_id,
        model="sonnet",
    )

    logger.debug(
        f"test_template_request: {test_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    test_response = execute_template(test_template_request)

    logger.debug(
        f"test_response: {test_response.model_dump_json(indent=2, by_alias=True)}"
    )

    return test_response


def parse_test_results(
    output: str, logger: logging.Logger
) -> Tuple[List[TestResult], int, int]:
    """Parse test results JSON and return (results, passed_count, failed_count)."""
    try:
        # Use parse_json to handle markdown-wrapped JSON
        results = parse_json(output, List[TestResult])

        passed_count = sum(1 for test in results if test.passed)
        failed_count = len(results) - passed_count

        return results, passed_count, failed_count
    except Exception as e:
        logger.error(f"Error parsing test results: {e}")
        return [], 0, 0


def format_test_results_comment(
    results: List[TestResult], passed_count: int, failed_count: int
) -> str:
    """Format test results for GitHub issue comment with JSON blocks."""
    if not results:
        return "No test results found"

    # Separate failed and passed tests
    failed_tests = [test for test in results if not test.passed]
    passed_tests = [test for test in results if test.passed]

    # Build comment
    comment_parts = []

    # Failed tests header
    if failed_tests:
        comment_parts.append("")
        comment_parts.append("## Failed Tests")
        comment_parts.append("")

        # Loop over each failed test
        for test in failed_tests:
            comment_parts.append(f"### {test.test_name}")
            comment_parts.append("")
            comment_parts.append("```json")
            comment_parts.append(json.dumps(test.model_dump(), indent=2))
            comment_parts.append("```")
            comment_parts.append("")

    # Passed tests header
    if passed_tests:
        comment_parts.append("## Passed Tests")
        comment_parts.append("")

        # Loop over each passed test
        for test in passed_tests:
            comment_parts.append(f"### {test.test_name}")
            comment_parts.append("")
            comment_parts.append("```json")
            comment_parts.append(json.dumps(test.model_dump(), indent=2))
            comment_parts.append("```")
            comment_parts.append("")

    # Remove trailing empty line
    if comment_parts and comment_parts[-1] == "":
        comment_parts.pop()

    return "\n".join(comment_parts)


def resolve_failed_tests(
    failed_tests: List[TestResult],
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    iteration: int = 1,
) -> Tuple[int, int]:
    """
    Attempt to resolve failed tests using the resolve_failed_test command.
    Returns (resolved_count, unresolved_count).
    """
    resolved_count = 0
    unresolved_count = 0

    for idx, test in enumerate(failed_tests):
        logger.info(
            f"\n=== Resolving failed test {idx + 1}/{len(failed_tests)}: {test.test_name} ==="
        )

        # Create payload for the resolve command
        test_payload = test.model_dump_json(indent=2)

        # Create agent name with iteration
        agent_name = f"test_resolver_iter{iteration}_{idx}"

        # Create template request
        resolve_request = AgentTemplateRequest(
            agent_name=agent_name,
            slash_command="/resolve_failed_test",
            args=[test_payload],
            adw_id=adw_id,
            model="sonnet",
        )

        # Post to issue
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                agent_name,
                f"Attempting to resolve: {test.test_name}\n```json\n{test_payload}\n```",
            ),
        )

        # Execute resolution
        response = execute_template(resolve_request)

        if response.success:
            resolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    agent_name,
                    f"Successfully resolved: {test.test_name}",
                ),
            )
            logger.info(f"Successfully resolved: {test.test_name}")
        else:
            unresolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    agent_name,
                    f"Failed to resolve: {test.test_name}",
                ),
            )
            logger.error(f"Failed to resolve: {test.test_name}")

    return resolved_count, unresolved_count


def run_tests_with_resolution(
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    max_attempts: int = MAX_TEST_RETRY_ATTEMPTS,
) -> Tuple[List[TestResult], int, int, AgentPromptResponse]:
    """
    Run tests with automatic resolution and retry logic.
    Returns (results, passed_count, failed_count, last_test_response).
    """
    attempt = 0
    results = []
    passed_count = 0
    failed_count = 0
    test_response = None

    while attempt < max_attempts:
        attempt += 1
        logger.info(f"\n=== Test Run Attempt {attempt}/{max_attempts} ===")

        # Run tests
        test_response = run_tests(adw_id, logger)

        # If there was a high level - non-test related error, stop and report it
        if not test_response.success:
            logger.error(f"Error running tests: {test_response.output}")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    AGENT_TESTER,
                    f"Error running tests: {test_response.output}",
                ),
            )
            break

        # Parse test results
        results, passed_count, failed_count = parse_test_results(
            test_response.output, logger
        )

        # If no failures or this is the last attempt, we're done
        if failed_count == 0:
            logger.info("All tests passed, stopping retry attempts")
            break
        if attempt == max_attempts:
            logger.info(f"Reached maximum retry attempts ({max_attempts}), stopping")
            break

        # If we have failed tests and this isn't the last attempt, try to resolve
        logger.info("\n=== Attempting to resolve failed tests ===")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"Found {failed_count} failed tests. Attempting resolution...",
            ),
        )

        # Get list of failed tests
        failed_tests = [test for test in results if not test.passed]

        # Attempt resolution
        resolved, unresolved = resolve_failed_tests(
            failed_tests, adw_id, issue_number, logger, iteration=attempt
        )

        # Report resolution results
        if resolved > 0:
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, "ops", f"Resolved {resolved}/{failed_count} failed tests"
                ),
            )

            # Continue to next attempt if we resolved something
            logger.info(f"\n=== Re-running tests after resolving {resolved} tests ===")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    AGENT_TESTER,
                    f"Re-running tests (attempt {attempt + 1}/{max_attempts})...",
                ),
            )
        else:
            # No tests were resolved, no point in retrying
            logger.info("No tests were resolved, stopping retry attempts")
            break

    # Log final attempt status
    if attempt == max_attempts and failed_count > 0:
        logger.warning(
            f"Reached maximum retry attempts ({max_attempts}) with {failed_count} failures remaining"
        )
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"Reached maximum retry attempts ({max_attempts}) with {failed_count} failures",
            ),
        )

    return results, passed_count, failed_count, test_response


def run_e2e_tests(
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
) -> List[E2ETestResult]:
    """Run E2E tests using Playwright."""
    import glob

    # Find all E2E test files
    project_root = Path(__file__).parent.parent
    e2e_test_files = glob.glob(str(project_root / "e2e" / "*.spec.ts"))
    logger.info(f"Found {len(e2e_test_files)} E2E test files")

    if not e2e_test_files:
        logger.warning("No E2E test files found in e2e/")
        return []

    results = []

    # Run all E2E tests at once
    test_template_request = AgentTemplateRequest(
        agent_name=AGENT_E2E_TESTER,
        slash_command="/e2e_test",
        args=[],
        adw_id=adw_id,
        model="sonnet",
    )

    response = execute_template(test_template_request)

    if not response.success:
        logger.error(f"Error running E2E tests: {response.output}")
        return [
            E2ETestResult(
                test_name="e2e_suite",
                status="failed",
                test_path="e2e/",
                error=f"Test execution error: {response.output}",
            )
        ]

    # Parse the response - expect structured JSON
    try:
        result_data = parse_json(response.output, dict)
        e2e_result = E2ETestResult(
            test_name=result_data.get("test_name", "e2e_suite"),
            status=result_data.get("status", "failed"),
            test_path=result_data.get("test_path", "e2e/"),
            screenshots=result_data.get("screenshots", []),
            error=result_data.get("error"),
        )
        results.append(e2e_result)
    except Exception as e:
        logger.error(f"Error parsing E2E test results: {e}")
        results.append(
            E2ETestResult(
                test_name="e2e_suite",
                status="failed",
                test_path="e2e/",
                error=f"Result parsing error: {str(e)}",
            )
        )

    return results


def resolve_failed_e2e_tests(
    failed_tests: List[E2ETestResult],
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    iteration: int = 1,
) -> Tuple[int, int]:
    """
    Attempt to resolve failed E2E tests using the resolve_failed_e2e_test command.
    Returns (resolved_count, unresolved_count).
    """
    resolved_count = 0
    unresolved_count = 0

    for idx, test in enumerate(failed_tests):
        logger.info(
            f"\n=== Resolving failed E2E test {idx + 1}/{len(failed_tests)}: {test.test_name} ==="
        )

        # Create payload for the resolve command
        test_payload = test.model_dump_json(indent=2)

        # Create agent name with iteration
        agent_name = f"e2e_test_resolver_iter{iteration}_{idx}"

        # Create template request
        resolve_request = AgentTemplateRequest(
            agent_name=agent_name,
            slash_command="/resolve_failed_e2e_test",
            args=[test_payload],
            adw_id=adw_id,
            model="sonnet",
        )

        # Post to issue
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                agent_name,
                f"Attempting to resolve E2E test: {test.test_name}\n```json\n{test_payload}\n```",
            ),
        )

        # Execute resolution
        response = execute_template(resolve_request)

        if response.success:
            resolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    agent_name,
                    f"Successfully resolved E2E test: {test.test_name}",
                ),
            )
            logger.info(f"Successfully resolved E2E test: {test.test_name}")
        else:
            unresolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    agent_name,
                    f"Failed to resolve E2E test: {test.test_name}",
                ),
            )
            logger.error(f"Failed to resolve E2E test: {test.test_name}")

    return resolved_count, unresolved_count


def run_e2e_tests_with_resolution(
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    max_attempts: int = MAX_E2E_TEST_RETRY_ATTEMPTS,
) -> Tuple[List[E2ETestResult], int, int]:
    """
    Run E2E tests with automatic resolution and retry logic.
    Returns (results, passed_count, failed_count).
    """
    attempt = 0
    results = []
    passed_count = 0
    failed_count = 0

    while attempt < max_attempts:
        attempt += 1
        logger.info(f"\n=== E2E Test Run Attempt {attempt}/{max_attempts} ===")

        # Run E2E tests
        results = run_e2e_tests(adw_id, issue_number, logger)

        if not results:
            logger.warning("No E2E test results to process")
            break

        # Count passes and failures
        passed_count = sum(1 for test in results if test.passed)
        failed_count = len(results) - passed_count

        # If no failures or this is the last attempt, we're done
        if failed_count == 0:
            logger.info("All E2E tests passed, stopping retry attempts")
            break
        if attempt == max_attempts:
            logger.info(
                f"Reached maximum E2E retry attempts ({max_attempts}), stopping"
            )
            break

        # If we have failed tests and this isn't the last attempt, try to resolve
        logger.info("\n=== Attempting to resolve failed E2E tests ===")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"Found {failed_count} failed E2E tests. Attempting resolution...",
            ),
        )

        # Get list of failed tests
        failed_tests = [test for test in results if not test.passed]

        # Attempt resolution
        resolved, unresolved = resolve_failed_e2e_tests(
            failed_tests, adw_id, issue_number, logger, iteration=attempt
        )

        # Report resolution results
        if resolved > 0:
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    "ops",
                    f"Resolved {resolved}/{failed_count} failed E2E tests",
                ),
            )

            # Continue to next attempt if we resolved something
            logger.info(
                f"\n=== Re-running E2E tests after resolving {resolved} tests ==="
            )
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id,
                    AGENT_E2E_TESTER,
                    f"Re-running E2E tests (attempt {attempt + 1}/{max_attempts})...",
                ),
            )
        else:
            # No tests were resolved, no point in retrying
            logger.info("No E2E tests were resolved, stopping retry attempts")
            break

    # Log final attempt status
    if attempt == max_attempts and failed_count > 0:
        logger.warning(
            f"Reached maximum E2E retry attempts ({max_attempts}) with {failed_count} failures remaining"
        )
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"Reached maximum E2E retry attempts ({max_attempts}) with {failed_count} failures",
            ),
        )

    return results, passed_count, failed_count


def git_commit(message: str, logger: logging.Logger) -> Tuple[bool, str]:
    """Create a git commit with the given message."""
    try:
        # Stage all changes
        result = subprocess.run(
            ["git", "add", "-A"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            return False, f"git add failed: {result.stderr}"

        # Create commit
        result = subprocess.run(
            ["git", "commit", "-m", message],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            if "nothing to commit" in result.stdout or "nothing to commit" in result.stderr:
                return True, "Nothing to commit"
            return False, f"git commit failed: {result.stderr}"

        return True, "Commit created successfully"
    except Exception as e:
        return False, str(e)


def git_push(branch_name: str, logger: logging.Logger) -> Tuple[bool, str]:
    """Push the current branch to origin."""
    try:
        result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            return False, f"git push failed: {result.stderr}"
        return True, "Push successful"
    except Exception as e:
        return False, str(e)


def main():
    """Main entry point."""
    # Parse arguments
    issue_number, arg_adw_id, skip_e2e = parse_args()

    # Initialize or load ADW ID
    adw_id = arg_adw_id or make_adw_id()

    # Set up logger
    logger = setup_logger(adw_id, "adw_test")
    logger.info(f"ADW Test starting - ID: {adw_id}, Issue: {issue_number}")

    # Validate environment
    check_env_vars(logger)

    # Try to load existing state
    state = ADWState.load(adw_id, logger)
    if state is None:
        state = ADWState(adw_id)
        state.update(issue_number=issue_number)
        state.save("adw_test")

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        repo_path = extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Handle branch - either use existing or create new test branch
    branch_name = state.get("branch_name")
    if branch_name:
        # Try to checkout existing branch
        result = subprocess.run(
            ["git", "checkout", branch_name],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            logger.error(f"Failed to checkout branch {branch_name}: {result.stderr}")
            make_issue_comment(
                issue_number,
                format_issue_message(adw_id, "ops", f"Failed to checkout branch {branch_name}"),
            )
            sys.exit(1)
        logger.info(f"Checked out existing branch: {branch_name}")
    else:
        # No branch in state - create a test-specific branch
        branch_name = f"test-issue-{issue_number}-adw-{adw_id}"
        result = subprocess.run(
            ["git", "checkout", "-b", branch_name],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            logger.error(f"Failed to create branch {branch_name}: {result.stderr}")
            sys.exit(1)
        state.update(branch_name=branch_name)
        state.save("adw_test")
        logger.info(f"Created new test branch: {branch_name}")

    make_issue_comment(
        issue_number, format_issue_message(adw_id, "ops", "Starting test suite")
    )

    # Run tests with automatic resolution and retry
    logger.info("\n=== Running test suite ===")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_TESTER, "Running application tests..."),
    )

    # Run tests with resolution and retry logic
    results, passed_count, failed_count, test_response = run_tests_with_resolution(
        adw_id, issue_number, logger
    )

    # Format and post final results
    results_comment = format_test_results_comment(results, passed_count, failed_count)
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id, AGENT_TESTER, f"Final test results:\n{results_comment}"
        ),
    )

    # Log summary
    logger.info(f"Final test results: {passed_count} passed, {failed_count} failed")

    # E2E tests
    e2e_results = []
    e2e_passed_count = 0
    e2e_failed_count = 0

    if failed_count > 0:
        logger.warning("Skipping E2E tests due to unit test failures")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops", "Skipping E2E tests due to unit test failures"
            ),
        )
    elif skip_e2e:
        logger.info("Skipping E2E tests as requested")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops", "Skipping E2E tests as requested via --skip-e2e flag"
            ),
        )
    else:
        # Run E2E tests since unit tests passed
        logger.info("\n=== Running E2E test suite ===")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_E2E_TESTER, "Starting E2E tests..."),
        )

        # Run E2E tests with resolution and retry logic
        e2e_results, e2e_passed_count, e2e_failed_count = run_e2e_tests_with_resolution(
            adw_id, issue_number, logger
        )

        if e2e_results:
            logger.info(
                f"Final E2E test results: {e2e_passed_count} passed, {e2e_failed_count} failed"
            )

    # Commit test results
    logger.info("\n=== Committing test results ===")
    commit_msg = f"adw_test: test results for issue #{issue_number}\n\nUnit tests: {passed_count} passed, {failed_count} failed"
    if e2e_results:
        commit_msg += f"\nE2E tests: {e2e_passed_count} passed, {e2e_failed_count} failed"

    success, message = git_commit(commit_msg, logger)
    if success:
        logger.info(f"Commit: {message}")
    else:
        logger.warning(f"Commit warning: {message}")

    # Push changes
    success, message = git_push(branch_name, logger)
    if success:
        logger.info(f"Push: {message}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Pushed changes to branch {branch_name}"),
        )
    else:
        logger.error(f"Push failed: {message}")

    # Update state
    state.save("adw_test")

    # Output state for chaining
    state.to_stdout()

    # Exit with appropriate code
    total_failures = failed_count + e2e_failed_count
    if total_failures > 0:
        logger.info(f"Test suite completed with failures for issue #{issue_number}")
        failure_msg = f"Test suite completed with failures:\n"
        if failed_count > 0:
            failure_msg += f"- Unit tests: {failed_count} failures\n"
        if e2e_failed_count > 0:
            failure_msg += f"- E2E tests: {e2e_failed_count} failures"
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", failure_msg),
        )
        sys.exit(1)
    else:
        logger.info(f"Test suite completed successfully for issue #{issue_number}")
        success_msg = f"All tests passed successfully!\n"
        success_msg += f"- Unit tests: {passed_count} passed\n"
        if e2e_results:
            success_msg += f"- E2E tests: {e2e_passed_count} passed"
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", success_msg),
        )


if __name__ == "__main__":
    main()

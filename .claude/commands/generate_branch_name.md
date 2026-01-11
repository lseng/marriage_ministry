# Generate Git Branch Name

Based on the `Instructions` below, take the `Variables` follow the `Run` section to generate a concise Git branch name following the specified format. Then follow the `Report` section to report the results of your work.

## Variables

issue_class: $1
issue: $2

## Instructions

- Generate a branch name in the format: `<issue_class>-<issue_number>-<concise_name>`
- The `<concise_name>` should be:
  - 3-6 words maximum
  - All lowercase
  - Words separated by hyphens
  - Descriptive of the main task/feature
  - No special characters except hyphens
- Examples:
  - `feat-123-add-coach-management`
  - `bug-456-fix-couple-assignment`
  - `chore-789-update-dependencies`
- Extract the issue number, title, and body from the issue JSON

## Run

Run `git checkout main` to switch to the main branch
Run `git pull` to pull the latest changes from the main branch
Run `git checkout -b <branch_name>` to create and switch to the new branch

## Report

After generating the branch name:
Return ONLY the branch name that was created (no other text)

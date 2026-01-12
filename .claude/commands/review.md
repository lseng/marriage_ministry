# Code Review Command

Perform a comprehensive code review on changed files before commit/PR.

## Input
$ARGUMENTS - Optional: specific file path, or "staged" for staged changes, or "branch" for all branch changes

## Default Behavior
- If no args: review staged changes (`git diff --cached`)
- If "branch": review all changes from branch divergence point

## Review Process

### Step 1: Gather Changes
```bash
# For staged changes
git diff --cached --name-only

# For branch changes
git diff main...HEAD --name-only
```

### Step 2: Analyze Each File

For each changed file, check:

## Review Checklist

### Code Quality
- [ ] No console.log/debug statements left
- [ ] No commented-out code
- [ ] No TODO comments without issue references
- [ ] Functions are reasonably sized (<50 lines)
- [ ] No deeply nested code (max 3-4 levels)
- [ ] Variable names are descriptive
- [ ] No magic numbers (use constants)

### TypeScript
- [ ] No `any` types (use `unknown` if needed)
- [ ] No `// @ts-ignore` without justification
- [ ] Proper type exports
- [ ] Interfaces for object shapes
- [ ] Correct use of optional properties

### React Best Practices
- [ ] No inline function definitions in JSX (causes re-renders)
- [ ] Proper use of useCallback/useMemo where needed
- [ ] No direct DOM manipulation
- [ ] Keys used correctly in lists
- [ ] Effects have proper dependencies
- [ ] No state updates in render

### Security
- [ ] No hardcoded secrets/keys
- [ ] User input is validated
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention (proper escaping)
- [ ] Auth checks on protected routes
- [ ] RLS policies in place

### Performance
- [ ] No N+1 query patterns
- [ ] Large lists are virtualized
- [ ] Images are optimized
- [ ] Lazy loading where appropriate
- [ ] No memory leaks (cleanup in effects)

### Accessibility
- [ ] Semantic HTML elements
- [ ] Alt text on images
- [ ] Proper heading hierarchy
- [ ] Focus management
- [ ] Color contrast
- [ ] Keyboard navigation

### Testing
- [ ] Tests exist for new code
- [ ] Tests cover edge cases
- [ ] No skipped tests
- [ ] Mocks are appropriate

## Output Format

```markdown
# Code Review Report

**Files Reviewed:** X
**Issues Found:** X critical, X warnings, X suggestions

## Critical Issues (Must Fix)

### File: src/components/CoachForm.tsx

#### Line 45: SQL Injection Vulnerability
```typescript
// Current code (vulnerable)
const query = `SELECT * FROM coaches WHERE name = '${userInput}'`;

// Suggested fix
const { data } = await supabase
  .from('coaches')
  .select('*')
  .eq('name', userInput);
```
**Why:** User input is directly interpolated into query, allowing injection attacks.

---

## Warnings (Should Fix)

### File: src/hooks/useCoaches.ts

#### Line 23: Missing Error Handling
```typescript
// Current code
const fetchCoaches = async () => {
  const { data } = await supabase.from('coaches').select('*');
  setCoaches(data);
};

// Suggested improvement
const fetchCoaches = async () => {
  const { data, error } = await supabase.from('coaches').select('*');
  if (error) {
    console.error('Failed to fetch coaches:', error);
    setError(error.message);
    return;
  }
  setCoaches(data ?? []);
};
```
**Why:** API calls can fail; users should see appropriate feedback.

---

## Suggestions (Nice to Have)

### File: src/pages/Dashboard.tsx

#### Line 12: Consider Memoization
```typescript
// Current code
const stats = calculateStats(data);

// Suggested improvement
const stats = useMemo(() => calculateStats(data), [data]);
```
**Why:** If calculateStats is expensive and data doesn't change often, memoization prevents unnecessary recalculations.

---

## Positive Feedback

- Good separation of concerns in useCoaches hook
- Excellent test coverage for form validation
- Clean component structure following design system

---

## Summary

| Category | Status |
|----------|--------|
| Code Quality | ⚠️ 2 issues |
| TypeScript | ✅ Good |
| React | ✅ Good |
| Security | 🔴 1 critical |
| Performance | ⚠️ 1 suggestion |
| Accessibility | ✅ Good |
| Testing | ✅ Good |

**Recommendation:** Fix critical security issue before merging. Address warnings in follow-up commit.
```

## Auto-Fix Capability

For certain issues, offer automatic fixes:

```markdown
## Auto-Fixable Issues

| Issue | File | Line | Fix Command |
|-------|------|------|-------------|
| console.log | Dashboard.tsx | 34 | Auto-remove |
| Missing error handling | useCoaches.ts | 23 | Generate template |
| any type | types.ts | 12 | Suggest proper type |

Run `/review --fix` to apply automatic fixes.
```

## Integration

This command is automatically called by:
- `/commit` - Before allowing commit
- `/pull_request` - Before creating PR

Can be bypassed with `--skip-review` (not recommended).

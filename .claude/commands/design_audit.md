# Design Audit Command

Audit a component or page for design system compliance and accessibility.

## Input
$ARGUMENTS - File path or component name to audit

## Instructions

1. **Read the Target File**
   - Parse the component/page code
   - Identify all styling approaches used
   - List all colors, spacing, typography values

2. **Load Design System Reference**
   - Read `src/styles/tokens.ts`
   - Read `tailwind.config.js`
   - Understand the design token structure

3. **Perform Audit Checks**

### 3.1 Color Compliance
- [ ] No hardcoded hex colors (e.g., `#ff0000`)
- [ ] No hardcoded RGB/RGBA values
- [ ] Uses semantic color tokens (e.g., `text-primary`, `bg-surface`)
- [ ] Proper contrast ratios (WCAG AA: 4.5:1 for text)
- [ ] Dark mode support with `dark:` variants

### 3.2 Spacing Compliance
- [ ] Uses spacing scale values (4, 8, 12, 16, 24, 32, 48, 64)
- [ ] No arbitrary spacing values (e.g., `p-[13px]`)
- [ ] Consistent margin/padding patterns
- [ ] Proper responsive spacing

### 3.3 Typography Compliance
- [ ] Uses defined font sizes (xs, sm, base, lg, xl, 2xl, etc.)
- [ ] Uses defined font weights (normal, medium, semibold, bold)
- [ ] Proper line heights
- [ ] No inline font-size declarations

### 3.4 Component Patterns
- [ ] Uses design system components where applicable
- [ ] Consistent border radius usage
- [ ] Proper shadow usage
- [ ] Consistent hover/focus states

### 3.5 Accessibility (a11y)
- [ ] All images have alt text
- [ ] Interactive elements are focusable
- [ ] Focus states are visible
- [ ] Color is not the only indicator
- [ ] Proper heading hierarchy
- [ ] Form labels are associated
- [ ] ARIA attributes used correctly
- [ ] Touch targets are 44x44px minimum

### 3.6 Responsive Design
- [ ] Mobile-first approach
- [ ] Breakpoints used correctly (sm, md, lg, xl, 2xl)
- [ ] No horizontal scroll on mobile
- [ ] Touch-friendly on mobile devices

4. **Generate Report**

## Output Format

```markdown
# Design Audit Report

**File:** [path/to/file]
**Date:** [timestamp]
**Score:** [X/100]

## Summary
- **Passing Checks:** X
- **Warnings:** X
- **Errors:** X

## Critical Issues

### 🔴 Error: Hardcoded color value
**Location:** Line 45
**Code:** `style={{ color: '#ff5500' }}`
**Fix:** Replace with `className="text-orange-500"` or semantic token

### 🔴 Error: Missing alt text
**Location:** Line 78
**Code:** `<img src={avatar} />`
**Fix:** Add `alt="User avatar"` attribute

## Warnings

### 🟡 Warning: Arbitrary spacing
**Location:** Line 23
**Code:** `className="p-[15px]"`
**Fix:** Use `p-4` (16px) instead

### 🟡 Warning: Missing focus state
**Location:** Line 56
**Code:** `<button className="...">`
**Fix:** Add `focus:ring-2 focus:ring-primary`

## Passing Checks

- ✅ Uses Tailwind utility classes
- ✅ Proper semantic HTML structure
- ✅ Responsive breakpoints used
- ✅ Dark mode variants present
- ✅ Proper heading hierarchy

## Recommendations

1. Create a shared Button component to ensure consistent styling
2. Extract color values to design tokens
3. Add focus-visible states for keyboard navigation
4. Consider adding aria-label to icon-only buttons

## Auto-Fix Available

The following issues can be automatically fixed:

| Issue | Fix Command |
|-------|-------------|
| Hardcoded colors | Run: /design_fix colors [file] |
| Missing focus states | Run: /design_fix focus [file] |
| Arbitrary spacing | Run: /design_fix spacing [file] |
```

5. **Offer Auto-Fix**
   - Generate fix commands for automatable issues
   - Apply fixes if user approves

## Design Tokens Reference

```typescript
// Expected token structure
const tokens = {
  colors: {
    primary: { 50: '...', 500: '...', 900: '...' },
    gray: { 50: '...', 100: '...', ... },
    success: '...',
    error: '...',
    warning: '...',
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
};
```

## Severity Levels

- 🔴 **Error**: Must fix - Violates design system or accessibility requirements
- 🟡 **Warning**: Should fix - Inconsistent with best practices
- 🔵 **Info**: Nice to have - Minor improvements

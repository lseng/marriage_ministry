# Marriage Ministry - Operational Guide

> This file contains operational learnings for AI agents working on this codebase.
> Keep it brief (~60 lines). Status/progress belongs in IMPLEMENTATION_PLAN.md.

## Project Overview

React 18 + TypeScript + Vite + Supabase application for managing church marriage ministry operations.
Role-based access (Admin, Coach, Couple) with RLS policies.

## Build & Validate Commands

```bash
# Development
npm run dev                    # Start dev server (port 3000)

# Backpressure (run in this order)
npm run lint                   # ESLint with 0-warnings policy
npm run build                  # TypeScript check + Vite build
npm run test:run               # Unit tests (Vitest)
npm run test:e2e               # E2E tests (Playwright)
npm run test:all               # Full test suite

# Coverage
npm run test:coverage          # Generate coverage report (target: 70%+)
```

## File Structure Patterns

```
components/                    # React components by domain
  └── {domain}/               # coaches/, couples/, dashboard/, etc.
      └── __tests__/          # Co-located unit tests
hooks/                        # Custom React hooks
  └── __tests__/              # Hook tests
services/                     # API service layer (Supabase calls)
lib/                          # Utilities (supabase.ts, permissions.ts)
types/                        # TypeScript definitions
specs/                        # Feature specifications (source of truth)
e2e/                          # Playwright E2E tests
```

## Code Patterns

- **Components**: Functional with hooks, strict TypeScript (no `any`)
- **Hooks**: Custom hooks for data fetching, follow `use{Resource}` naming
- **Services**: Thin wrappers around Supabase, return typed responses
- **Tests**: Vitest for unit/integration, Playwright for E2E

## Operational Learnings

1. **Don't assume not implemented** - Always grep/search before writing new code
2. **Supabase RLS** - All data access goes through Row-Level Security policies
3. **Design System** - Use `components/ui/` primitives, follow Resonate tokens
4. **Test Files** - Unit tests live in `__tests__/` next to source files
5. **E2E Tests** - Need local Supabase running: `npx supabase start`
6. **Magic Links** - Auth flow uses email magic links primarily, password as fallback

## Database Context

- **profiles** - Links auth.users to roles (admin/coach/couple)
- **coaches** - Coach records with user_id FK
- **couples** - Couple records with coach_id FK
- **assignments** - Weekly homework assignments
- **homework_responses** - Couple submissions with JSONB responses

## Common Gotchas

1. **Auth Context** - Must wrap components in AuthProvider
2. **Supabase Types** - Regenerate with `npx supabase gen types typescript`
3. **Test Isolation** - Mock Supabase client in tests, don't hit real DB
4. **Port Conflicts** - Dev server runs on 3000, Supabase on 54321-54324

## When to Update This File

- Discovered a non-obvious build step
- Found a pattern that prevents bugs
- Learned something that would save future loops time

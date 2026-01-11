# Development Guidelines

## Code Style

### TypeScript

- Use strict TypeScript with no implicit any
- Define interfaces for all data structures
- Export types from dedicated type files
- Use type inference where possible

### React

- Use functional components with hooks
- Keep components focused and small
- Use custom hooks for reusable logic
- Prefer composition over inheritance

### File Organization

- One component per file
- Co-locate related files (component + styles + tests)
- Use index.ts for clean exports
- Keep imports organized: external, internal, relative

## Naming Conventions

- **Components**: PascalCase (e.g., `CoachesList.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAppState.ts`)
- **Utils**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase (e.g., `Coach`, `Couple`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `APP_NAME`)

## Git Workflow

1. Create feature branches from `main`
2. Use conventional commits:
   - `feat:` new features
   - `fix:` bug fixes
   - `refactor:` code changes
   - `docs:` documentation
   - `style:` formatting
   - `test:` tests
3. Keep commits small and focused
4. Write descriptive commit messages

## Testing

- Write unit tests for utilities
- Write integration tests for components
- Test user interactions and accessibility
- Maintain high test coverage

## Accessibility

- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation
- Maintain color contrast ratios
- Test with screen readers

## Performance

- Lazy load routes and heavy components
- Memoize expensive computations
- Optimize images and assets
- Monitor bundle size

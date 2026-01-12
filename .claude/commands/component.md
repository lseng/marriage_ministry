# Component Generation Command

Generate a React component following the design system and best practices.

## Input
$ARGUMENTS - Component name and description

## Instructions

1. **Analyze Requirements**
   - Component name (PascalCase)
   - Purpose and functionality
   - Props interface
   - State requirements
   - Event handlers needed

2. **Check Design System**
   - Review `src/styles/tokens.ts` for design tokens
   - Check existing components for patterns
   - Ensure consistency with other components

3. **Generate Component Structure**

   Create files:
   - `src/components/[Name]/index.ts` - Barrel export
   - `src/components/[Name]/[Name].tsx` - Main component
   - `src/components/[Name]/[Name].types.ts` - TypeScript types
   - `src/components/[Name]/[Name].test.tsx` - Unit tests

4. **Component Template**

   ```typescript
   // src/components/[Name]/[Name].tsx
   import { forwardRef } from 'react';
   import { clsx } from 'clsx';
   import { twMerge } from 'tailwind-merge';
   import type { [Name]Props } from './[Name].types';

   /**
    * [Name] Component
    *
    * @description Brief description of what this component does
    * @example
    * <[Name] variant="primary" onClick={() => {}}>
    *   Content
    * </[Name]>
    */
   export const [Name] = forwardRef<HTMLDivElement, [Name]Props>(
     ({ className, children, variant = 'default', ...props }, ref) => {
       const baseStyles = 'base tailwind classes';

       const variants = {
         default: 'default variant classes',
         primary: 'primary variant classes',
         secondary: 'secondary variant classes',
       };

       return (
         <div
           ref={ref}
           className={twMerge(clsx(baseStyles, variants[variant], className))}
           {...props}
         >
           {children}
         </div>
       );
     }
   );

   [Name].displayName = '[Name]';
   ```

5. **Types Template**

   ```typescript
   // src/components/[Name]/[Name].types.ts
   import type { ComponentPropsWithoutRef, ReactNode } from 'react';

   export type [Name]Variant = 'default' | 'primary' | 'secondary';

   export interface [Name]Props extends ComponentPropsWithoutRef<'div'> {
     /** The visual style variant */
     variant?: [Name]Variant;
     /** Content to render inside the component */
     children?: ReactNode;
     /** Additional CSS classes */
     className?: string;
   }
   ```

6. **Test Template**

   ```typescript
   // src/components/[Name]/[Name].test.tsx
   import { describe, it, expect, vi } from 'vitest';
   import { render, screen } from '@/test/utils';
   import { [Name] } from './[Name]';

   describe('[Name]', () => {
     it('renders children correctly', () => {
       render(<[Name]>Test content</[Name]>);
       expect(screen.getByText('Test content')).toBeInTheDocument();
     });

     it('applies variant styles', () => {
       const { container } = render(<[Name] variant="primary" />);
       expect(container.firstChild).toHaveClass('primary-class');
     });

     it('forwards ref correctly', () => {
       const ref = vi.fn();
       render(<[Name] ref={ref} />);
       expect(ref).toHaveBeenCalled();
     });

     it('spreads additional props', () => {
       render(<[Name] data-testid="test-component" />);
       expect(screen.getByTestId('test-component')).toBeInTheDocument();
     });
   });
   ```

7. **Index Template**

   ```typescript
   // src/components/[Name]/index.ts
   export { [Name] } from './[Name]';
   export type { [Name]Props, [Name]Variant } from './[Name].types';
   ```

## Design System Compliance

- Use design tokens from `tokens.ts` for:
  - Colors: `colors.primary`, `colors.gray[500]`
  - Spacing: `spacing[4]`, `spacing[8]`
  - Typography: `fontSize.sm`, `fontWeight.medium`
  - Border radius: `borderRadius.md`

- Use Tailwind classes that map to tokens
- Avoid hardcoded values (no `#ff0000`, use `text-red-500`)
- Support dark mode with `dark:` prefix

## Accessibility

- Add appropriate ARIA attributes
- Ensure keyboard navigation works
- Use semantic HTML elements
- Include focus states
- Support screen readers

## Example

Input: "Card component for displaying coach or couple information"

Creates:
- `src/components/Card/Card.tsx`
- `src/components/Card/Card.types.ts`
- `src/components/Card/Card.test.tsx`
- `src/components/Card/index.ts`

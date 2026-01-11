# Resonate Design System

A comprehensive design system for building consistent, accessible, and beautiful user interfaces across Resonate applications.

## Overview

The Resonate Design System provides:

- **Design Tokens**: Colors, spacing, typography, and other foundational values
- **Components**: Reusable UI components built with React and TypeScript
- **Patterns**: Common UI patterns and layouts
- **Guidelines**: Usage guidelines and best practices

## Getting Started

### Import Tokens

```typescript
import { colors, spacing, typography } from '@resonate/design-system/tokens';
```

### Use Components

```typescript
import { Button, Card, Input } from '@resonate/design-system/components';
```

## Design Principles

1. **Consistency**: Maintain visual and behavioral consistency across all interfaces
2. **Accessibility**: Ensure all components meet WCAG 2.1 AA standards
3. **Responsiveness**: Design for all screen sizes and devices
4. **Simplicity**: Keep interfaces clean and focused

## Token Categories

### Colors

- Primary: Blue tones for primary actions and branding
- Secondary: Neutral grays for supporting content
- Accent: Thematic colors (love, faith, hope, joy)
- Semantic: Success, warning, error, info states

### Typography

- Font family: Inter (sans-serif primary)
- Scale: xs to 9xl
- Weights: thin to black

### Spacing

- 4px base unit
- Scale: 0 to 96 (384px)

## Contributing

When adding new tokens or components:

1. Follow existing naming conventions
2. Document usage and examples
3. Ensure accessibility compliance
4. Add TypeScript types

# Design System & UI Guidelines

> **Brand Guide**: See `specs/resonate-brand-guide.pdf` for official Resonate brand assets
> **Figma Designs**: https://www.figma.com/design/OYkmQvam43rQbp3uizyhai/Marriage-Ministry?node-id=1-6
> **Figma MCP**: Connect via `http://127.0.0.1:3845/mcp` for design-to-code workflow
> **Priority**: Foundation - Apply across all phases

---

## Overview

This document defines the visual language, component patterns, and interaction guidelines for the Marriage Ministry application. All UI implementation should follow these standards for consistency.

## Figma Integration

### Accessing Designs

**Figma File**: Marriage Ministry Design System
- URL: https://www.figma.com/design/OYkmQvam43rQbp3uizyhai/Marriage-Ministry?node-id=1-6
- Contains: Login page, dashboard layouts, component library, mobile views

### MCP Integration

Connect to Figma MCP server for automated design-to-code workflows:

```bash
# MCP Server endpoint
http://127.0.0.1:3845/mcp
```

Use MCP to:
- Extract component specs from Figma frames
- Generate Tailwind classes from design tokens
- Sync color values and spacing
- Export SVG icons and assets

---

## Color System

### Primary Palette (from Resonate Brand Guide)

```css
:root {
  /* === Brand Colors === */
  --resonate-blue: #41748d;
  --resonate-blue-rgb: 65, 116, 141;

  --resonate-green: #50a684;
  --resonate-green-rgb: 80, 166, 132;

  --resonate-dark-gray: #373a36;
  --resonate-dark-gray-rgb: 55, 58, 54;

  --resonate-light-gray: #545454;
  --resonate-light-gray-rgb: 84, 84, 84;

  /* === Extended Palette === */
  --resonate-blue-50: #eef4f7;
  --resonate-blue-100: #d4e3ea;
  --resonate-blue-200: #a9c7d5;
  --resonate-blue-300: #7eabbf;
  --resonate-blue-400: #5a8fa8;
  --resonate-blue-500: #41748d; /* Base */
  --resonate-blue-600: #345d71;
  --resonate-blue-700: #274655;
  --resonate-blue-800: #1a2f39;
  --resonate-blue-900: #0d181d;

  --resonate-green-50: #edf7f3;
  --resonate-green-100: #d2ebe1;
  --resonate-green-200: #a5d7c3;
  --resonate-green-300: #78c3a5;
  --resonate-green-400: #5fb492;
  --resonate-green-500: #50a684; /* Base */
  --resonate-green-600: #408569;
  --resonate-green-700: #30634f;
  --resonate-green-800: #204235;
  --resonate-green-900: #10211a;

  /* === Semantic Colors === */
  --color-primary: var(--resonate-blue);
  --color-primary-hover: var(--resonate-blue-600);
  --color-primary-active: var(--resonate-blue-700);

  --color-secondary: var(--resonate-green);
  --color-secondary-hover: var(--resonate-green-600);
  --color-secondary-active: var(--resonate-green-700);

  --color-success: var(--resonate-green);
  --color-warning: #d4a574;
  --color-error: #c45c5c;
  --color-info: var(--resonate-blue);

  --color-text-primary: var(--resonate-dark-gray);
  --color-text-secondary: var(--resonate-light-gray);
  --color-text-muted: #9ca3af;
  --color-text-inverse: #ffffff;

  --color-background: #ffffff;
  --color-surface: #f8f9fa;
  --color-surface-elevated: #ffffff;
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        resonate: {
          blue: {
            DEFAULT: '#41748d',
            50: '#eef4f7',
            100: '#d4e3ea',
            200: '#a9c7d5',
            300: '#7eabbf',
            400: '#5a8fa8',
            500: '#41748d',
            600: '#345d71',
            700: '#274655',
            800: '#1a2f39',
            900: '#0d181d',
          },
          green: {
            DEFAULT: '#50a684',
            50: '#edf7f3',
            100: '#d2ebe1',
            200: '#a5d7c3',
            300: '#78c3a5',
            400: '#5fb492',
            500: '#50a684',
            600: '#408569',
            700: '#30634f',
            800: '#204235',
            900: '#10211a',
          },
          'dark-gray': '#373a36',
          'light-gray': '#545454',
        },
      },
      fontFamily: {
        heading: ['Acumin Pro ExtraCondensed', 'Arial Narrow', 'sans-serif'],
        subheading: ['Acumin Pro SemiCondensed', 'Arial', 'sans-serif'],
        body: ['Acumin Pro', 'Inter', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-resonate': 'linear-gradient(135deg, #41748d 0%, #50a684 100%)',
        'gradient-resonate-reverse': 'linear-gradient(135deg, #50a684 0%, #41748d 100%)',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Typography

### Font Family

Primary: **Acumin Pro** (from brand guide)
- Headings: Acumin Pro ExtraCondensed Bold Italic
- Subheadings: Acumin Pro SemiCondensed Bold
- Body: Acumin Pro Regular

Fallbacks: Inter, system fonts

### Type Scale

```css
/* Text sizes */
--text-xs: 0.75rem;     /* 12px - Labels, captions */
--text-sm: 0.875rem;    /* 14px - Secondary text, table content */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Large body, card titles */
--text-xl: 1.25rem;     /* 20px - Section headings */
--text-2xl: 1.5rem;     /* 24px - Page titles */
--text-3xl: 1.875rem;   /* 30px - Hero headings */
--text-4xl: 2.25rem;    /* 36px - Display text */

/* Line heights */
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### Usage Guidelines

```tsx
// Page title
<h1 className="text-2xl font-bold text-resonate-dark-gray">
  Dashboard
</h1>

// Section heading
<h2 className="text-xl font-semibold text-resonate-dark-gray">
  Your Assignments
</h2>

// Card title
<h3 className="text-lg font-medium text-resonate-dark-gray">
  Communication Basics
</h3>

// Body text
<p className="text-base text-resonate-light-gray">
  Complete this week's reflection with your spouse.
</p>

// Secondary/helper text
<span className="text-sm text-gray-500">
  Due in 3 days
</span>

// Labels
<label className="text-sm font-medium text-gray-700">
  Email address
</label>
```

---

## Spacing System

Use consistent spacing based on 4px grid:

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Component Spacing Patterns

```tsx
// Card padding
<Card className="p-6">  {/* 24px */}

// Form field spacing
<div className="space-y-4">  {/* 16px between fields */}

// Section spacing
<section className="py-8">  {/* 32px top/bottom */}

// Button group
<div className="flex gap-3">  {/* 12px between buttons */}
```

---

## Component Library

### Buttons

```tsx
// Primary button - Main actions
<Button className="bg-resonate-blue hover:bg-resonate-blue-600 text-white">
  Save Changes
</Button>

// Secondary button - Alternative actions
<Button variant="outline" className="border-resonate-blue text-resonate-blue hover:bg-resonate-blue-50">
  Cancel
</Button>

// Success button - Confirmations
<Button className="bg-resonate-green hover:bg-resonate-green-600 text-white">
  Submit Response
</Button>

// Destructive button - Dangerous actions
<Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
  Delete
</Button>

// Ghost button - Tertiary actions
<Button variant="ghost" className="text-resonate-blue hover:bg-resonate-blue-50">
  Learn More
</Button>

// Button sizes
<Button size="sm">Small</Button>    {/* px-3 py-1.5 text-sm */}
<Button size="default">Default</Button>  {/* px-4 py-2 text-base */}
<Button size="lg">Large</Button>    {/* px-6 py-3 text-lg */}
```

### Cards

```tsx
// Standard card
<Card className="bg-white rounded-lg shadow-card p-6">
  <CardHeader>
    <CardTitle className="text-lg font-semibold text-resonate-dark-gray">
      Card Title
    </CardTitle>
    <CardDescription className="text-sm text-resonate-light-gray">
      Supporting text
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Card with accent border
<Card className="bg-white rounded-lg shadow-card p-6 border-l-4 border-l-resonate-blue">
  {/* Highlighted content */}
</Card>

// Interactive card
<Card className="bg-white rounded-lg shadow-card p-6 hover:shadow-card-hover cursor-pointer transition-shadow">
  {/* Clickable content */}
</Card>
```

### Form Elements

```tsx
// Text input
<div className="space-y-1.5">
  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
    Email
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="w-full border-gray-300 focus:border-resonate-blue focus:ring-resonate-blue"
  />
</div>

// Select
<Select>
  <SelectTrigger className="w-full border-gray-300 focus:border-resonate-blue">
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

// Textarea
<Textarea
  placeholder="Share your thoughts..."
  className="min-h-[120px] border-gray-300 focus:border-resonate-blue focus:ring-resonate-blue"
/>

// Checkbox
<div className="flex items-center gap-2">
  <Checkbox
    id="terms"
    className="border-gray-300 data-[state=checked]:bg-resonate-blue data-[state=checked]:border-resonate-blue"
  />
  <Label htmlFor="terms" className="text-sm text-gray-700">
    I agree to the terms
  </Label>
</div>
```

### Badges

```tsx
// Status badges
<Badge className="bg-resonate-green/10 text-resonate-green border-resonate-green/20">
  Completed
</Badge>

<Badge className="bg-resonate-blue/10 text-resonate-blue border-resonate-blue/20">
  In Progress
</Badge>

<Badge className="bg-amber-100 text-amber-700 border-amber-200">
  Pending
</Badge>

<Badge className="bg-red-100 text-red-700 border-red-200">
  Overdue
</Badge>

// Category badges
<Badge variant="outline" className="text-xs">
  Communication
</Badge>
```

### Navigation

```tsx
// Sidebar navigation
<nav className="w-64 bg-resonate-blue min-h-screen p-4">
  <div className="mb-8">
    {/* Logo */}
    <img src="/logo-white.svg" alt="Resonate" className="h-8" />
  </div>

  <ul className="space-y-1">
    <li>
      <a
        href="/dashboard"
        className="flex items-center gap-3 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <HomeIcon className="h-5 w-5" />
        Dashboard
      </a>
    </li>
    {/* Active state */}
    <li>
      <a
        href="/assignments"
        className="flex items-center gap-3 px-4 py-2 rounded-lg text-white bg-resonate-green"
      >
        <ClipboardIcon className="h-5 w-5" />
        Assignments
      </a>
    </li>
  </ul>
</nav>
```

---

## Page Layouts

### Login Page (Reference: Figma node-id=1-6)

```tsx
export function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-resonate items-center justify-center p-12">
        <div className="text-center text-white">
          <img src="/logo-white.svg" alt="Resonate" className="h-16 mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4">Marriage Ministry</h1>
          <p className="text-xl opacity-90">
            Growing together in faith and love
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-resonate-dark-gray">
              Welcome back
            </h2>
            <p className="text-resonate-light-gray mt-2">
              Sign in to continue your journey
            </p>
          </div>

          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <Checkbox id="remember" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-resonate-blue hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full bg-resonate-blue hover:bg-resonate-blue-600">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Or sign in with a{' '}
              <button className="text-resonate-blue hover:underline">
                magic link
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

### Dashboard Layout

```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-resonate-dark-gray">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Metric Cards Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <MetricCard
    title="Active Couples"
    value={42}
    icon={<Users className="h-5 w-5" />}
    trend={{ value: 5, isPositive: true }}
    color="blue"
  />
  <MetricCard
    title="Completed This Week"
    value={18}
    icon={<CheckCircle className="h-5 w-5" />}
    color="green"
  />
  <MetricCard
    title="Pending Reviews"
    value={7}
    icon={<Clock className="h-5 w-5" />}
    color="amber"
  />
  <MetricCard
    title="Overdue"
    value={3}
    icon={<AlertTriangle className="h-5 w-5" />}
    color="red"
  />
</div>
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Mobile landscape, small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops, landscape tablets */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Mobile Considerations

```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">

// Hide on mobile, show on desktop
<div className="hidden lg:block">

// Full width on mobile, fixed on desktop
<div className="w-full md:w-96">

// Responsive text
<h1 className="text-xl md:text-2xl lg:text-3xl">

// Responsive padding
<section className="px-4 md:px-6 lg:px-8">
```

---

## Animation & Transitions

```css
/* Standard transitions */
.transition-default {
  transition-property: color, background-color, border-color, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Hover animations */
.hover-lift {
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 200ms ease-out;
}
```

### Tailwind Animation Classes

```tsx
// Button hover
<Button className="transition-colors hover:bg-resonate-blue-600">

// Card hover
<Card className="transition-shadow hover:shadow-card-hover">

// Loading state
<Loader2 className="h-4 w-4 animate-spin" />

// Skeleton loading
<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
```

---

## Accessibility

### Color Contrast

All text must meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio

### Focus States

```css
/* Custom focus ring using brand colors */
.focus-ring {
  outline: none;
  ring: 2px;
  ring-color: var(--resonate-blue);
  ring-offset: 2px;
}
```

```tsx
<Button className="focus:ring-2 focus:ring-resonate-blue focus:ring-offset-2">
```

### ARIA Labels

```tsx
// Icon-only buttons
<Button aria-label="Close dialog">
  <XIcon className="h-4 w-4" />
</Button>

// Loading states
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Loading...' : content}
</div>

// Form validation
<Input
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <p id="email-error" className="text-red-600 text-sm">{error}</p>}
```

---

## Dark Mode (Future)

Reserved CSS variables for future dark mode implementation:

```css
/* Dark mode colors - to be implemented */
.dark {
  --color-background: #1a1a1a;
  --color-surface: #2d2d2d;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a0a0a0;
  --color-border: #404040;
}
```

---

## Icon Library

Use Lucide React for consistent iconography:

```bash
npm install lucide-react
```

Commonly used icons:

```tsx
import {
  // Navigation
  Home, Users, ClipboardList, MessageSquare, Settings, LogOut,

  // Actions
  Plus, Edit, Trash2, Check, X, ChevronDown, ChevronRight,

  // Status
  CheckCircle, AlertTriangle, Clock, Info, XCircle,

  // Communication
  Mail, Phone, MessageCircle, Send,

  // Misc
  Search, Filter, Download, Upload, ExternalLink, Loader2
} from 'lucide-react';
```

Icon sizing:

```tsx
<HomeIcon className="h-4 w-4" />  {/* Small - inline with text */}
<HomeIcon className="h-5 w-5" />  {/* Default - buttons, nav */}
<HomeIcon className="h-6 w-6" />  {/* Large - section headers */}
<HomeIcon className="h-8 w-8" />  {/* XL - empty states */}
```

---

## Implementation Checklist

- [ ] Configure Tailwind with brand colors
- [ ] Import/configure Acumin Pro fonts (or fallbacks)
- [ ] Create base component styles (Button, Card, Input, etc.)
- [ ] Implement Login page matching Figma design
- [ ] Connect Figma MCP for ongoing design sync
- [ ] Set up responsive breakpoints
- [ ] Add focus states for accessibility
- [ ] Create loading/skeleton states
- [ ] Document component usage patterns

# Marriage Ministry App

A centralized web application for tracking marriage ministry members, coaches, and couples at our church. Mobile-accessible and designed to facilitate weekly assignments and couple engagement tracking.

## Overview

The Marriage Ministry App helps ministry leaders manage:
- **Ministry Head**: Oversees all coaches and tracks overall ministry health
- **Coaches**: Assigned to mentor multiple couples, send weekly assignments
- **Couples**: Receive assignments, respond to questions about their marriage journey

## Features

- Coach management and assignment
- Couple tracking and status monitoring
- Weekly assignment distribution
- Response collection and tracking
- Mobile-responsive design
- Real-time status updates

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Resonate Design System
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth

## Project Structure

```
marriage_ministry/
├── components/           # React components
│   ├── ui/              # Base UI components
│   ├── coaches/         # Coach-related components
│   ├── couples/         # Couple-related components
│   ├── assignments/     # Assignment components
│   └── dashboard/       # Dashboard components
├── constants/           # App constants and configuration
├── contexts/            # React contexts
├── design-system/       # Resonate Design System
│   ├── tokens/          # Design tokens (colors, spacing, etc.)
│   ├── components/      # Design system components
│   ├── patterns/        # UI patterns
│   └── docs/            # Design documentation
├── guidelines/          # Development guidelines
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── public/              # Static assets
│   └── assets/          # Images, icons, etc.
├── services/            # API services
├── styles/              # Global styles
├── supabase/            # Supabase configuration
│   ├── functions/       # Edge functions
│   │   └── server/      # Server-side logic
│   └── migrations/      # Database migrations
├── types/               # TypeScript types
└── utils/               # Utility functions
    └── supabase/        # Supabase utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## GitHub Repository

Repository: `github.com/lseng/marriage_ministry`

To connect to remote:
```bash
git remote add origin git@github.com:lseng/marriage_ministry.git
git branch -M main
git push -u origin main
```

## License

Private - All rights reserved

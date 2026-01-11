// Resonate Design System - Color Tokens
// These tokens define the color palette for the Marriage Ministry app

export const colors = {
  // Primary palette
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary palette
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Accent colors
  accent: {
    love: '#e11d48',      // Rose for love/marriage theme
    faith: '#7c3aed',     // Violet for spiritual
    hope: '#059669',      // Emerald for hope/growth
    joy: '#f59e0b',       // Amber for joy
  },

  // Semantic colors
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Neutral
  neutral: {
    white: '#ffffff',
    black: '#000000',
    background: '#fafafa',
    surface: '#ffffff',
    border: '#e5e7eb',
  },
} as const;

export type ColorToken = typeof colors;

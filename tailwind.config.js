/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './design-system/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Resonate Brand Colors with extended palette (50-900 shades)
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
        body: ['Acumin Pro', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-resonate': 'linear-gradient(135deg, #41748d 0%, #50a684 100%)',
        'gradient-resonate-reverse': 'linear-gradient(135deg, #50a684 0%, #41748d 100%)',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        elevated: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

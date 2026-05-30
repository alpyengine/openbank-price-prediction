/**
 * Tailwind CSS configuration — v6.9.0+
 *
 * Uses shadcn/ui standard CSS variable naming convention.
 * All color tokens reference CSS variables defined in src/styles/global.css.
 *
 * This allows:
 *   - Light/dark mode via .dark class on <html>
 *   - Tailwind color utilities: bg-card, text-muted-foreground, border-border, etc.
 *   - Opacity modifiers: bg-primary/50, text-foreground/80
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Enable dark mode via class strategy (.dark on <html>)
  darkMode: 'class',

  // Files to scan for Tailwind class usage
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        // Core page colors
        background:  'var(--background)',
        foreground:  'var(--foreground)',

        // Card container
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },

        // Popover / floating panels
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },

        // Primary action (buttons, active states)
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },

        // Secondary (subtle backgrounds)
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },

        // Muted (placeholder text, disabled states)
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        // Accent (hover states)
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },

        // Destructive (errors, danger actions)
        destructive: {
          DEFAULT:    'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },

        // Status colors (outside shadcn standard — app-specific)
        success:  'var(--success)',
        warning:  'var(--warning)',

        // Form elements
        border:  'var(--border)',
        input:   'var(--input)',
        ring:    'var(--ring)',

        // Sidebar
        sidebar: {
          DEFAULT:              'var(--sidebar)',
          foreground:           'var(--sidebar-foreground)',
          border:               'var(--sidebar-border)',
          accent:               'var(--sidebar-accent)',
          'accent-foreground':  'var(--sidebar-accent-foreground)',
          primary:              'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
        },
      },

      // Border radius scale — matches shadcn defaults
      borderRadius: {
        lg:   'var(--radius)',            // 0.5rem
        md:   'calc(var(--radius) - 2px)', // 0.375rem
        sm:   'calc(var(--radius) - 4px)', // 0.25rem
      },
    },
  },

  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'var(--tw-bg)',
        foreground:  'var(--tw-fg)',
        border:      'var(--tw-border)',
        input:       'var(--tw-input)',
        ring:        'var(--tw-ring)',
        primary: {
          DEFAULT:    'var(--tw-primary)',
          foreground: 'var(--tw-primary-fg)',
        },
        secondary: {
          DEFAULT:    'var(--tw-secondary)',
          foreground: 'var(--tw-secondary-fg)',
        },
        muted: {
          DEFAULT:    'var(--tw-muted)',
          foreground: 'var(--tw-muted-fg)',
        },
        accent: {
          DEFAULT:    'var(--tw-accent)',
          foreground: 'var(--tw-accent-fg)',
        },
        card: {
          DEFAULT:    'var(--tw-card)',
          foreground: 'var(--tw-card-fg)',
        },
        sidebar: {
          DEFAULT:              'var(--tw-sidebar)',
          foreground:           'var(--tw-sidebar-fg)',
          border:               'var(--tw-sidebar-border)',
          accent:               'var(--tw-sidebar-accent)',
          'accent-foreground':  'var(--tw-sidebar-accent-fg)',
          primary:              'var(--tw-sidebar-primary)',
          'primary-foreground': 'var(--tw-sidebar-primary-fg)',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}

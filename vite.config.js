import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite configuration — v6.9.0+
 *
 * Added: path alias @/ → src/
 *   Allows clean imports: import { Button } from '@/components/ui/button'
 *   instead of:          import { Button } from '../../components/ui/button'
 *
 * This is the shadcn/ui standard import convention.
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // @/ maps to the src/ directory
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
  },

  // Vitest configuration
  test: {
    // Two environments:
    //   node  — for pure JS unit tests (utils, hooks, storage)
    //   jsdom — for React component tests (RTL)
    // Files under __tests__/ use jsdom automatically via the
    // environmentMatchGlobs setting below.
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/__tests__/**', 'jsdom'],
    ],
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/hooks/useHistory.js', 'src/components/**'],
    },
  },
})

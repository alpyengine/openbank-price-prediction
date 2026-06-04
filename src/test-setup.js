/**
 * test-setup.js — global test setup for Vitest
 *
 * Imports @testing-library/jest-dom which extends Vitest's expect()
 * with DOM-specific matchers:
 *   toBeInTheDocument(), toHaveTextContent(), toBeVisible(),
 *   toHaveClass(), toBeDisabled(), etc.
 *
 * Applied to ALL tests via vite.config.js setupFiles.
 */
import '@testing-library/jest-dom'

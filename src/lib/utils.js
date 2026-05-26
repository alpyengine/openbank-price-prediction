import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge.
 * Used by shadcn/ui components in v6.0.0.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

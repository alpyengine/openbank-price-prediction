/**
 * Textarea — shadcn/ui base component
 *
 * A styled multi-line text input.
 * Used in ImportBox for pasting CSV data.
 *
 * Usage:
 *   import { Textarea } from '@/components/ui/textarea'
 *   <Textarea placeholder="Paste CSV here..." value={csv} onChange={...} rows={6} />
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      // Base: full width, border, rounded, resizable
      'flex min-h-[60px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm',
      // Typography
      'text-foreground placeholder:text-muted-foreground',
      // States
      'transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
))

Textarea.displayName = 'Textarea'

export { Textarea }

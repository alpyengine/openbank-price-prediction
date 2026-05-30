/**
 * Input — shadcn/ui base component
 *
 * A styled text input field.
 * Used for notes input in StockRow and search/filter fields.
 *
 * Usage:
 *   import { Input } from '@/components/ui/input'
 *   <Input type="text" placeholder="Add a note..." value={note} onChange={...} />
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      // Base: full width, border, rounded
      'flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm shadow-sm',
      // Typography
      'text-foreground placeholder:text-muted-foreground',
      // States
      'transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      // File input styling
      'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      className
    )}
    ref={ref}
    {...props}
  />
))

Input.displayName = 'Input'

export { Input }

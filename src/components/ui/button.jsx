/**
 * Button — shadcn/ui base component
 *
 * A polymorphic button with variant and size support via class-variance-authority.
 * Used throughout the app for all interactive actions.
 *
 * Variants:
 *   default     — primary filled button (dark background)
 *   destructive — danger action (red)
 *   outline     — bordered, transparent background
 *   secondary   — secondary action
 *   ghost       — no border, no background (hover only)
 *   link        — looks like a hyperlink
 *
 * Sizes:
 *   default — standard height (h-9)
 *   sm      — compact (h-8)
 *   lg      — large (h-10)
 *   icon    — square icon-only button
 *
 * Usage:
 *   import { Button } from '@/components/ui/button'
 *   <Button variant="outline" size="sm" onClick={handleClick}>Save</Button>
 *   <Button asChild><a href="/link">Link Button</a></Button>
 */
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Define all button variants and sizes using CVA
const buttonVariants = cva(
  // Base classes applied to all variants
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:     'border border-border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:   'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost:       'hover:bg-accent hover:text-accent-foreground',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 rounded-md px-3 text-xs',
        lg:      'h-10 rounded-md px-8',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'default',
    },
  }
)

/**
 * @param {string}  variant  — visual style (default|destructive|outline|secondary|ghost|link)
 * @param {string}  size     — size variant (default|sm|lg|icon)
 * @param {boolean} asChild  — render as child element (Radix Slot pattern)
 */
const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  // asChild allows composing with other elements: <Button asChild><a href="...">
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})

Button.displayName = 'Button'

export { Button, buttonVariants }

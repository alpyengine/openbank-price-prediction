/**
 * Card — shadcn/ui base component
 *
 * A container component with header, content, and footer sections.
 * Used for summary boxes, batch panels, and detail sections.
 *
 * Sub-components:
 *   Card        — outer container with border and shadow
 *   CardHeader  — top section, typically contains title and description
 *   CardTitle   — main heading inside header
 *   CardDescription — subtitle/description inside header
 *   CardContent — main body content area
 *   CardFooter  — bottom section, typically contains actions
 *
 * Usage:
 *   import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
 *   <Card>
 *     <CardHeader><CardTitle>Hit target</CardTitle></CardHeader>
 *     <CardContent><span className="text-3xl font-bold">4</span></CardContent>
 *   </Card>
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/** Outer container — white background, border, subtle shadow */
const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}
    {...props}
  />
))
Card.displayName = 'Card'

/** Top section — padding for title and description */
const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

/** Main heading — semibold, leading-none */
const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

/** Subtitle — smaller muted text below the title */
const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

/** Main body — padded content area (top padding removed to avoid double spacing with header) */
const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pt-0', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

/** Bottom section — flex row for action buttons */
const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

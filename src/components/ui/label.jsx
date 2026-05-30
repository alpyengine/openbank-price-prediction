/**
 * Label — shadcn/ui base component
 *
 * An accessible form label built on Radix UI Label.
 * Automatically associates with the input when used alongside it.
 *
 * Usage:
 *   import { Label } from '@/components/ui/label'
 *   <Label htmlFor="notes">Notes</Label>
 *   <Input id="notes" ... />
 */
import { forwardRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

const Label = forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))

Label.displayName = LabelPrimitive.Root.displayName

export { Label }

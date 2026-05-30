/**
 * Separator — shadcn/ui base component
 *
 * A thin horizontal or vertical dividing line.
 * Built on Radix UI Separator for accessibility (role="separator").
 *
 * Usage:
 *   import { Separator } from '@/components/ui/separator'
 *   <Separator />                          — horizontal
 *   <Separator orientation="vertical" />   — vertical
 *   <Separator className="my-4" />         — with margin
 */
import { forwardRef } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

const Separator = forwardRef((
  { className, orientation = 'horizontal', decorative = true, ...props },
  ref
) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      // Apply dimensions based on orientation
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
))

Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }

/**
 * Tooltip — shadcn/ui base component
 *
 * A floating label that appears on hover to provide additional context.
 * Built on Radix UI Tooltip for accessibility and keyboard support.
 * Used in StockTable for column header help text.
 *
 * Structure:
 *   TooltipProvider  — wraps the app or section (handles delay)
 *   Tooltip          — state controller
 *   TooltipTrigger   — the element that triggers the tooltip
 *   TooltipContent   — the floating content panel
 *
 * Usage:
 *   import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
 *
 *   <TooltipProvider>
 *     <Tooltip>
 *       <TooltipTrigger asChild>
 *         <button>?</button>
 *       </TooltipTrigger>
 *       <TooltipContent>
 *         <p>Helpful explanation here</p>
 *       </TooltipContent>
 *     </Tooltip>
 *   </TooltipProvider>
 */
import { forwardRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip        = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

/** The floating content panel */
const TooltipContent = forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Base: small dark card with fade animation
        'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))

TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

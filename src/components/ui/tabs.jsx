/**
 * Tabs — shadcn/ui base component
 *
 * A tabbed interface for switching between views.
 * Built on Radix UI Tabs for accessibility (keyboard navigation, ARIA).
 * Used in HorizonTabs for the 1M / 3M / 6M / 12M / Best selector.
 *
 * Structure:
 *   Tabs         — root state controller (value + onValueChange)
 *   TabsList     — container for the tab trigger buttons
 *   TabsTrigger  — individual tab button
 *   TabsContent  — content panel shown when the tab is active
 *
 * Usage:
 *   import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
 *
 *   <Tabs value={horizon} onValueChange={setHorizon}>
 *     <TabsList>
 *       <TabsTrigger value="1M">1M</TabsTrigger>
 *       <TabsTrigger value="3M">3M</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="1M">...</TabsContent>
 *   </Tabs>
 */
import { forwardRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs        = TabsPrimitive.Root
const TabsTrigger = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base: pill-shaped trigger that becomes solid on active
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
      'ring-offset-background transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      // Active state: white card with shadow lifts above the list background
      'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      // Inactive: muted text
      'text-muted-foreground hover:text-foreground',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/** Container for tab triggers — muted pill background */
const TabsList = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/** Content panel — hidden unless the matching tab is active */
const TabsContent = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

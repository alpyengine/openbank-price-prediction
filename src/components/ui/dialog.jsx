/**
 * Dialog — shadcn/ui base component
 *
 * A modal overlay built on Radix UI Dialog.
 * Handles focus trapping, Escape key, and backdrop click automatically.
 * Used for the stock description modal and the PriceChart modal.
 *
 * Structure:
 *   Dialog            — root state controller (open + onOpenChange)
 *   DialogTrigger     — element that opens the dialog
 *   DialogPortal      — renders content outside the DOM tree
 *   DialogOverlay     — the semi-transparent backdrop
 *   DialogContent     — the modal panel (includes close button)
 *   DialogHeader      — top section for title and description
 *   DialogFooter      — bottom section for action buttons
 *   DialogTitle       — accessible title (required for screen readers)
 *   DialogDescription — accessible description (optional)
 *   DialogClose       — button that closes the dialog
 *
 * Usage:
 *   import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
 *
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogContent>
 *       <DialogHeader>
 *         <DialogTitle>Stock description</DialogTitle>
 *       </DialogHeader>
 *       <p>Content here...</p>
 *     </DialogContent>
 *   </Dialog>
 */
import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog        = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal  = DialogPrimitive.Portal
const DialogClose   = DialogPrimitive.Close

/** Semi-transparent backdrop behind the modal */
const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * The modal panel — centered on screen with max width and scrollable content.
 * Automatically includes a close (✕) button in the top-right corner.
 */
const DialogContent = forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Positioning: fixed, centered
        'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
        // Sizing: responsive max width, scrollable if tall
        'w-full max-w-lg max-h-[85vh] overflow-y-auto',
        // Visual: card style with shadow
        'grid gap-4 border border-border bg-card p-6 shadow-lg',
        'rounded-lg',
        // Animations
        'duration-200',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
      {/* Close button — top right corner */}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
          'hover:opacity-100',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none',
          'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/** Top section — flex column for title and description */
const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

/** Bottom section — flex row for action buttons (right-aligned on sm+) */
const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

/** Accessible title — required by screen readers */
const DialogTitle = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/** Accessible description — optional subtitle */
const DialogDescription = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
}

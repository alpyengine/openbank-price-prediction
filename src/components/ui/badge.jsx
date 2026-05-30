/**
 * Badge — shadcn/ui base component
 *
 * Small label used to display status, categories, or short text.
 * In this app primarily used for verdict labels: HIT / CLOSE / MISS / AWAITING
 * and for horizon labels: 1M / 3M / 6M / 12M.
 *
 * Variants:
 *   default     — primary color (dark)
 *   secondary   — muted background
 *   destructive — red (danger/miss)
 *   outline     — bordered, transparent background
 *
 * Note: for verdict-specific colors (green/amber/red), use the className prop
 * with cn() to apply conditional Tailwind classes on top of the base variant.
 *
 * Usage:
 *   import { Badge } from '@/components/ui/badge'
 *   <Badge variant="outline">1M</Badge>
 *   <Badge className={cn({ 'bg-green-50 text-green-700': verdict === 'hit' })}>HIT</Badge>
 */
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // Base: inline-flex pill shape with small text
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:   'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline:     'text-foreground border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * @param {string} variant — visual style (default|secondary|destructive|outline)
 * @param {string} className — additional Tailwind classes (for verdict colors)
 */
function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

/**
 * Table — shadcn/ui base component
 *
 * Semantic HTML table with consistent styling.
 * Used in StockTable, AccuracyChart batch list, and the CSV preview.
 *
 * Sub-components mirror standard HTML table elements:
 *   Table       → <table>
 *   TableHeader → <thead>
 *   TableBody   → <tbody>
 *   TableFooter → <tfoot>
 *   TableRow    → <tr>
 *   TableHead   → <th>
 *   TableCell   → <td>
 *   TableCaption → <caption>
 *
 * Usage:
 *   import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
 *
 *   <Table>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHead>Ticker</TableHead>
 *         <TableHead>Price</TableHead>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       <TableRow>
 *         <TableCell>TER</TableCell>
 *         <TableCell>$358.44</TableCell>
 *       </TableRow>
 *     </TableBody>
 *   </Table>
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/** Outer wrapper — enables horizontal scroll on small screens */
const Table = forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
))
Table.displayName = 'Table'

/** <thead> — sticky header with bottom border */
const TableHeader = forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b', className)}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

/** <tbody> — rows with hover highlight */
const TableBody = forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

/** <tfoot> — summary/totals row */
const TableFooter = forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

/** <tr> — row with bottom border and hover background */
const TableRow = forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border transition-colors',
      'hover:bg-muted/50',
      'data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

/** <th> — header cell, left-aligned, muted text, medium weight */
const TableHead = forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-2 text-left align-middle font-medium text-muted-foreground',
      '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

/** <td> — data cell */
const TableCell = forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-2 align-middle',
      '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

/** <caption> — accessible table description (screen readers) */
const TableCaption = forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }

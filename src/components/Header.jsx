/**
 * Header
 *
 * Top section of each page showing the page title, subtitle, and action buttons.
 * Buttons shown depend on the active page:
 *   All pages:          Dark mode toggle
 *   Batch pages only:   Clear overrides + Email report
 *
 * @param {Object[]} stocks          — current stock array (for base date display)
 * @param {boolean}  darkMode        — current dark mode state
 * @param {Function} onToggleDark    — toggle dark/light mode
 * @param {Function} onClearOverrides — clear all manual price overrides
 * @param {Function} onToggleEmail   — open email report modal
 * @param {string}   loadedBatchDate — date of currently loaded batch
 * @param {string}   batchCurrency   — currency symbol
 * @param {string}   activePage      — current page id
 */
import { formatDate, today as getToday } from '@/utils/dates.js'
import { Moon, Sun, Mail, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TODAY = getToday()

/** Page title and subtitle mapping */
const PAGE_TITLES = {
  'batch':        { title: 'Batch Overview',        sub: 'Quick prediction status at a glance' },
  'batch-detail': { title: 'Batch Overview Detail', sub: 'Full analysis with proximity bars and market comparison' },
  'accuracy':     { title: 'Accuracy Stats',        sub: 'Historical performance metrics and hit rate analysis' },
  'import':       { title: 'Import CSV',            sub: 'Load a new batch of stock predictions' },
  'settings':     { title: 'Settings',             sub: 'Configure your preferences and integrations' },
}

export default function Header({
  stocks, darkMode, onToggleDark, onClearOverrides,
  onToggleEmail, loadedBatchDate, batchCurrency, activePage,
}) {
  const bases = [...new Set(stocks.map(s => s.base ? formatDate(s.base) : '?'))]
  const { title, sub } = PAGE_TITLES[activePage] ?? PAGE_TITLES.batch
  const isBatchPage = ['batch', 'batch-detail'].includes(activePage)

  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      {/* Page title + subtitle */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight">{title}</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {activePage === 'batch' && stocks.length > 0 ? (
            <>
              Base date: <strong className="text-foreground">{bases.join(', ')}</strong>
              {loadedBatchDate && (
                <> · Loaded: <strong className="text-foreground">{loadedBatchDate}</strong></>
              )}
            </>
          ) : sub}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 items-center">
        {/* Dark mode toggle */}
        <Button
          variant="outline"
          size="icon"
          title={darkMode ? 'Light mode' : 'Dark mode'}
          onClick={onToggleDark}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Batch-only actions */}
        {isBatchPage && (
          <>
            <Button variant="outline" size="sm" onClick={onClearOverrides}>
              <RotateCcw size={14} /> Clear overrides
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleEmail}>
              <Mail size={14} /> Email report
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

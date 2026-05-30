/**
 * FetchBar
 *
 * The main action bar displayed at the top of batch pages.
 * Contains all fetch actions, a status log, the batch selector,
 * and the save batch button.
 *
 * Layout (left → right):
 *   [Log message] [Fetch prices] [Fundamentals] [Market data?] [Batch selector] [Save batch]
 *
 * The Market data button only appears for US or EU market batches.
 * All buttons are disabled while any fetch is in progress.
 *
 * @param {string}   log              — price fetch status message
 * @param {boolean}  fetching         — true while fetching prices
 * @param {Function} onFetch          — trigger price fetch
 * @param {string}   fundLog          — fundamentals fetch status message
 * @param {boolean}  fundLoading      — true while fetching fundamentals
 * @param {Function} onFetchFundamentals — trigger fundamentals fetch
 * @param {string}   marketLog        — market data fetch status message
 * @param {boolean}  marketLoading    — true while fetching market data
 * @param {Object[]} stocks           — current stock array (used to detect market)
 * @param {Function} onFetchMarket    — trigger market data fetch
 * @param {Object[]} batches          — saved batches for the selector
 * @param {string}   loadedBatchDate  — date of currently loaded batch
 * @param {Function} onLoadBatch      — called when user selects a batch
 * @param {Function} onSave           — trigger save batch
 * @param {boolean}  saving           — true while saving
 */
import { useState, useRef, useEffect } from 'react'
import { EU_MARKET_INDEX } from '@/hooks/useMarketData.js'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detects the market suffix from the first stock ticker (e.g. 'US', 'DE', 'AS') */
function detectSuffix(stocks) {
  if (!stocks.length) return 'US'
  return stocks[0].t.split('.').pop().toUpperCase()
}

/**
 * Inline spinner — shown inside buttons while loading.
 * Uses border animation instead of an SVG to keep it lightweight.
 *
 * @param {boolean} light — white spinner (for dark/green buttons)
 */
function Spinner({ light }) {
  return (
    <div className={cn(
      'w-3 h-3 rounded-full border-2 shrink-0 animate-spin',
      light
        ? 'border-white/30 border-t-white'
        : 'border-border border-t-foreground'
    )} />
  )
}

/**
 * Parses a DD/MM/YYYY date string to a Date object for sorting.
 * Falls back to epoch (Jan 1, 1970) for invalid strings.
 */
function parseBatchDate(str) {
  if (!str) return new Date(0)
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
  const d = new Date(str)
  return isNaN(d) ? new Date(0) : d
}

// ── BatchSelector ─────────────────────────────────────────────────────────────

/**
 * BatchSelector
 *
 * Dropdown showing all saved batches sorted newest-first.
 * The currently loaded batch is marked with a checkmark.
 * Clicking a batch calls onLoadBatch and closes the dropdown.
 *
 * Uses a custom dropdown instead of shadcn Select because we need
 * the trigger to display the currently loaded date (not the select value).
 */
function BatchSelector({ batches, loadedBatchDate, onLoadBatch }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sort batches newest first
  const sorted     = batches ? [...batches].sort((a, b) => parseBatchDate(b.date) - parseBatchDate(a.date)) : []
  const hasBatches = sorted.length > 0
  const label      = loadedBatchDate || (hasBatches ? sorted[0].date : null) || 'No batches'

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        disabled={!hasBatches}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'gap-1.5 font-medium whitespace-nowrap',
          !hasBatches && 'opacity-60'
        )}
      >
        {label}
        <ChevronDown size={12} className="text-muted-foreground shrink-0" />
      </Button>

      {/* Dropdown panel */}
      {open && hasBatches && (
        <div className={cn(
          'absolute top-[calc(100%+6px)] right-0 z-50',
          'bg-card border border-border rounded-lg shadow-lg',
          'min-w-[180px] overflow-hidden'
        )}>
          {sorted.map(batch => {
            const isActive = batch.date === loadedBatchDate
            return (
              <button
                key={batch.id}
                onClick={() => { onLoadBatch(batch); setOpen(false) }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5',
                  'border-b border-border last:border-0',
                  'text-sm text-left cursor-pointer font-inherit',
                  'transition-colors hover:bg-muted',
                  isActive ? 'bg-muted font-semibold' : 'bg-card font-normal'
                )}
              >
                {batch.date}
                {isActive && <Check size={13} className="text-success shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FetchBar({
  log, fetching, onFetch,
  fundLog, fundLoading, onFetchFundamentals,
  marketLog, marketLoading, stocks, onFetchMarket,
  batches, loadedBatchDate, onLoadBatch,
  onSave, saving,
}) {
  const suffix     = detectSuffix(stocks ?? [])
  const isUS       = suffix === 'US' || !(stocks?.[0]?.t?.includes('.'))
  const isEU       = ['DE', 'AS', 'PA', 'L', 'MC'].includes(suffix)
  const showMarket = (stocks?.length > 0) && (isUS || isEU)
  const anyLoading = fetching || fundLoading || marketLoading

  // Show the most relevant log message
  const combinedLog = fetching     ? log
    : fundLoading                  ? fundLog
    : marketLoading                ? marketLog
    : log || fundLog || marketLog || 'Import stocks, then click Fetch'

  return (
    <div className={cn(
      'flex items-center gap-2.5 mb-6 px-3.5 py-2.5',
      'border border-border rounded-lg bg-card',
      'shadow-sm'
    )}>
      {/* ── Status log ─────────────────────────────────────────────────── */}
      <span className="text-[11px] text-muted-foreground font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {combinedLog}
      </span>

      {/* ── Fetch prices ───────────────────────────────────────────────── */}
      <Button
        size="sm"
        className="shrink-0 whitespace-nowrap bg-success hover:bg-success/90 text-white border-success"
        disabled={anyLoading}
        onClick={onFetch}
      >
        {fetching ? <Spinner light /> : '↓'}
        {fetching ? 'Fetching…' : 'Fetch prices'}
      </Button>

      {/* ── Fetch fundamentals ─────────────────────────────────────────── */}
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 whitespace-nowrap"
        disabled={anyLoading}
        onClick={onFetchFundamentals}
      >
        {fundLoading ? <Spinner /> : '↓'}
        {fundLoading ? 'Loading…' : 'Fundamentals'}
      </Button>

      {/* ── Fetch market data — only for US/EU batches ─────────────────── */}
      {showMarket && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 whitespace-nowrap"
          disabled={anyLoading}
          onClick={onFetchMarket}
        >
          {marketLoading ? <Spinner /> : '↓'}
          {marketLoading ? 'Loading…' : 'Market data'}
        </Button>
      )}

      {/* ── Batch selector ─────────────────────────────────────────────── */}
      {batches && (
        <BatchSelector
          batches={batches}
          loadedBatchDate={loadedBatchDate}
          onLoadBatch={onLoadBatch}
        />
      )}

      {/* ── Save batch ─────────────────────────────────────────────────── */}
      {onSave && (
        <Button
          size="sm"
          className="shrink-0 whitespace-nowrap bg-success hover:bg-success/90 text-white border-success"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? <Spinner light /> : '💾'}
          {saving ? 'Saving…' : 'Save batch'}
        </Button>
      )}
    </div>
  )
}

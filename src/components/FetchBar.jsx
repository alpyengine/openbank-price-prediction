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
 * @param {Function} onRefreshFundamentals — force re-fetch all fundamentals (ignores cache)
 * @param {string}   marketLog        — market data fetch status message
 * @param {boolean}  marketLoading    — true while fetching market data
 * @param {Object[]} stocks           — current stock array (used to detect market)
 * @param {Function} onFetchMarket    — trigger market data fetch
 * @param {Function} onRefreshMarket  — force re-fetch market data (clears existing)
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
import { useRole } from '@/hooks/useRole.js'

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

/**
 * batchMarket — derive a batch's market code from its first result ticker.
 * One market per batch (one market per import), so the first ticker is enough.
 */
function batchMarket(batch) {
  const t = batch?.results?.[0]?.ticker || batch?.stocks?.[0]?.t || ''
  return t.includes('.') ? t.split('.').pop().toUpperCase() : 'US'
}

/**
 * BatchChips — small market + direction pills shown next to a batch date.
 * Market is a neutral pill; direction is green (bullish) / red (bearish),
 * matching the import selector's colour language.
 */
function BatchChips({ batch }) {
  const mkt = batchMarket(batch)
  const dir = batch?.direction ?? 'bullish'
  const bear = dir === 'bearish'
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="inline-flex items-center text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
        {mkt}
      </span>
      <span className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
        bear
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-green-50 text-green-700 border-green-200'
      )}>
        {bear ? '↘' : '↗'} {bear ? 'Bear' : 'Bull'}
      </span>
    </span>
  )
}

// ── BatchSelector ─────────────────────────────────────────────────────────────

/**
 * BatchSelector
 *
 * Dropdown showing all saved batches sorted newest-first.
 * Each entry shows date + market + direction so same-day batches
 * (e.g. US bullish vs US bearish vs ES bearish) are distinguishable.
 * The currently loaded batch is matched by id (not date) and marked
 * with a checkmark. Clicking a batch calls onLoadBatch and closes the menu.
 */
function BatchSelector({ batches, loadedBatchDate, loadedBatchId, onLoadBatch }) {
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
  // The active batch is matched by id (falls back to date for old single-date ids)
  const activeBatch = sorted.find(b => b.id === loadedBatchId)
    || sorted.find(b => b.date === loadedBatchDate)
    || (hasBatches ? sorted[0] : null)
  const label = activeBatch?.date || loadedBatchDate || 'No batches'

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        disabled={!hasBatches}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'gap-2 font-medium whitespace-nowrap',
          !hasBatches && 'opacity-60'
        )}
      >
        {label}
        {activeBatch && <BatchChips batch={activeBatch} />}
        <ChevronDown size={12} className="text-muted-foreground shrink-0" />
      </Button>

      {/* Dropdown panel */}
      {open && hasBatches && (
        <div className={cn(
          'absolute top-[calc(100%+6px)] right-0 z-50',
          'bg-card border border-border rounded-lg shadow-lg',
          'min-w-[240px] overflow-hidden'
        )}>
          {sorted.map(batch => {
            const isActive = batch.id === loadedBatchId
            return (
              <button
                key={batch.id}
                onClick={() => { onLoadBatch(batch); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2.5',
                  'border-b border-border last:border-0',
                  'text-sm text-left cursor-pointer font-inherit',
                  'transition-colors hover:bg-muted',
                  isActive ? 'bg-muted font-semibold' : 'bg-card font-normal'
                )}
              >
                <span className="min-w-[84px]">{batch.date}</span>
                <BatchChips batch={batch} />
                <span className="flex-1" />
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
  fundLog, fundLoading, onFetchFundamentals, onRefreshFundamentals,
  marketLog, marketLoading, stocks, onFetchMarket, onRefreshMarket,
  batches, loadedBatchDate, loadedBatchId, onLoadBatch,
  onSave, saving,
}) {
  const role        = useRole()
  const suffix      = detectSuffix(stocks ?? [])
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
      'flex flex-col gap-1.5 mb-6 px-3.5 py-2.5',
      'border border-border rounded-lg bg-card',
      'shadow-sm'
    )}>
      {/* ── Row 1: buttons ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap">

      {/* ── Fetch prices — admin only ──────────────────────────────────── */}
      {role === 'admin' && <Button
        size="sm"
        className="shrink-0 whitespace-nowrap bg-success hover:bg-success/90 text-white border-success"
        disabled={anyLoading}
        onClick={onFetch}
      >
        {fetching ? <Spinner light /> : '↓'}
        {fetching ? 'Fetching…' : 'Fetch prices'}
      </Button>}

      {/* ── Fetch fundamentals — admin only ──────────────────────────────── */}
      {role === 'admin' && <Button
        size="sm"
        variant="outline"
        className="shrink-0 whitespace-nowrap"
        disabled={anyLoading}
        onClick={onFetchFundamentals}
      >
        {fundLoading ? <Spinner /> : '↓'}
        {fundLoading ? 'Loading…' : 'Fundamentals'}
      </Button>}

      {/* ── Refresh fundamentals — force re-fetch ignoring cached data ───── */}
      {role === 'admin' && <Button
        size="sm"
        variant="outline"
        className="shrink-0 whitespace-nowrap"
        disabled={anyLoading}
        onClick={onRefreshFundamentals}
        title="Force re-fetch all fundamentals (replaces existing data)"
      >
        ↺ Refresh
      </Button>}

      {/* ── Fetch market data — only for US/EU batches ─────────────────── */}
      {showMarket && (
        <>
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

          {/* ── Refresh market — force re-fetch clearing existing data ──── */}
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 whitespace-nowrap"
            disabled={marketLoading}
            onClick={onRefreshMarket}
            title="Force re-fetch all market data (replaces existing)"
          >
            {marketLoading ? <Spinner /> : '↺'} Refresh
          </Button>
        </>
      )}

      {/* ── Batch selector ─────────────────────────────────────────────── */}
      {batches && (
        <BatchSelector
          batches={batches}
          loadedBatchDate={loadedBatchDate}
          loadedBatchId={loadedBatchId}
          onLoadBatch={onLoadBatch}
        />
      )}

      {/* ── Save batch — admin only ───────────────────────────────────── */}
      {onSave && role === 'admin' && (
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

      {/* ── Row 2: status log — full width, always visible ─────────────── */}
      <span className="text-[11px] text-muted-foreground font-mono w-full truncate leading-tight">
        {combinedLog}
      </span>
    </div>
  )
}

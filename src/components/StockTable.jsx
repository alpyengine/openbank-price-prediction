/**
 * StockTable
 *
 * The main prediction table on the Batch Overview Detail page.
 * Renders all stocks with their prediction bars, prices, and market comparison.
 *
 * Features:
 *   - Expandable rows (click to show horizon cards, fundamentals, chart, notes)
 *   - Group by sector (collapsible sector headers)
 *   - Filter by sector / industry
 *   - Sort by sector
 *   - Expand / collapse all rows
 *   - Column help modals (? icon on each header)
 *
 * @param {Object[]} stocks           — stock array from CSV
 * @param {string}   horizon          — selected horizon key
 * @param {Object}   autoPrices       — current prices { [ticker]: price }
 * @param {Object}   histPrices       — historical prices { [ticker_horizon]: { price } }
 * @param {Object}   overrides        — manual price overrides
 * @param {boolean}  horizonExpired   — whether selected horizon has expired
 * @param {Object}   fundamentals     — fundamentals data { [ticker]: { sector, ... } }
 * @param {boolean}  groupBySector    — group rows by sector
 * @param {string}   filterSector     — sector filter value ('all' = no filter)
 * @param {string}   filterIndustry   — industry filter value
 * @param {boolean}  sortBySector     — sort rows alphabetically by sector
 * @param {Function} onOverrideChange — called when user enters a manual price
 * @param {Object}   notes            — notes per ticker { [ticker]: string }
 * @param {Function} onNoteChange     — called when note is saved
 * @param {Object}   marketData       — SPY/ETF performance data
 * @param {string}   batchCurrency    — currency symbol (e.g. '$', '€')
 * @param {number}   hitMargin        — hit tolerance in % (default 5)
 * @param {string}   batchId          — Supabase batch id for PriceChart
 * @param {number}   closeRatio       — close zone multiplier (default 2.4)
 */
import { useMemo, useState } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '@/utils/dates.js'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Column help definitions ───────────────────────────────────────────────────

const COL_HELP = {
  ticker: {
    title: '🏷 Ticker & Company',
    sub:   'Stock symbol and company name',
    body:  'The ticker is the unique stock exchange symbol used to identify the company. Click the row arrow (▶) to expand the fundamentals panel with sector, industry, market cap, beta and more.',
    example: 'TER = Teradyne Inc · Technology · Semiconductors',
  },
  sector: {
    title: '🏭 Sector & Industry',
    sub:   'Economic classification from FMP',
    body:  'Sector and Industry are fetched from Financial Modeling Prep (FMP) when you click "Fetch fundamentals". Use the dropdowns above the table to filter or group stocks by sector or industry.',
    example: 'TER → Sector: Technology · Industry: Semiconductors',
  },
  baseDate: {
    title: '📅 Base date',
    sub:   'Date of the Openbank screenshot',
    body:  'The date when the Openbank app published the price forecast. All 4 horizon target dates (1M/3M/6M/12M) are calculated from this base date using calendar month arithmetic.',
    example: 'Base date: 18 Mar 2026 → 1M expires 17 Apr 2026 · 12M expires 18 Mar 2027',
  },
  basePrice: {
    title: '📌 Base price',
    sub:   'Stock price on the screenshot date',
    body:  "The actual market price of the stock on the day the Openbank forecast was published. This is the reference point — all target prices are set relative to this value by Openbank's analysts.",
    example: 'TER base price: 299.40 USD on 18 Mar 2026',
  },
  price: {
    title: '📈 Current price',
    sub:   'Live market price via Twelve Data',
    body:  'The current market price fetched automatically via the Twelve Data API when you click "Fetch prices". Green = above base price. Red = below base price.\n\nFor expired horizons, the price shown is the real historical closing price on the exact target date — not today\'s price.',
    example: 'TER today: 358.25 USD (+19.6% vs base 299.40)',
  },
  override: {
    title: '✏️ Override',
    sub:   'Manual price entry',
    body:  'Type a price manually to override the auto-fetched price. Useful when the API is unavailable or you want to test a specific scenario. Leave empty to use the auto price. Press Enter to confirm, Escape to cancel.',
    example: 'Type 350.00 and press Enter → price updates immediately',
  },
  horizon: {
    title: '⏱ Horizon targets (1M / 3M / 6M / 12M)',
    sub:   "Openbank's predicted prices at each time horizon",
    body:  "Each column shows Openbank's forecast price for that stock at 1, 3, 6 and 12 months from the base date. The date below the label is the exact expiry date.\n\n🔴 expired = the target date has passed. The price shown is the real historical closing price on that exact day — this gives a definitive HIT/MISS.\n\n🔵 Blue = best target — the horizon with the highest upside potential for this stock.",
    example: 'TER 1M → 17 Apr 2026 → target 353.92 → expired\nTER 12M → 18 Mar 2027 → target 790.98 → best target (+299d)',
  },
  hit: {
    title: "✅ Hit? — Prediction result",
    sub:   "Did the stock reach Openbank's target?",
    body:  "Shows whether the stock reached the predicted target at the best horizon expiry date.\n\n✅ HIT — price reached or exceeded the target (±5% tolerance)\n🟡 CLOSE — price came within 5% of the target\n❌ MISS — price did not reach the target\n⏳ -- — horizon not yet expired, result pending",
    example: 'TER 1M: price 358.25 vs target 353.92 → HIT (+1.2%)\nTER 12M: price 358.25 vs target 790.98 → MISS (−54.7%)',
  },
  distance: {
    title: '📏 Distance to target',
    sub:   'Gap between current price and best target',
    body:  'The percentage difference between the current price and the best target price (the horizon with the highest potential upside).\n\n🟢 Positive % = price already above the target\n🔴 Negative % = still needs to gain that % to reach the target',
    example: 'TER: current 358.25 · target 790.98 → −54.71%\n(TER needs +120.8% to hit the 12M target)',
  },
  result: {
    title: '📊 Result',
    sub:   'Detailed outcome at the best horizon',
    body:  'Shows the specific result at the best target horizon — whether the price reached the target, how far it was, and the date it was evaluated. Updates automatically as horizons expire and real historical prices are loaded.',
    example: 'TER 12M (18 Mar 2027): awaiting · current +19.6% vs base',
  },
}

// ── Column help modal ─────────────────────────────────────────────────────────

/**
 * ColHelpModal — floating modal explaining a table column.
 * Triggered by clicking the ? indicator on a column header.
 * Closes on backdrop click or Escape key.
 */
function ColHelpModal({ colKey, onClose }) {
  if (!colKey) return null
  const info = COL_HELP[colKey]
  if (!info) return null

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[2000] flex items-center justify-center p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-[480px] w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4.5 py-3.5 border-b border-border">
          <div>
            <div className="text-sm font-bold">{info.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{info.sub}</div>
          </div>
          <button
            className="text-lg text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer rounded px-1.5 py-0.5"
            onClick={onClose}
          >✕</button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-1">
          {info.body.split('\n').map((line, i) => (
            line
              ? <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
              : <div key={i} className="h-1" />
          ))}
          {info.example && (
            <div className="bg-muted border border-border rounded-md px-3 py-2.5 mt-2">
              {info.example.split('\n').map((line, i) => (
                <div key={i} className="text-xs text-muted-foreground leading-relaxed font-mono">{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Table header cell ─────────────────────────────────────────────────────────

/**
 * Th — table header cell with optional date sub-label and ? help button.
 */
function Th({ w, date, colKey, onOpen, children }) {
  return (
    <th
      className="text-left text-[11px] font-medium text-muted-foreground px-3.5 py-2.5 whitespace-nowrap"
      style={{ width: w }}
    >
      <div className="flex items-center gap-1">
        {children}
        {colKey && onOpen && (
          <span
            className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-border text-muted-foreground text-[8px] font-bold cursor-pointer shrink-0 leading-none opacity-50 hover:opacity-100"
            onClick={() => onOpen(colKey)}
          >?</span>
        )}
      </div>
      {date && (
        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{formatDate(date)}</div>
      )}
    </th>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StockTable({
  stocks, horizon, autoPrices, histPrices, overrides, horizonExpired,
  fundamentals, groupBySector, filterSector, filterIndustry, sortBySector,
  onOverrideChange, notes, onNoteChange, marketData, batchCurrency,
  hitMargin = 5, batchId, closeRatio = 2.4,
}) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])

  const [collapsed,   setCollapsed]   = useState({})
  const [helpCol,     setHelpCol]     = useState(null)
  const [allExpanded, setAllExpanded] = useState(false)
  const [collapseAll, setCollapseAll] = useState(0)

  /** Toggle all rows expanded/collapsed */
  const handleToggleAll = () => {
    setAllExpanded(v => !v)
    setCollapseAll(v => v + 1)
  }

  /** Toggle a sector group open/closed */
  const toggleGroup = (sector) => setCollapsed(prev => ({ ...prev, [sector]: !prev[sector] }))

  /** Filter stocks by selected sector and industry */
  const filtered = useMemo(() => stocks.filter(s => {
    const f = fundamentals[s.t]
    if (filterSector   !== 'all' && f?.sector   !== filterSector)   return false
    if (filterIndustry !== 'all' && f?.industry !== filterIndustry) return false
    return true
  }), [stocks, filterSector, filterIndustry, fundamentals])

  /** Sort alphabetically by sector if sortBySector is active */
  const sorted = useMemo(() => {
    if (!sortBySector) return filtered
    return [...filtered].sort((a, b) => {
      const sa = fundamentals[a.t]?.sector || 'zzz'
      const sb = fundamentals[b.t]?.sector || 'zzz'
      return sa.localeCompare(sb)
    })
  }, [filtered, sortBySector, fundamentals])

  /** Group stocks by sector for the grouped view */
  const groups = useMemo(() => {
    if (!groupBySector) return null
    const map = {}
    for (const s of sorted) {
      const sector = fundamentals[s.t]?.sector || 'Unknown'
      if (!map[sector]) map[sector] = []
      map[sector].push(s)
    }
    return map
  }, [sorted, groupBySector, fundamentals])

  /** Render a single StockRow with all required props */
  const renderRow = (stock) => (
    <StockRow
      key={stock.t}
      stock={stock}
      horizon={horizon}
      autoPrice={autoPrices[stock.t]}
      histPrices={histPrices}
      override={overrides[stock.t]}
      horizonExpired={horizonExpired}
      fundamental={fundamentals[stock.t]}
      onOverrideChange={onOverrideChange}
      note={notes?.[stock.t] || ''}
      onNoteChange={onNoteChange}
      marketData={marketData}
      batchCurrency={batchCurrency}
      collapseAll={collapseAll}
      allExpanded={allExpanded}
      hitMargin={hitMargin}
      batchId={batchId}
      totalCols={colSpan}
      closeRatio={closeRatio}
    />
  )

  // TOTAL_COLS — total number of columns in the stock table.
  // Update this single value whenever a column is added or removed.
  // Used for colSpan in empty states and expanded row panels.
  const colSpan = 17  // ticker, company, base, current, 1M, 3M, 6M, 12M, override, hit%, note, score, vs SPY, vs Sector, TV

  return (
    <>
      <ColHelpModal colKey={helpCol} onClose={() => setHelpCol(null)} />

      {/* ── Table title + legend + expand all ────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold m-0">Batch Predictions</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-0">
            {tg
              ? `Base date: ${formatDate(stocks[0]?.base)} · Click row to expand details`
              : 'Import a CSV to see predictions'
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Verdict legend */}
          <div className="flex gap-3 text-[11px] text-muted-foreground items-center">
            {[
              { color: 'bg-success',     label: 'Hit' },
              { color: 'bg-warning',     label: 'Close/Awaiting' },
              { color: 'bg-destructive', label: 'Miss' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', color)} />
                {label}
              </span>
            ))}
          </div>

          {/* Expand / collapse all */}
          <Button variant="outline" size="sm" onClick={handleToggleAll} className="text-[11px]">
            {allExpanded ? '↑ Collapse all' : '↓ Expand all'}
          </Button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="border border-border rounded-lg overflow-x-auto mb-6 shadow-sm bg-card">
        <table className="w-full border-collapse text-[13px] table-fixed" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-muted border-b border-border">
              <Th w={72}  colKey="ticker"  onOpen={setHelpCol}>Ticker</Th>
              <Th w={120} colKey="ticker"  onOpen={setHelpCol}>Company</Th>
              <Th w={88}  colKey="price"   onOpen={setHelpCol}>Base price</Th>
              <Th w={90}  colKey="price"   onOpen={setHelpCol}>Price</Th>
              <Th w={95}  colKey="horizon" onOpen={setHelpCol} date={tg?.d1}>1M</Th>
              <Th w={95}  colKey="horizon" onOpen={setHelpCol} date={tg?.d3}>3M</Th>
              <Th w={95}  colKey="horizon" onOpen={setHelpCol} date={tg?.d6}>6M</Th>
              <Th w={95}  colKey="horizon" onOpen={setHelpCol} date={tg?.d12}>12M</Th>
              <Th w={80}  colKey="hit"     onOpen={setHelpCol}>vs SPY</Th>
              <Th w={80}  colKey="hit"     onOpen={setHelpCol}>vs Sector</Th>
              <Th w={40}  colKey="tv"      onOpen={setHelpCol}></Th>
            </tr>
          </thead>
          <tbody>
            {/* Empty state */}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="py-8 text-center text-muted-foreground text-[13px]">
                  No stocks — import a CSV to start
                </td>
              </tr>
            )}

            {/* Grouped by sector */}
            {groups && Object.entries(groups).map(([sector, sectorStocks]) => (
              <>
                <tr
                  key={`group-${sector}`}
                  className="bg-muted border-b border-border"
                >
                  <td
                    colSpan={colSpan}
                    className="py-1.5 px-3.5 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleGroup(sector)}
                  >
                    {collapsed[sector] ? '▶' : '▼'} {sector}
                    <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                      {sectorStocks.length} stock{sectorStocks.length > 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
                {!collapsed[sector] && sectorStocks.map(renderRow)}
              </>
            ))}

            {/* Flat list */}
            {!groups && sorted.map(renderRow)}
          </tbody>
        </table>
      </div>
    </>
  )
}

import { useMemo, useState } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'

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
    body:  'The actual market price of the stock on the day the Openbank forecast was published. This is the reference point — all target prices are set relative to this value by Openbank\'s analysts.',
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
    sub:   'Openbank\'s predicted prices at each time horizon',
    body:  'Each column shows Openbank\'s forecast price for that stock at 1, 3, 6 and 12 months from the base date. The date below the label is the exact expiry date.\n\n🔴 expired = the target date has passed. The price shown is the real historical closing price on that exact day — this gives a definitive HIT/MISS.\n\n🔵 Blue = best target — the horizon with the highest upside potential for this stock.',
    example: 'TER 1M → 17 Apr 2026 → target 353.92 → expired\nTER 12M → 18 Mar 2027 → target 790.98 → best target (+299d)',
  },
  hit: {
    title: '✅ Hit? — Prediction result',
    sub:   'Did the stock reach Openbank\'s target?',
    body:  'Shows whether the stock reached the predicted target at the best horizon expiry date.\n\n✅ HIT — price reached or exceeded the target (±5% tolerance)\n🟡 CLOSE — price came within 5% of the target\n❌ MISS — price did not reach the target\n⏳ -- — horizon not yet expired, result pending',
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

// ── Help button ───────────────────────────────────────────────────────────────
function HelpBtn({ colKey, onOpen }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onOpen(colKey) }}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:13, height:13, borderRadius:'50%', background:'var(--border)', color:'var(--text-3)', fontSize:8, fontWeight:700, cursor:'pointer', marginLeft:4, verticalAlign:'middle', border:'none', fontFamily:'inherit', flexShrink:0, lineHeight:1 }}
      title="Column help"
    >?</button>
  )
}

// ── Th with optional help button ─────────────────────────────────────────────
function Th({ w, date, colKey, onOpen, children }) {
  return (
    <th style={{ background:'var(--th-bg)', fontWeight:700, fontSize:11, color:'var(--th-text)', padding:'8px 10px', textAlign:'left', borderBottom:'1.5px solid var(--border)', verticalAlign:'bottom', whiteSpace:'nowrap', width:w }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:2 }}>
        {children}
        {colKey && <HelpBtn colKey={colKey} onOpen={onOpen} />}
      </span>
      {date && <span style={{ display:'block', fontSize:9, fontWeight:400, color:'var(--text-3)', marginTop:2 }}>{formatDate(date)}</span>}
    </th>
  )
}

// ── Column help modal ─────────────────────────────────────────────────────────
function ColHelpModal({ colKey, onClose }) {
  if (!colKey) return null
  const info = COL_HELP[colKey]
  if (!info) return null

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', maxWidth:480, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)' }}>{info.title}</div>
            <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', marginTop:2 }}>{info.sub}</div>
          </div>
          <button style={{ fontSize:16, border:'none', background:'transparent', cursor:'pointer', color:'var(--text-3)', padding:'2px 6px', borderRadius:'var(--radius)', fontFamily:'inherit' }} onClick={onClose}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:'16px 18px' }}>
          {info.body.split('\n').map((line, i) => (
            line ? <p key={i} style={{ fontSize:'var(--fs-sm)', color:'var(--text-2)', lineHeight:1.7, marginBottom:8 }}>{line}</p>
                 : <div key={i} style={{ height:4 }} />
          ))}
          {info.example && (
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px', marginTop:8 }}>
              {info.example.split('\n').map((line, i) => (
                <div key={i} style={{ fontSize:'var(--fs-xs)', color:'var(--text-2)', lineHeight:1.8, fontFamily:'monospace' }}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main StockTable ───────────────────────────────────────────────────────────
export default function StockTable({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals, groupBySector, filterSector, filterIndustry, sortBySector, onOverrideChange, notes, onNoteChange, marketData, batchCurrency }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])
  const [collapsed,    setCollapsed]    = useState({})
  const [helpCol,      setHelpCol]      = useState(null)
  const [allExpanded,  setAllExpanded]  = useState(false)
  const [collapseAll,  setCollapseAll]  = useState(0)

  const handleToggleAll = () => {
    setAllExpanded(v => !v)
    setCollapseAll(v => v + 1)
  }

  const toggleGroup = (sector) => setCollapsed(prev => ({ ...prev, [sector]: !prev[sector] }))

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      const f = fundamentals[s.t]
      if (filterSector   !== 'all' && f?.sector   !== filterSector)   return false
      if (filterIndustry !== 'all' && f?.industry !== filterIndustry) return false
      return true
    })
  }, [stocks, filterSector, filterIndustry, fundamentals])

  const sorted = useMemo(() => {
    if (!sortBySector) return filtered
    return [...filtered].sort((a, b) => {
      const sa = fundamentals[a.t]?.sector || 'zzz'
      const sb = fundamentals[b.t]?.sector || 'zzz'
      return sa.localeCompare(sb)
    })
  }, [filtered, sortBySector, fundamentals])

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
    />
  )

  const colSpan = 16
  const o = (key) => () => setHelpCol(key)

  return (
    <>
      <ColHelpModal colKey={helpCol} onClose={() => setHelpCol(null)} />
      {/* Collapse all button */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
        <button
          onClick={handleToggleAll}
          style={{ fontSize:'var(--fs-xxs)', padding:'4px 10px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-3)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}
        >
          {allExpanded ? '↑ Collapse all' : '↓ Expand all'}
        </button>
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflowX:'auto', marginBottom:'1.5rem' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, tableLayout:'fixed', minWidth:1280 }}>
          <thead>
            <tr>
              <Th w={68}  colKey="ticker"    onOpen={setHelpCol}>Ticker</Th>
              <Th w={120} colKey="ticker"    onOpen={setHelpCol}>Company</Th>
              <Th w={88}  colKey="sector"    onOpen={setHelpCol}>Sector</Th>
              <Th w={100} colKey="sector"    onOpen={setHelpCol}>Industry</Th>
              <Th w={40}>Cur.</Th>
              <Th w={76}  colKey="baseDate"  onOpen={setHelpCol}>Base date</Th>
              <Th w={76}  colKey="basePrice" onOpen={setHelpCol}>Base price</Th>
              <Th w={100} colKey="price"     onOpen={setHelpCol}>Price</Th>
              <Th w={82}  colKey="override"  onOpen={setHelpCol}>Override</Th>
              <Th w={68}  colKey="horizon"   onOpen={setHelpCol} date={tg?.d1}>1M</Th>
              <Th w={68}  colKey="horizon"   onOpen={setHelpCol} date={tg?.d3}>3M</Th>
              <Th w={68}  colKey="horizon"   onOpen={setHelpCol} date={tg?.d6}>6M</Th>
              <Th w={68}  colKey="horizon"   onOpen={setHelpCol} date={tg?.d12}>12M</Th>
              <Th w={66}  colKey="hit"       onOpen={setHelpCol}>Hit?</Th>
              <Th w={106} colKey="distance"  onOpen={setHelpCol}>Distance</Th>
              <Th w={110} colKey="result"    onOpen={setHelpCol}>Result</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={colSpan} style={{ padding:'24px 10px', textAlign:'center', color:'var(--text-3)', fontSize:12 }}>No stocks to display</td></tr>
            )}
            {groups && Object.entries(groups).map(([sector, sectorStocks]) => (
              <>
                <tr key={`group-${sector}`} style={{ background:'var(--pill-bg)', borderBottom:'1px solid var(--border-blue)' }}>
                  <td colSpan={colSpan} style={{ padding:'6px 10px', fontSize:11, fontWeight:600, color:'var(--accent)', cursor:'pointer', userSelect:'none' }} onClick={() => toggleGroup(sector)}>
                    {collapsed[sector] ? '▶' : '▼'} {sector}
                    <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:8, fontWeight:400 }}>{sectorStocks.length} stock{sectorStocks.length > 1 ? 's' : ''}</span>
                  </td>
                </tr>
                {!collapsed[sector] && sectorStocks.map(renderRow)}
              </>
            ))}
            {!groups && sorted.map(renderRow)}
          </tbody>
        </table>
      </div>
    </>
  )
}

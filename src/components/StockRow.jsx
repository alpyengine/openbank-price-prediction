import { memo, useState, useCallback, useEffect } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getEffectivePrice, distancePct, evaluatePrediction, histKey } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'
import { SECTOR_ETF, INDUSTRY_ETF } from '../hooks/useMarketData.js'

const StockRow = memo(function StockRow({ stock, horizon, autoPrice, histPrices, override, horizonExpired, fundamental, onOverrideChange, note, onNoteChange, marketData, collapseAll, allExpanded, batchCurrency }) {
  const [expanded,     setExpanded]     = useState(false)
  const [showDesc,     setShowDesc]     = useState(false)
  const [showNote,     setShowNote]     = useState(false)
  const [noteVal,      setNoteVal]      = useState(note || '')

  // Toggle expand/collapse when parent requests it
  useEffect(() => {
    if (collapseAll > 0) setExpanded(allExpanded)
  }, [collapseAll])

  const best      = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt       = getTarget(stock, horizon)
  const tg        = stock.base ? targetDates(stock.base) : null
  const bestLabel = best===stock.t12?'12M':best===stock.t6?'6M':best===stock.t3?'3M':'1M'

  const { price: p, isHistorical, historicalDate } = getEffectivePrice(
    stock.t, horizon, { [stock.t]: autoPrice }, histPrices,
    override ? { [stock.t]: override } : {}, horizonExpired
  )

  const dist               = distancePct(p, tgt)
  const { verdict, direction } = evaluatePrediction(p, tgt, stock.b)
  const hKey       = histKey(stock.t, horizon)
  const histEntry  = histPrices?.[hKey]
  const histLoading = horizonExpired && horizon !== 'best' && histEntry === undefined

  const horizonDates = tg
    ? [{ val:stock.t1,date:tg.d1 },{ val:stock.t3,date:tg.d3 },{ val:stock.t6,date:tg.d6 },{ val:stock.t12,date:tg.d12 }]
    : [{ val:stock.t1 },{ val:stock.t3 },{ val:stock.t6 },{ val:stock.t12 }]

  const [val, setVal] = useState(override ? String(override) : '')
  useEffect(() => { if (override==null) setVal(''); else setVal(String(override)) }, [override])

  const handleCommit  = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onOverrideChange(stock.t, isNaN(v)||v<=0 ? null : v)
    if (isNaN(v)||v<=0) setVal('')
  }, [stock.t, onOverrideChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key==='Enter')  e.target.blur()
    if (e.key==='Escape') { setVal(''); onOverrideChange(stock.t, null); e.target.blur() }
  }, [stock.t, onOverrideChange])

  // Sync note from outside (e.g. batch loaded from history)
  useEffect(() => { setNoteVal(note || '') }, [note])
  useEffect(() => {
    if (!showDesc) return
    const handler = (e) => { if (e.key === 'Escape') setShowDesc(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showDesc])

  const sectorText   = fundamental===undefined?'...':fundamental===null?'--':fundamental.sector  ||'--'
  const industryText = fundamental===undefined?'...':fundamental===null?'--':fundamental.industry ||'--'
  const fundColor    = (fundamental===undefined||fundamental===null) ? 'var(--tw-muted-fg)' : 'var(--tw-muted-fg)'

  const td = { padding:'12px 14px', verticalAlign:'middle', borderBottom:'1px solid var(--tw-border)' }

  return (
    <>
      {/* Description modal */}
      {showDesc && fundamental?.description && (
        <tr style={{ display:'contents' }}>
          <td style={{ padding:0 }}>
            <div
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(2px)' }}
              onClick={() => setShowDesc(false)}
            >
              <div
                style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:'var(--radius-lg)', maxWidth:540, width:'100%', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--tw-border)' }}>
                  <div>
                    <div style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--tw-fg)' }}>{stock.t} — {stock.co}</div>
                    <div style={{ fontSize:'var(--fs-xs)', color:'var(--tw-muted-fg)', marginTop:2 }}>{fundamental.industry} · {fundamental.sector}</div>
                  </div>
                  <button style={{ fontSize:18, border:'none', background:'transparent', cursor:'pointer', color:'var(--tw-muted-fg)', padding:'2px 6px', borderRadius:'var(--radius)', fontFamily:'inherit' }} onClick={() => setShowDesc(false)}>✕</button>
                </div>
                <div style={{ padding:18, fontSize:'var(--fs-sm)', color:'var(--tw-muted-fg)', lineHeight:1.7 }}>
                  {fundamental.description}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      <tr style={{ borderBottom: expanded ? 'none' : '1px solid var(--tw-border)', cursor:'pointer', transition:'background .1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--tw-muted)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => setExpanded(v=>!v)}>

        {/* Ticker */}
        <td style={{ ...td, fontWeight:600, fontSize:14, color:'var(--tw-fg)', whiteSpace:'nowrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, color:'var(--tw-muted-fg)' }}>{expanded ? '▾' : '›'}</span>
            {stock.t.split('.')[0]}
          </div>
          <div style={{ fontSize:10, color:'var(--tw-muted-fg)', fontWeight:400, marginTop:1 }}>{stock.t.includes('.') ? stock.t.split('.').pop() : 'US'}</div>
        </td>

        {/* Company */}
        <td style={{ ...td, fontSize:13, color:'var(--tw-muted-fg)' }}>{stock.co}</td>

        {/* Base Price */}
        <td style={{ ...td, fontSize:13, color:'var(--tw-muted-fg)', fontFamily:'monospace' }}>
          {stock.b ? `${batchCurrency ?? '$'}${stock.b.toFixed(2)}` : '--'}
        </td>

        {/* Price */}
        <td style={td}>
          {histLoading && <span style={{ color:'var(--tw-muted-fg)', fontSize:11 }}>…</span>}
          {!histLoading && isHistorical && histEntry && (
            <div>
              <span style={{ color:'var(--blue)', fontWeight:600, fontSize:12 }}>{batchCurrency ?? ''}{histEntry.price.toFixed(2)}</span>
              <span style={{ display:'block', fontSize:9, color:'var(--tw-muted-fg)', marginTop:1 }}>exp.</span>
            </div>
          )}
          {!histLoading && isHistorical && !histEntry && <span style={{ color:'#dc2626', fontSize:11 }}>n/a</span>}
          {!isHistorical && (
            <div>
              {autoPrice==null
                ? <span style={{ color:'var(--tw-muted-fg)', fontSize:11 }}>--</span>
                : <span style={{ color:'#16a34a', fontWeight:600, fontSize:12 }}>{batchCurrency ?? ''}{autoPrice.toFixed(2)}</span>
              }
            </div>
          )}
        </td>

        {/* Horizon bar columns — 1M / 3M / 6M / 12M */}
        {horizonDates.map(({ val:t, date }, i) => {
          const KEYS = ['1M','3M','6M','12M']
          const hKey = KEYS[i]
          const ds   = date ? dateStatus(date) : null
          const expired = ds === 'past'
          const currentP = p ?? autoPrice

          // Calculate distance % from current price to target
          let distPct = null
          if (currentP && t) distPct = ((currentP - t) / t) * 100

          // Determine zone
          let zone = 'awaiting'
          if (expired) {
            zone = distPct != null && distPct >= -5 ? 'hit' : 'miss'
          } else if (distPct != null) {
            if (distPct >= 0)       zone = 'exceeded'
            else if (distPct >= -5) zone = 'near'
            else if (distPct >= -15) zone = 'close'
            else if (distPct >= -30) zone = 'far'
            else                    zone = 'vfar'
          }

          // Bar fill width (0-100%) — 100 = at or above target, 0 = very far
          const fillWidth = distPct == null ? 0
            : distPct >= 0   ? 100
            : distPct >= -5  ? 88 + (distPct / -5) * (-12)    // 76-88
            : distPct >= -15 ? 50 + ((distPct + 5) / -10) * (-26) // 24-50
            : distPct >= -30 ? 10 + ((distPct + 15) / -15) * (-14) // 0-24 approx
            : Math.max(0, 10 + distPct * 0.2)

          const ZONE_STYLES = {
            exceeded: { color:'#15803d', fill:'#16a34a' },
            near:     { color:'#1d4ed8', fill:'#3b82f6' },
            close:    { color:'#a16207', fill:'#eab308' },
            far:      { color:'#c2410c', fill:'#f97316' },
            vfar:     { color:'#b91c1c', fill:'#ef4444' },
            hit:      { color:'#15803d', fill:'#16a34a' },
            miss:     { color:'#6b7280', fill:'#d1d5db' },
            awaiting: { color:'var(--tw-muted-fg)', fill:'var(--tw-border)' },
          }
          const zs = ZONE_STYLES[zone]

          // Label text
          const label = expired
            ? (zone === 'hit'
                ? `HIT ${distPct!=null?(distPct>=0?'+':'')+(distPct.toFixed(1))+'%':''}`
                : `MISS ${distPct!=null?distPct.toFixed(1)+'%':''}`)
            : distPct != null
              ? `${distPct >= 0 ? '+' : ''}${distPct.toFixed(1)}%${distPct >= 0 ? ' ↑' : ''}`
              : '--'

          return (
            <td key={i} style={{ ...td, minWidth:80 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <span style={{ fontSize:9, fontWeight:600, color:'var(--tw-muted-fg)' }}>{hKey}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:zs.color, whiteSpace:'nowrap' }}>{label}</span>
                </div>
                <div style={{ width:'100%', height:6, borderRadius:3, background:'var(--tw-muted)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background:zs.fill, width:`${Math.max(0,Math.min(100,fillWidth))}%`, transition:'width .3s' }} />
                </div>
              </div>
            </td>
          )
        })}

        {/* vs SPY */}
        <td style={td}>
          {(() => {
            const spyPct  = marketData?.spy?.changePct ?? null
            const stockChg = (stock.b && (p ?? autoPrice)) ? (((p ?? autoPrice) - stock.b) / stock.b * 100) : null
            if (spyPct == null || stockChg == null) return <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>--</span>
            const diff = stockChg - spyPct
            const beat = diff >= 0
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <span style={{ fontSize:11, fontWeight:600, color: beat ? '#15803d' : '#b91c1c', whiteSpace:'nowrap' }}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span style={{ fontSize:9, color:'var(--tw-muted-fg)' }}>SPY</span>
              </div>
            )
          })()}
        </td>

        {/* vs Sector ETF */}
        <td style={td}>
          {(() => {
            const sector    = fundamental?.sector
            const etfSym    = sector ? SECTOR_ETF[sector] : null
            const etfData   = etfSym ? marketData?.etfs?.[etfSym] : null
            const etfPct    = etfData?.changePct ?? null
            const stockChg  = (stock.b && (p ?? autoPrice)) ? (((p ?? autoPrice) - stock.b) / stock.b * 100) : null
            if (!etfSym || etfPct == null || stockChg == null) {
              return <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>{etfSym ?? '--'}</span>
            }
            const diff = stockChg - etfPct
            const beat = diff >= 0
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <span style={{ fontSize:11, fontWeight:600, color: beat ? '#15803d' : '#b91c1c', whiteSpace:'nowrap' }}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span style={{ fontSize:9, color:'var(--tw-muted-fg)' }}>{etfSym}</span>
              </div>
            )
          })()}
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom:'1px solid var(--tw-border)' }}>
          <td colSpan={16} style={{ padding:'16px 20px 20px 20px', background:'var(--tw-muted)' }}>

            {/* ── Horizon cards ── */}
            <HorizonCards stock={stock} tg={tg} autoPrice={autoPrice} batchCurrency={batchCurrency} />

            {/* ── Market Performance ── */}
            {marketData && <MarketComparison stock={stock} fundamental={fundamental} marketData={marketData} autoPrice={autoPrice} />}

            {/* ── Fundamentals ── */}
            <FundamentalsPanel fundamental={fundamental} ticker={stock.t} onShowDesc={() => setShowDesc(true)} />

            {/* ── Add Note ── */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
              {showNote ? (
                <div style={{ width:'100%' }}>
                  <textarea
                    value={noteVal}
                    onChange={e => setNoteVal(e.target.value)}
                    onBlur={() => { onNoteChange && onNoteChange(stock.t, noteVal); setShowNote(false) }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    placeholder={`Add notes for ${stock.t.split('.')[0]}…`}
                    style={{ width:'100%', maxWidth:600, height:72, fontSize:13, fontFamily:'inherit', padding:'8px 12px', border:'1px solid var(--tw-border)', borderRadius:8, background:'var(--tw-card)', color:'var(--tw-fg)', resize:'vertical', outline:'none', lineHeight:1.5 }}
                  />
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setShowNote(true) }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-muted-fg)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}
                >
                  📋 {noteVal ? 'Edit note' : 'Add Note'}
                </button>
              )}
            </div>

          </td>
        </tr>
      )}
    </>
  )
})

export default StockRow

// ── Horizon Cards (v0 style) ──────────────────────────────────────────────────
function HorizonCards({ stock, tg, autoPrice, batchCurrency }) {
  if (!tg) return null
  const cu = batchCurrency ?? '$'
  const horizons = [
    { key:'1M', target:stock.t1, date:tg.d1 },
    { key:'3M', target:stock.t3, date:tg.d3 },
    { key:'6M', target:stock.t6, date:tg.d6 },
    { key:'12M', target:stock.t12, date:tg.d12 },
  ]

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, fontSize:12, fontWeight:600, color:'var(--tw-muted-fg)' }}>
        <span>◎</span> Horizon Results
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {horizons.map(({ key, target, date }) => {
          const dl = date ? daysLeft(date) : null
          const ds = date ? dateStatus(date) : null
          const expired = ds === 'past'
          const distPct = autoPrice && target ? ((autoPrice - target) / target) * 100 : null

          let verdict = 'AWAITING'
          let verdictColor = '#6b7280'
          let verdictBg = '#f3f4f6'
          let borderColor = 'var(--tw-border)'

          if (expired) {
            verdict = distPct != null && distPct >= -5 ? 'HIT' : 'MISS'
            if (verdict === 'HIT') { verdictColor = '#15803d'; verdictBg = '#dcfce7'; borderColor = '#86efac' }
            else { verdictColor = '#b91c1c'; verdictBg = '#fee2e2'; borderColor = '#fca5a5' }
          } else if (distPct != null) {
            if (distPct >= 0) { verdict = 'EXCEEDED'; verdictColor = '#15803d'; verdictBg = '#dcfce7'; borderColor = '#86efac' }
            else if (distPct >= -5) { verdict = 'NEAR'; verdictColor = '#1d4ed8'; verdictBg = '#dbeafe'; borderColor = '#93c5fd' }
            else if (distPct >= -15) { verdict = 'CLOSE'; verdictColor = '#a16207'; verdictBg = '#fef9c3'; borderColor = '#fcd34d' }
          }

          const isActive = verdict === 'HIT' || verdict === 'EXCEEDED' || verdict === 'NEAR'

          return (
            <div key={key} style={{ background:'var(--tw-card)', border:`1px solid ${isActive ? borderColor : 'var(--tw-border)'}`, borderRadius:10, padding:'14px 16px', boxShadow: isActive ? `0 0 0 1px ${borderColor}20` : 'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontWeight:500 }}>{key}</span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:verdictBg, color:verdictColor }}>
                  {verdict === 'EXCEEDED' ? '⊙ HIT' : verdict === 'HIT' ? '⊙ HIT' : verdict === 'NEAR' ? '◷ CLOSE' : verdict === 'CLOSE' ? '◷ CLOSE' : verdict === 'MISS' ? '⊗ MISS' : '◷ AWAITING'}
                </span>
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--tw-fg)', marginBottom:4 }}>
                {target ? `${cu}${target.toFixed(2)}` : '--'}
              </div>
              <div style={{ fontSize:11, color:'var(--tw-muted-fg)', marginBottom:6 }}>
                {date ? formatDate(date) : '--'}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color: distPct == null ? 'var(--tw-muted-fg)' : distPct >= 0 ? '#15803d' : '#dc2626' }}>
                {distPct == null ? (autoPrice ? '--' : 'Fetch price') : `${distPct >= 0 ? '+' : ''}${distPct.toFixed(1)}% from current`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MarketComparison({ stock, fundamental, marketData, autoPrice }) {
  if (!marketData?.spy) return null

  const sector      = fundamental?.sector
  const industry    = fundamental?.industry
  const exchange    = fundamental?.exchange
  const etfSymbol   = sector   ? SECTOR_ETF[sector]       : null
  const indEtfSym   = industry ? INDUSTRY_ETF?.[industry] : null
  const etfData     = etfSymbol ? marketData.etfs?.[etfSymbol]          : null
  const indEtfData  = indEtfSym ? marketData.industryEtfs?.[indEtfSym]  : null
  const rspData     = marketData.etfs?.['RSP'] ?? null
  const qqqData     = marketData.etfs?.['QQQ'] ?? null

  const stockPct  = (stock.b && autoPrice && autoPrice > 0)
    ? ((autoPrice - stock.b) / stock.b) * 100 : null
  const spyPct    = marketData.spy.changePct
  const rspPct    = rspData?.changePct    ?? null
  const qqqPct    = qqqData?.changePct    ?? null
  const etfPct    = etfData?.changePct    ?? null
  const indEtfPct = indEtfData?.changePct ?? null

  const benchLabel = marketData.benchmark?.label ?? 'S&P 500 (SPY)'
  const ticker     = stock.t.split('.')[0]
  const baseDate   = stock.base ? formatDate(stock.base) : '?'
  const isNASDAQ   = exchange?.toUpperCase().includes('NASDAQ')

  const fmt = (v) => v == null ? '--' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  const shortLabel = (label, max = 22) =>
    label && label.length > max ? label.slice(0, max - 1) + '…' : label

  const rows = [
    { key:'indEtf', label: indEtfSym ? shortLabel(`${industry} (${indEtfSym})`) : null, pct: indEtfPct, isStock:false },
    { key:'etf',    label: etfSymbol  ? `${sector} (${etfSymbol})`               : null, pct: etfPct,    isStock:false },
    { key:'stock',  label: ticker,                                                         pct: stockPct,  isStock:true  },
    { key:'spy',    label: benchLabel,                                                     pct: spyPct,    isStock:false },
    { key:'rsp',    label: rspPct != null ? 'S&P 500 EW (RSP)'                   : null, pct: rspPct,    isStock:false },
    { key:'qqq',    label: isNASDAQ && qqqPct != null ? 'NASDAQ 100 (QQQ)'       : null, pct: qqqPct,    isStock:false },
  ].filter(r => r.label && r.pct != null)
   .sort((a, b) => b.pct - a.pct)

  const maxPct  = Math.max(...rows.map(r => Math.abs(r.pct ?? 0)), 1)
  const hasNeg  = rows.some(r => r.pct < 0)
  const BAR_H   = 10
  const NAME_W  = 140
  const PCT_W   = 58

  const absMax = Math.max(...rows.map(r => Math.abs(r.pct ?? 0)), 1)

  const spyDiff = stockPct != null && spyPct    != null ? stockPct - spyPct    : null
  const rspDiff = stockPct != null && rspPct    != null ? stockPct - rspPct    : null
  const qqqDiff = stockPct != null && qqqPct    != null ? stockPct - qqqPct    : null
  const etfDiff = stockPct != null && etfPct    != null ? stockPct - etfPct    : null
  const indDiff = stockPct != null && indEtfPct != null ? stockPct - indEtfPct : null

  const renderRow = (row) => {
    const isPos    = row.pct >= 0
    const pctColor = isPos ? '#16a34a' : '#dc2626'
    const barColor = row.isStock
      ? (isPos ? '#16a34a' : '#dc2626')
      : (isPos ? '#86efac' : '#fca5a5')
    const barPct  = Math.abs(row.pct) / absMax * 50
    const barLeft = isPos ? '50%' : `${50 - barPct}%`

    return (
      <div key={row.key} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
        <div style={{ width:130, flexShrink:0, fontSize:12, fontWeight: row.isStock ? 700 : 500, color: row.isStock ? 'var(--tw-fg)' : 'var(--tw-muted-fg)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {row.label}
        </div>
        <div style={{ flex:1, height:8, borderRadius:4, background:'var(--tw-muted)', position:'relative', overflow:'hidden' }}>
          {/* Center axis */}
          <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1.5, background:'var(--tw-border)', zIndex:1 }} />
          {/* Bar */}
          <div style={{ position:'absolute', top:0, height:'100%', borderRadius:2, background:barColor, left:barLeft, width:`${barPct}%`, transition:'all .4s ease' }} />
        </div>
        <div style={{ width:52, flexShrink:0, fontSize:12, fontWeight:700, color:pctColor, textAlign:'right', whiteSpace:'nowrap' }}>
          {fmt(row.pct)}
        </div>
      </div>
    )
  }

  const badge = (diff, label) => diff == null ? null : (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: diff >= 0 ? '#dcfce7' : '#fee2e2', color: diff >= 0 ? '#16a34a' : '#dc2626' }}>
      {diff >= 0 ? '▲' : '▼'} {diff >= 0 ? 'Beat' : 'Lagged'} {label} by {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
    </span>
  )

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, fontSize:12, fontWeight:600, color:'var(--tw-muted-fg)' }}>
        <span>↑↓</span> Market Performance
        <span style={{ fontSize:11, fontWeight:400, color:'var(--tw-muted-fg)', marginLeft:4 }}>since {baseDate}</span>
      </div>
      <div style={{ maxWidth:480, display:'flex', flexDirection:'column', gap:4 }}>
        {rows.map(renderRow)}
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
        {badge(spyDiff, 'SPY')}
        {badge(rspDiff, 'RSP')}
        {isNASDAQ && badge(qqqDiff, 'QQQ')}
        {badge(etfDiff, etfSymbol)}
        {badge(indDiff, indEtfSym)}
        {!sector && <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontStyle:'italic' }}>Fetch fundamentals to see sector ETF comparison</span>}
        {sector && !etfSymbol && <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontStyle:'italic' }}>No sector ETF mapped for "{sector}"</span>}
      </div>
    </div>
  )
}

function FundamentalsPanel({ fundamental, ticker, onShowDesc }) {
  const lbl = { fontSize:10, fontWeight:600, color:'var(--tw-muted-fg)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }
  const val = { fontSize:13, fontWeight:600, color:'var(--tw-fg)' }

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, fontSize:12, fontWeight:600, color:'var(--tw-muted-fg)' }}>
        <span>▦</span> Fundamentals
      </div>

      {fundamental === undefined && (
        <div style={{ fontSize:12, color:'var(--tw-muted-fg)', fontStyle:'italic' }}>
          Click "Fetch fundamentals" to load data for {ticker}
        </div>
      )}
      {fundamental === null && (
        <div style={{ fontSize:12, color:'#dc2626' }}>Fundamentals unavailable for {ticker}</div>
      )}
      {fundamental && (
        <div style={{ display:'flex', gap:28, flexWrap:'wrap', alignItems:'flex-start' }}>
          <div><div style={lbl}>Sector</div><div style={val}>{fundamental.sector || '--'}</div></div>
          <div><div style={lbl}>Industry</div><div style={val}>{fundamental.industry || '--'}</div></div>
          <div><div style={lbl}>Market Cap</div><div style={val}>{fmtMarketCap(fundamental.marketCap)}</div></div>
          <div><div style={lbl}>Beta</div><div style={val}>{fundamental.beta ? fundamental.beta.toFixed(2) : '--'}</div></div>
          <div><div style={lbl}>Forward P/E</div><div style={val}>{fundamental.forwardPE ? fundamental.forwardPE.toFixed(2) : '--'}</div></div>
          <div><div style={lbl}>Last Dividend</div><div style={val}>{fundamental.lastDividend ? `$${fundamental.lastDividend}` : '--'}</div></div>
          {fundamental.website && (
            <div>
              <div style={lbl}>Website</div>
              <a href={fundamental.website} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize:13, color:'var(--tw-primary)', fontWeight:500, textDecoration:'none' }}
              >
                {fundamental.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCell({ histLoading, p, verdict, direction, isHistorical }) {
  if (histLoading) return <span style={{ color:'var(--tw-muted-fg)', fontSize:11 }}>loading…</span>
  if (p==null)     return <span style={{ color:'var(--tw-muted-fg)', fontSize:11 }}>awaiting</span>
  const sub = isHistorical ? 'on target date' : 'today'
  if (verdict==='hit')   return <div><span style={{ color:'#16a34a', fontSize:11, fontWeight:600 }}>{direction==='bearish'?'✓ Dropped':'✓ Reached'}</span><span style={{ display:'block', fontSize:9, color:'var(--tw-muted-fg)', marginTop:1 }}>{sub}</span></div>
  if (verdict==='close') return <div><span style={{ color:'var(--amber)', fontSize:11, fontWeight:600 }}>Near target</span><span style={{ display:'block', fontSize:9, color:'var(--tw-muted-fg)', marginTop:1 }}>{sub}</span></div>
  return <div><span style={{ color:'#dc2626', fontSize:11, fontWeight:600 }}>{direction==='bearish'?"✗ Didn't drop":'✗ Not reached'}</span><span style={{ display:'block', fontSize:9, color:'var(--tw-muted-fg)', marginTop:1 }}>{sub}</span></div>
}

function DateTag({ status }) {
  const cfg = { past:{ bg:'#fee2e2', color:'#dc2626', label:'expired' }, now:{ bg:'#dcfce7', color:'#16a34a', label:'now' }, soon:{ bg:'var(--amber-bg)', color:'var(--amber)', label:'soon' } }
  const c = cfg[status]; if (!c) return null
  return <span style={{ display:'inline-block', fontSize:9, padding:'1px 4px', borderRadius:6, marginLeft:4, verticalAlign:'middle', background:c.bg, color:c.color, fontWeight:600 }}>{c.label}</span>
}

function Badge({ type, children }) {
  const cfg = { hit:{ bg:'#dcfce7', color:'#16a34a' }, close:{ bg:'var(--amber-bg)', color:'var(--amber)' }, miss:{ bg:'#fee2e2', color:'#dc2626' }, wait:{ bg:'var(--tw-muted)', color:'var(--tw-muted-fg)' } }
  const c = cfg[type]
  return <span style={{ display:'inline-flex', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, background:c.bg, color:c.color }}>{children}</span>
}

function DistBar({ dist, verdict }) {
  const bw    = Math.min(70, Math.abs(dist)*2.5)
  const barBg = verdict==='hit'?'#dcfce7':verdict==='close'?'var(--amber-bg)':'#fee2e2'
  const color = verdict==='hit'?'#16a34a':verdict==='close'?'var(--amber)':'#dc2626'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <div style={{ width:bw, height:4, borderRadius:3, background:barBg }} />
      <span style={{ fontSize:11, fontWeight:600, color, whiteSpace:'nowrap' }}>{dist>0?'+':''}{dist.toFixed(2)}%</span>
    </div>
  )
}

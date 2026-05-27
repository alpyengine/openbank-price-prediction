import { memo, useState, useCallback, useEffect } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getEffectivePrice, distancePct, evaluatePrediction, histKey } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'
import { SECTOR_ETF, INDUSTRY_ETF } from '../hooks/useMarketData.js'

const StockRow = memo(function StockRow({ stock, horizon, autoPrice, histPrices, override, horizonExpired, fundamental, onOverrideChange, note, onNoteChange, marketData, collapseAll, allExpanded, batchCurrency }) {
  const [expanded,     setExpanded]     = useState(false)
  const [showDesc,     setShowDesc]     = useState(false)
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
  const fundColor    = (fundamental===undefined||fundamental===null) ? 'var(--text-3)' : 'var(--text-2)'

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
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', maxWidth:540, width:'100%', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)' }}>{stock.t} — {stock.co}</div>
                    <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', marginTop:2 }}>{fundamental.industry} · {fundamental.sector}</div>
                  </div>
                  <button style={{ fontSize:18, border:'none', background:'transparent', cursor:'pointer', color:'var(--text-3)', padding:'2px 6px', borderRadius:'var(--radius)', fontFamily:'inherit' }} onClick={() => setShowDesc(false)}>✕</button>
                </div>
                <div style={{ padding:18, fontSize:'var(--fs-sm)', color:'var(--text-2)', lineHeight:1.7 }}>
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

        {/* Price */}
        <td style={td}>
          {histLoading && <span style={{ color:'var(--text-3)', fontSize:11 }}>…</span>}
          {!histLoading && isHistorical && histEntry && (
            <div>
              <span style={{ color:'var(--blue)', fontWeight:600, fontSize:12 }}>{batchCurrency ?? ''}{histEntry.price.toFixed(2)}</span>
              <span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>exp.</span>
            </div>
          )}
          {!histLoading && isHistorical && !histEntry && <span style={{ color:'var(--red)', fontSize:11 }}>n/a</span>}
          {!isHistorical && (
            <div>
              {autoPrice==null
                ? <span style={{ color:'var(--text-3)', fontSize:11 }}>--</span>
                : <span style={{ color:'var(--green)', fontWeight:600, fontSize:12 }}>{batchCurrency ?? ''}{autoPrice.toFixed(2)}</span>
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
            awaiting: { color:'var(--text-3)', fill:'var(--border)' },
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
                  <span style={{ fontSize:9, fontWeight:600, color:'var(--text-3)' }}>{hKey}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:zs.color, whiteSpace:'nowrap' }}>{label}</span>
                </div>
                <div style={{ width:'100%', height:6, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
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
            if (spyPct == null || stockChg == null) return <span style={{ fontSize:11, color:'var(--text-3)' }}>--</span>
            const diff = stockChg - spyPct
            const beat = diff >= 0
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <span style={{ fontSize:11, fontWeight:600, color: beat ? '#15803d' : '#b91c1c', whiteSpace:'nowrap' }}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span style={{ fontSize:9, color:'var(--text-3)' }}>SPY</span>
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
              return <span style={{ fontSize:11, color:'var(--text-3)' }}>{etfSym ?? '--'}</span>
            }
            const diff = stockChg - etfPct
            const beat = diff >= 0
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <span style={{ fontSize:11, fontWeight:600, color: beat ? '#15803d' : '#b91c1c', whiteSpace:'nowrap' }}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span style={{ fontSize:9, color:'var(--text-3)' }}>{etfSym}</span>
              </div>
            )
          })()}
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom:'1px solid var(--border)' }}>
          <td colSpan={16} style={{ padding:'0 10px 10px 32px', background:'var(--surface2)' }}>
            <FundamentalsPanel fundamental={fundamental} ticker={stock.t} tg={tg} onShowDesc={() => setShowDesc(true)} />

            {/* Market comparison */}
            {marketData && <MarketComparison stock={stock} fundamental={fundamental} marketData={marketData} autoPrice={autoPrice} />}

            {/* Notes field */}
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:9, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5, fontWeight:700 }}>
                📝 Notes
              </div>
              <textarea
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                onBlur={() => onNoteChange && onNoteChange(stock.t, noteVal)}
                onClick={e => e.stopPropagation()}
                placeholder={`Add notes for ${stock.t.split('.')[0]}… (saved automatically on blur)`}
                style={{ width:'100%', maxWidth:600, height:64, fontSize:'var(--fs-xs)', fontFamily:'inherit', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)', color:'var(--text)', resize:'vertical', outline:'none', lineHeight:1.6 }}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
})

export default StockRow

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

  const spyDiff = stockPct != null && spyPct    != null ? stockPct - spyPct    : null
  const rspDiff = stockPct != null && rspPct    != null ? stockPct - rspPct    : null
  const qqqDiff = stockPct != null && qqqPct    != null ? stockPct - qqqPct    : null
  const etfDiff = stockPct != null && etfPct    != null ? stockPct - etfPct    : null
  const indDiff = stockPct != null && indEtfPct != null ? stockPct - indEtfPct : null

  const renderRow = (row) => {
    const isStock  = row.isStock
    const isPos    = row.pct >= 0
    const barColor = isStock
      ? (isPos ? 'var(--green)' : 'var(--red)')
      : (isPos ? 'rgba(34,197,94,0.35)' : 'rgba(220,38,38,0.3)')
    const pctColor = isPos ? 'var(--green)' : 'var(--red)'
    const nameStyle = {
      width:NAME_W, flexShrink:0, fontSize:11,
      fontWeight: isStock ? 700 : 500,
      color: isStock ? 'var(--accent)' : 'var(--text-2)',
      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
      display:'flex', alignItems:'center', gap:3,
    }
    const pctStyle = {
      width:PCT_W, flexShrink:0, fontSize:11, fontWeight:700,
      color:pctColor, textAlign:'right', whiteSpace:'nowrap',
    }

    if (!hasNeg) {
      const barWidth = Math.abs(row.pct) / maxPct * 100
      return (
        <div key={row.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={nameStyle}>
            {isStock && <span style={{ fontSize:9, flexShrink:0 }}>▶</span>}
            {row.label}
          </div>
          <div style={{ flex:1, height:BAR_H, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
            <div style={{ height:'100%', width: barWidth + '%', borderRadius:3, background: barColor, outline: isStock ? '1.5px solid var(--accent)' : 'none', outlineOffset:1, transition:'width .4s ease' }} />
          </div>
          <div style={pctStyle}>{fmt(row.pct)}</div>
        </div>
      )
    } else {
      const absMax  = Math.max(...rows.map(r => Math.abs(r.pct ?? 0)), 1)
      const barPct  = Math.abs(row.pct) / absMax * 50
      const barLeft = isPos ? 50 : (50 - barPct)
      return (
        <div key={row.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={nameStyle}>
            {isStock && <span style={{ fontSize:9, flexShrink:0 }}>▶</span>}
            {row.label}
          </div>
          <div style={{ flex:1, height:BAR_H, borderRadius:3, background:'var(--surface2)', overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute', top:0, height:'100%', borderRadius:3, background: barColor, left: barLeft + '%', width: barPct + '%', outline: isStock ? '1.5px solid var(--accent)' : 'none', outlineOffset:1, transition:'all .4s ease' }} />
            <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1.5, background:'var(--text-3)', opacity:0.4 }} />
          </div>
          <div style={pctStyle}>{fmt(row.pct)}</div>
        </div>
      )
    }
  }

  const badge = (diff, label) => diff == null ? null : (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: diff >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
      {diff >= 0 ? '▲' : '▼'} {diff >= 0 ? 'Beat' : 'Lagged'} {label} by {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
    </span>
  )

  return (
    <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
      <div style={{ fontSize:9, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:700, marginBottom:12 }}>
        📈 Performance ranking since {baseDate}
        <span style={{ fontStyle:'italic', fontWeight:400, marginLeft:8, textTransform:'none', letterSpacing:0 }}>
          same period for stock and indices
        </span>
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
        {!sector && <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>Fetch fundamentals to see sector ETF comparison</span>}
        {sector && !etfSymbol && <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>No sector ETF mapped for "{sector}"</span>}
      </div>
    </div>
  )
}

function FundamentalsPanel({ fundamental, ticker, tg, onShowDesc }) {
  const horizonItems = tg ? [
    { label:'1M target', date:tg.d1 },{ label:'3M target', date:tg.d3 },
    { label:'6M target', date:tg.d6 },{ label:'12M target', date:tg.d12 },
  ] : []

  const lbl = { fontSize:9, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3, fontWeight:700 }
  const val = { fontSize:'var(--fs-sm)', color:'var(--text)', fontWeight:500 }

  return (
    <div style={{ display:'flex', gap:20, flexWrap:'wrap', paddingTop:8, alignItems:'flex-start' }}>

      {/* Horizon dates */}
      {horizonItems.map(({ label, date }) => {
        const dl = daysLeft(date)
        const expired = dl < 0
        const color = expired?'var(--red)':dl<=14?'var(--amber)':'var(--green)'
        return (
          <div key={label}>
            <div style={lbl}>{label}</div>
            <div style={{ fontSize:12, fontWeight:600, color }}>{expired?`${Math.abs(dl)}d ago`:`${dl}d left`}</div>
            <div style={{ fontSize:9, color:'var(--text-3)', marginTop:1 }}>{formatDate(date)}</div>
          </div>
        )
      })}

      {horizonItems.length>0 && <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', margin:'0 4px' }} />}

      {fundamental===undefined && <span style={{ fontSize:11, color:'var(--text-3)', alignSelf:'center' }}>Click "Fetch fundamentals" to load data for {ticker}</span>}
      {fundamental===null      && <span style={{ fontSize:11, color:'var(--red)',    alignSelf:'center' }}>Fundamentals unavailable for {ticker}</span>}

      {fundamental && <>
        <div><div style={lbl}>Sector</div>     <div style={val}>{fundamental.sector    || '--'}</div></div>
        <div><div style={lbl}>Industry</div>   <div style={val}>{fundamental.industry   || '--'}</div></div>
        <div><div style={lbl}>Market Cap</div> <div style={val}>{fmtMarketCap(fundamental.marketCap)}</div></div>
        <div><div style={lbl}>Beta</div>       <div style={val}>{fundamental.beta ? fundamental.beta.toFixed(2) : '--'}</div></div>
        <div><div style={lbl}>Last Dividend</div><div style={val}>{fundamental.lastDividend ? `$${fundamental.lastDividend}` : '--'}</div></div>
        <div>
          <div style={lbl}>CIK (SEC)</div>
          {fundamental.cik
            ? <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${fundamental.cik}&type=10-K`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize:'var(--fs-xs)', color:'var(--accent)', fontWeight:500, fontFamily:'monospace', textDecoration:'none' }}
              >
                🔗 {fundamental.cik}
              </a>
            : <span style={val}>--</span>
          }
        </div>

        <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', margin:'0 4px' }} />

        {/* Website */}
        <div>
          <div style={lbl}>Website</div>
          {fundamental.website
            ? <a href={fundamental.website} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'var(--fs-sm)', color:'var(--accent)', fontWeight:500, textDecoration:'none' }}
                onClick={e => e.stopPropagation()}
              >
                🔗 {fundamental.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            : <span style={val}>--</span>
          }
        </div>

        {/* Description */}
        {fundamental.description && (
          <div>
            <div style={lbl}>Description</div>
            <button
              style={{ fontSize:'var(--fs-xxs)', padding:'3px 8px', borderRadius:6, border:'1.5px solid var(--border-blue)', background:'var(--surface)', color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}
              onClick={e => { e.stopPropagation(); onShowDesc() }}
            >
              📄 Read more
            </button>
          </div>
        )}
      </>}
    </div>
  )
}

function ResultCell({ histLoading, p, verdict, direction, isHistorical }) {
  if (histLoading) return <span style={{ color:'var(--text-3)', fontSize:11 }}>loading…</span>
  if (p==null)     return <span style={{ color:'var(--text-3)', fontSize:11 }}>awaiting</span>
  const sub = isHistorical ? 'on target date' : 'today'
  if (verdict==='hit')   return <div><span style={{ color:'var(--green)', fontSize:11, fontWeight:600 }}>{direction==='bearish'?'✓ Dropped':'✓ Reached'}</span><span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>{sub}</span></div>
  if (verdict==='close') return <div><span style={{ color:'var(--amber)', fontSize:11, fontWeight:600 }}>Near target</span><span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>{sub}</span></div>
  return <div><span style={{ color:'var(--red)', fontSize:11, fontWeight:600 }}>{direction==='bearish'?"✗ Didn't drop":'✗ Not reached'}</span><span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>{sub}</span></div>
}

function DateTag({ status }) {
  const cfg = { past:{ bg:'var(--red-bg)', color:'var(--red)', label:'expired' }, now:{ bg:'var(--green-bg)', color:'var(--green)', label:'now' }, soon:{ bg:'var(--amber-bg)', color:'var(--amber)', label:'soon' } }
  const c = cfg[status]; if (!c) return null
  return <span style={{ display:'inline-block', fontSize:9, padding:'1px 4px', borderRadius:6, marginLeft:4, verticalAlign:'middle', background:c.bg, color:c.color, fontWeight:600 }}>{c.label}</span>
}

function Badge({ type, children }) {
  const cfg = { hit:{ bg:'var(--green-bg)', color:'var(--green)' }, close:{ bg:'var(--amber-bg)', color:'var(--amber)' }, miss:{ bg:'var(--red-bg)', color:'var(--red)' }, wait:{ bg:'var(--surface2)', color:'var(--text-2)' } }
  const c = cfg[type]
  return <span style={{ display:'inline-flex', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, background:c.bg, color:c.color }}>{children}</span>
}

function DistBar({ dist, verdict }) {
  const bw    = Math.min(70, Math.abs(dist)*2.5)
  const barBg = verdict==='hit'?'var(--green-bg)':verdict==='close'?'var(--amber-bg)':'var(--red-bg)'
  const color = verdict==='hit'?'var(--green)':verdict==='close'?'var(--amber)':'var(--red)'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <div style={{ width:bw, height:4, borderRadius:3, background:barBg }} />
      <span style={{ fontSize:11, fontWeight:600, color, whiteSpace:'nowrap' }}>{dist>0?'+':''}{dist.toFixed(2)}%</span>
    </div>
  )
}

import { memo, useState, useCallback, useEffect } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getEffectivePrice, distancePct, evaluatePrediction, histKey } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

const StockRow = memo(function StockRow({ stock, horizon, autoPrice, histPrices, override, horizonExpired, fundamental, onOverrideChange }) {
  const [expanded,     setExpanded]     = useState(false)
  const [showDesc,     setShowDesc]     = useState(false)

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

  // Close description modal on Escape
  useEffect(() => {
    if (!showDesc) return
    const handler = (e) => { if (e.key === 'Escape') setShowDesc(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showDesc])

  const sectorText   = fundamental===undefined?'...':fundamental===null?'--':fundamental.sector  ||'--'
  const industryText = fundamental===undefined?'...':fundamental===null?'--':fundamental.industry ||'--'
  const fundColor    = (fundamental===undefined||fundamental===null) ? 'var(--text-3)' : 'var(--text-2)'

  const td = { padding:'7px 10px', verticalAlign:'middle' }

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

      <tr style={{ borderBottom: expanded ? 'none' : '1px solid var(--border)', cursor:'pointer' }} onClick={() => setExpanded(v=>!v)}>

        <td style={{ ...td, fontWeight:600, fontSize:12, color:'var(--text)', whiteSpace:'nowrap' }}>
          <span style={{ marginRight:4, fontSize:9, color:'var(--text-3)' }}>{expanded?'▼':'▶'}</span>
          {stock.t.split('.')[0]}
          <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:400, marginTop:1 }}>{stock.t.includes('.') ? stock.t.split('.').pop() : 'US'}</div>
        </td>
        <td style={{ ...td, fontSize:11, color:'var(--text-2)', wordBreak:'break-word', minWidth:80 }}>{stock.co}</td>
        <td style={{ ...td, fontSize:11, color:fundColor }}>{sectorText}</td>
        <td style={{ ...td, fontSize:11, color:fundColor }}>{industryText}</td>
        <td style={{ ...td, fontSize:11, color:'var(--text-3)' }}>{stock.cu}</td>
        <td style={{ ...td, fontSize:11, color:'var(--text-3)' }}>{stock.base ? formatDate(stock.base) : '--'}</td>
        <td style={{ ...td, fontSize:12, color:'var(--text-2)', fontWeight:500 }}>{stock.b ? stock.b.toFixed(2) : '--'}</td>

        {/* Price */}
        <td style={td} onClick={e=>e.stopPropagation()}>
          {histLoading && <span style={{ color:'var(--text-3)', fontSize:11 }}>fetching…</span>}
          {!histLoading && isHistorical && histEntry && (
            <div>
              <span style={{ color:'var(--blue)', fontWeight:600, fontSize:12 }}>{histEntry.price.toFixed(2)}</span>
              <span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>close on {histEntry.date}</span>
            </div>
          )}
          {!histLoading && isHistorical && !histEntry && <span style={{ color:'var(--red)', fontSize:11 }}>unavailable</span>}
          {!isHistorical && (
            <div>
              {autoPrice==null
                ? <span style={{ color:'var(--text-3)', fontSize:11 }}>--</span>
                : <span style={{ color:'var(--green)', fontWeight:600, fontSize:12 }}>{autoPrice.toFixed(2)}</span>
              }
              {horizon==='best' && autoPrice!=null && (
                <span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>vs {bestLabel} · today</span>
              )}
            </div>
          )}
        </td>

        {/* Override */}
        <td style={td} onClick={e=>e.stopPropagation()}>
          <input
            type="number"
            style={{ width:70, padding:'4px 6px', borderRadius:6, fontFamily:'inherit', border:`1px solid ${override?'var(--amber)':'var(--border)'}`, background:'var(--bg)', color: override?'var(--amber)':'var(--text)', fontSize:12, textAlign:'right', outline:'none' }}
            value={val}
            placeholder={p ? p.toFixed(2) : stock.b.toFixed(2)}
            onChange={e=>setVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
          />
        </td>

        {/* Target columns */}
        {horizonDates.map(({ val:t, date }, i) => {
          const isBest = t===best
          const ds = date ? dateStatus(date) : null
          const dl = date ? daysLeft(date) : null
          const tDir = t>stock.b?'↑':t<stock.b?'↓':'→'
          const tDirColor = t>stock.b?'var(--green)':t<stock.b?'var(--red)':'var(--text-3)'
          return (
            <td key={i} style={{ ...td, fontSize:12, color:isBest?'var(--blue)':'var(--text-2)', fontWeight:isBest?600:400 }}>
              <span style={{ fontSize:10, color:tDirColor, marginRight:2 }}>{tDir}</span>
              {t.toFixed(2)}
              {ds && <DateTag status={ds} />}
              {dl!=null && ds!=='past' && <span style={{ display:'block', fontSize:9, color:'var(--text-3)', marginTop:1 }}>{dl>=0?'+':''}{dl}d</span>}
            </td>
          )
        })}

        {/* Hit badge + days */}
        <td style={{ ...td, textAlign:'center' }}>
          {histLoading && <Badge type="wait">…</Badge>}
          {!histLoading && verdict==null   && <Badge type="wait">--</Badge>}
          {!histLoading && verdict==='hit'  && <Badge type="hit">HIT</Badge>}
          {!histLoading && verdict==='close' && <Badge type="close">CLOSE</Badge>}
          {!histLoading && verdict==='miss'  && <Badge type="miss">MISS</Badge>}
          {horizon!=='best' && tg && (() => {
            const KEYS = { '1M':'d1','3M':'d3','6M':'d6','12M':'d12' }
            const tgtD = tg[KEYS[horizon]]
            if (!tgtD) return null
            const dl = daysLeft(tgtD)
            const expired = dl < 0
            return <div style={{ fontSize:9, marginTop:4, fontWeight:600, color: expired?'var(--red)':dl<=14?'var(--amber)':'var(--text-3)' }}>{expired?`${Math.abs(dl)}d ago`:`${dl}d left`}</div>
          })()}
        </td>

        {/* Distance */}
        <td style={td}>
          {histLoading||dist==null
            ? <span style={{ color:'var(--text-3)', fontSize:11 }}>{histLoading?'…':'--'}</span>
            : <DistBar dist={dist} verdict={verdict} />
          }
        </td>

        {/* Result */}
        <td style={td}><ResultCell histLoading={histLoading} p={p} verdict={verdict} direction={direction} isHistorical={isHistorical} /></td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom:'1px solid var(--border)' }}>
          <td colSpan={16} style={{ padding:'0 10px 10px 32px', background:'var(--surface2)' }}>
            <FundamentalsPanel fundamental={fundamental} ticker={stock.t} tg={tg} onShowDesc={() => setShowDesc(true)} />
          </td>
        </tr>
      )}
    </>
  )
})

export default StockRow

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
        <div><div style={lbl}>Forward P/E</div><div style={val}>{fundamental.forwardPE  ? fundamental.forwardPE.toFixed(2) : '--'}</div></div>
        <div><div style={lbl}>Beta</div>       <div style={val}>{fundamental.beta        ? fundamental.beta.toFixed(2)      : '--'}</div></div>
        <div><div style={lbl}>Last Dividend</div><div style={val}>{fundamental.lastDividend ? `$${fundamental.lastDividend}` : '--'}</div></div>
        <div><div style={lbl}>CIK (SEC)</div>  <div style={{ fontSize:'var(--fs-xs)', color:'var(--text)', fontWeight:500, fontFamily:'monospace' }}>{fundamental.cik || '--'}</div></div>

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

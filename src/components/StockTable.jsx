import { useMemo, useState } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

function Th({ w, date, children }) {
  return (
    <th style={{ background:'var(--surface)', fontWeight:500, fontSize:11, color:'var(--text-2)', padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)', verticalAlign:'bottom', whiteSpace:'nowrap', width:w }}>
      {children}
      {date && <span style={{ display:'block', fontSize:9, fontWeight:400, color:'var(--text-3)' }}>{formatDate(date)}</span>}
    </th>
  )
}

export default function StockTable({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals, groupBySector, filterSector, filterIndustry, sortBySector, onOverrideChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])
  const [collapsed, setCollapsed] = useState({})
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
      fundamentalKey={fundamentals[stock.t] ? 'loaded' : 'pending'}
      onOverrideChange={onOverrideChange}
    />
  )

  const colSpan = 16

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflowX:'auto', marginBottom:'1.5rem' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, tableLayout:'fixed', minWidth:1280 }}>
        <thead>
          <tr>
            <Th w={56}>Ticker</Th>
            <Th w={110}>Company</Th>
            <Th w={88}>Sector</Th>
            <Th w={100}>Industry</Th>
            <Th w={40}>Cur.</Th>
            <Th w={76}>Base date</Th>
            <Th w={76}>Base price</Th>
            <Th w={100}>Price</Th>
            <Th w={82}>Override</Th>
            <Th w={68} date={tg?.d1}>1M</Th>
            <Th w={68} date={tg?.d3}>3M</Th>
            <Th w={68} date={tg?.d6}>6M</Th>
            <Th w={68} date={tg?.d12}>12M</Th>
            <Th w={66}>Hit?</Th>
            <Th w={106}>Distance</Th>
            <Th w={110}>Result</Th>
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
  )
}

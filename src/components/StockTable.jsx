import { useMemo, useState } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

const s = {
  wrap:       { border: '1px solid #30363d', borderRadius: 8, overflowX: 'auto', marginBottom: '1.5rem' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 1100 },
  th:         { background: '#161b22', fontWeight: 500, fontSize: 11, color: '#8b949e', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #30363d', verticalAlign: 'bottom', whiteSpace: 'nowrap' },
  dateSub:    { display: 'block', fontSize: 9, fontWeight: 400, color: '#484f58' },
  empty:      { padding: '24px 10px', textAlign: 'center', color: '#484f58', fontSize: 12 },
  groupHdr:   { background: '#0d2136', borderBottom: '1px solid #1f6feb' },
  groupCell:  { padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#58a6ff', cursor: 'pointer', userSelect: 'none' },
  groupCount: { fontSize: 10, color: '#484f58', marginLeft: 8, fontWeight: 400 },
}

function Th({ w, date, children }) {
  return (
    <th style={{ ...s.th, width: w }}>
      {children}
      {date && <span style={s.dateSub}>{formatDate(date)}</span>}
    </th>
  )
}

export default function StockTable({
  stocks, horizon, autoPrices, histPrices, overrides, horizonExpired,
  fundamentals, groupBySector, filterSector, sortBySector,
  onOverrideChange,
}) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])

  // Collapsed sector groups
  const [collapsed, setCollapsed] = useState({})
  const toggleGroup = (sector) => setCollapsed(prev => ({ ...prev, [sector]: !prev[sector] }))

  // Apply filter
  const filtered = useMemo(() => {
    if (filterSector === 'all') return stocks
    return stocks.filter(s => {
      const f = fundamentals[s.t]
      return f && f.sector === filterSector
    })
  }, [stocks, filterSector, fundamentals])

  // Apply sort
  const sorted = useMemo(() => {
    if (!sortBySector) return filtered
    return [...filtered].sort((a, b) => {
      const sa = fundamentals[a.t]?.sector || 'zzz'
      const sb = fundamentals[b.t]?.sector || 'zzz'
      return sa.localeCompare(sb)
    })
  }, [filtered, sortBySector, fundamentals])

  // Group by sector
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

  const colSpan = 14

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            <Th w={56}>Ticker</Th>
            <Th w={110}>Company</Th>
            <Th w={90}>Sector</Th>
            <Th w={40}>Cur.</Th>
            <Th w={76}>Base date</Th>
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
            <tr><td colSpan={colSpan} style={s.empty}>No stocks to display</td></tr>
          )}

          {/* Grouped view */}
          {groups && Object.entries(groups).map(([sector, sectorStocks]) => (
            <>
              <tr key={`group-${sector}`} style={s.groupHdr}>
                <td
                  colSpan={colSpan}
                  style={s.groupCell}
                  onClick={() => toggleGroup(sector)}
                >
                  {collapsed[sector] ? '▶' : '▼'} {sector}
                  <span style={s.groupCount}>{sectorStocks.length} stock{sectorStocks.length > 1 ? 's' : ''}</span>
                </td>
              </tr>
              {!collapsed[sector] && sectorStocks.map(renderRow)}
            </>
          ))}

          {/* Flat view */}
          {!groups && sorted.map(renderRow)}
        </tbody>
      </table>
    </div>
  )
}

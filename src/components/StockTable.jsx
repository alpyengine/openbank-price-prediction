import { useMemo } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'

const s = {
  wrap:    { border: '1px solid #30363d', borderRadius: 8, overflowX: 'auto', marginBottom: '1.5rem' },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 1060 },
  th:      { background: '#161b22', fontWeight: 500, fontSize: 11, color: '#8b949e', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #30363d', verticalAlign: 'bottom', whiteSpace: 'nowrap' },
  dateSub: { display: 'block', fontSize: 9, fontWeight: 400, color: '#484f58' },
  empty:   { padding: '24px 10px', textAlign: 'center', color: '#484f58', fontSize: 12 },
}

function Th({ w, date, children }) {
  return (
    <th style={{ ...s.th, width: w }}>
      {children}
      {date && <span style={s.dateSub}>{formatDate(date)}</span>}
    </th>
  )
}

export default function StockTable({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, onOverrideChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            <Th w={62}>Ticker</Th>
            <Th w={110}>Company</Th>
            <Th w={40}>Cur.</Th>
            <Th w={76}>Base date</Th>
            <Th w={108}>Price</Th>
            <Th w={86}>Override</Th>
            <Th w={70} date={tg?.d1}>1M</Th>
            <Th w={70} date={tg?.d3}>3M</Th>
            <Th w={70} date={tg?.d6}>6M</Th>
            <Th w={70} date={tg?.d12}>12M</Th>
            <Th w={66}>Hit?</Th>
            <Th w={110}>Distance</Th>
            <Th w={120}>Result</Th>
          </tr>
        </thead>
        <tbody>
          {stocks.length === 0
            ? <tr><td colSpan={13} style={s.empty}>No stocks imported — paste CSV below and click Import</td></tr>
            : stocks.map(stock => (
                <StockRow
                  key={stock.t}
                  stock={stock}
                  horizon={horizon}
                  autoPrice={autoPrices[stock.t]}
                  histPrices={histPrices}
                  override={overrides[stock.t]}
                  horizonExpired={horizonExpired}
                  onOverrideChange={onOverrideChange}
                />
              ))
          }
        </tbody>
      </table>
    </div>
  )
}

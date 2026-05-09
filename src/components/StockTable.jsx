import { useMemo } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'

const s = {
  wrap:    { border: '1px solid #30363d', borderRadius: 8, overflowX: 'auto', marginBottom: '1.5rem' },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 900 },
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

export default function StockTable({ stocks, horizon, autoPrices, overrides, onOverrideChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            <Th w={62}>Ticker</Th>
            <Th w={118}>Company</Th>
            <Th w={44}>Cur.</Th>
            <Th w={80}>Base date</Th>
            <Th w={100}>Auto price</Th>
            <Th w={90}>Override</Th>
            <Th w={72} date={tg?.d1}>1M target</Th>
            <Th w={72} date={tg?.d3}>3M target</Th>
            <Th w={72} date={tg?.d6}>6M target</Th>
            <Th w={72} date={tg?.d12}>12M target</Th>
            <Th w={72}>Hit? ±5%</Th>
            <Th w={120}>Distance</Th>
            <Th w={100}>Status</Th>
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
                  override={overrides[stock.t]}
                  onOverrideChange={onOverrideChange}
                />
              ))
          }
        </tbody>
      </table>
    </div>
  )
}

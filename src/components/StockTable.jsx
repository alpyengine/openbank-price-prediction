import { useMemo } from 'react'
import StockRow from './StockRow.jsx'
import { formatDate, targetDates } from '../utils/dates.js'

export default function StockTable({ stocks, horizon, autoPrices, sources, overrides, onOverrideChange }) {
  // Compute column header dates from first stock's base
  const base = stocks.find(s => s.base)?.base
  const tg   = useMemo(() => base ? targetDates(base) : null, [base])

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <Th w={62}>Ticker</Th>
            <Th w={118}>Company</Th>
            <Th w={44}>Cur.</Th>
            <Th w={80}>Base date</Th>
            <Th w={100}>Auto price</Th>
            <Th w={90}>Override</Th>
            <Th w={72}>1M target{tg && <DateSub d={tg.d1} />}</Th>
            <Th w={72}>3M target{tg && <DateSub d={tg.d3} />}</Th>
            <Th w={72}>6M target{tg && <DateSub d={tg.d6} />}</Th>
            <Th w={72}>12M target{tg && <DateSub d={tg.d12} />}</Th>
            <Th w={72}>Hit? ±5%</Th>
            <Th w={120}>Distance</Th>
            <Th w={100}>Status</Th>
          </tr>
        </thead>
        <tbody>
          {stocks.map(s => (
            <StockRow
              key={s.t}
              stock={s}
              horizon={horizon}
              autoPrice={autoPrices[s.t]}
              source={sources[s.t]}
              override={overrides[s.t]}
              onOverrideChange={onOverrideChange}
            />
          ))}
          {stocks.length === 0 && (
            <tr>
              <td colSpan={13} style={styles.empty}>
                No stocks imported yet — paste CSV below and click Import
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Th({ w, children }) {
  return (
    <th style={{ ...styles.th, width: w }}>
      {children}
    </th>
  )
}

function DateSub({ d }) {
  return (
    <><br /><span style={styles.dateSub}>{formatDate(d)}</span></>
  )
}

const styles = {
  wrap:    { border: '1px solid #30363d', borderRadius: 8, overflowX: 'auto', marginBottom: '1.5rem' },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 900 },
  th:      { background: '#161b22', fontWeight: 500, fontSize: 11, color: '#8b949e', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #30363d', verticalAlign: 'bottom', whiteSpace: 'nowrap' },
  dateSub: { fontSize: 9, fontWeight: 400, color: '#484f58' },
  empty:   { padding: '24px 10px', textAlign: 'center', color: '#484f58', fontSize: 12 },
}

import { formatDate, today as getToday } from '../utils/dates.js'
import { Moon, Sun, Mail, RotateCcw } from 'lucide-react'

const TODAY = getToday()

export default function Header({ stocks, darkMode, onToggleDark, onClearOverrides, onToggleEmail, loadedBatchDate, batchCurrency, activePage }) {
  const bases = [...new Set(stocks.map(s => s.base ? formatDate(s.base) : '?'))]

  const PAGE_TITLES = {
    batch:    { title: 'Batch Overview',  sub: 'AI-powered prediction analytics and performance tracking' },
    accuracy: { title: 'Accuracy Stats',  sub: 'Historical performance metrics and hit rate analysis' },
    settings: { title: 'Settings',        sub: 'Configure your preferences and integrations' },
  }
  const { title, sub } = PAGE_TITLES[activePage] || PAGE_TITLES.batch

  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.5rem', gap:16, flexWrap:'wrap' }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--tw-fg)', letterSpacing:'-0.02em', lineHeight:1.2 }}>
          {title}
        </h1>
        <p style={{ fontSize:13, color:'var(--tw-muted-fg)', marginTop:4 }}>
          {activePage === 'batch' && stocks.length > 0
            ? <>Base date: <strong style={{ color:'var(--tw-fg)' }}>{bases.join(', ')}</strong>{loadedBatchDate && <> · Loaded: <strong style={{ color:'var(--tw-fg)' }}>{loadedBatchDate}</strong></>}</>
            : sub
          }
        </p>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {/* Dark mode toggle — always visible */}
        <button
          title={darkMode ? 'Light mode' : 'Dark mode'}
          onClick={onToggleDark}
          style={{
            width:36, height:36, borderRadius:8,
            border:'1px solid var(--tw-border)',
            background:'var(--tw-card)',
            color:'var(--tw-muted-fg)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', transition:'background .15s',
          }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Batch-only buttons */}
        {activePage === 'batch' && <>
          <button
            onClick={onClearOverrides}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:8,
              border:'1px solid var(--tw-border)',
              background:'var(--tw-card)',
              color:'var(--tw-muted-fg)',
              fontSize:13, fontWeight:500, cursor:'pointer',
              fontFamily:'inherit', transition:'background .15s',
            }}
          >
            <RotateCcw size={14} />
            Clear overrides
          </button>

          <button
            onClick={onToggleEmail}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:8,
              border:'1px solid var(--tw-border)',
              background:'var(--tw-card)',
              color:'var(--tw-fg)',
              fontSize:13, fontWeight:500, cursor:'pointer',
              fontFamily:'inherit', transition:'background .15s',
            }}
          >
            <Mail size={14} />
            Email report
          </button>
        </>}
      </div>
    </div>
  )
}

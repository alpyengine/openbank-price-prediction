import ImportBox from './ImportBox.jsx'
import { Upload } from 'lucide-react'

export default function ImportPage({ onImport }) {
  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <Upload size={18} color="var(--tw-muted-fg)" />
          <h2 style={{ fontSize:16, fontWeight:600, color:'var(--tw-fg)', margin:0 }}>
            Import instructions
          </h2>
        </div>
        <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, padding:'16px 20px', fontSize:13, color:'var(--tw-muted-fg)', lineHeight:1.7 }}>
          <p style={{ margin:'0 0 8px', fontWeight:600, color:'var(--tw-fg)' }}>CSV format:</p>
          <code style={{ display:'block', background:'var(--tw-muted)', padding:'10px 12px', borderRadius:8, fontSize:12, fontFamily:'monospace', marginBottom:8 }}>
            Ticker,Company,Currency,BasePrice,1M,3M,6M,12M,DD/MM/YYYY
          </code>
          <ul style={{ margin:0, paddingLeft:20 }}>
            <li><strong>Ticker</strong> — stock symbol (e.g. AAPL, SLB.US)</li>
            <li><strong>Currency</strong> — USD, EUR, GBP</li>
            <li><strong>BasePrice</strong> — price on screenshot date</li>
            <li><strong>1M–12M</strong> — target prices for each horizon</li>
            <li><strong>Date</strong> — screenshot date in DD/MM/YYYY format</li>
          </ul>
        </div>
      </div>

      <ImportBox onImport={onImport} />
    </div>
  )
}

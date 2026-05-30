/**
 * ImportPage
 *
 * The Import CSV page wrapper.
 * Shows format instructions and the ImportBox component.
 *
 * @param {Function} onImport — called with parsed stock array on import
 */
import ImportBox from './ImportBox.jsx'
import { Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ImportPage({ onImport }) {
  return (
    <div>
      {/* ── Format instructions ─────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <Upload size={18} className="text-muted-foreground" />
          <h2 className="text-base font-semibold m-0">Import instructions</h2>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-2">CSV format:</p>
            <code className="block bg-muted px-3 py-2.5 rounded-md text-xs font-mono mb-3">
              Ticker,Company,Currency,BasePrice,1M,3M,6M,12M,DD/MM/YYYY
            </code>
            <ul className="m-0 pl-5 space-y-0.5">
              <li><strong>Ticker</strong> — stock symbol (e.g. AAPL, SLB.US)</li>
              <li><strong>Currency</strong> — USD, EUR, GBP</li>
              <li><strong>BasePrice</strong> — price on screenshot date</li>
              <li><strong>1M–12M</strong> — target prices for each horizon</li>
              <li><strong>Date</strong> — screenshot date in DD/MM/YYYY format</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <ImportBox onImport={onImport} />
    </div>
  )
}

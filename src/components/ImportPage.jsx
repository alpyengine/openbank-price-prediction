/**
 * ImportPage
 *
 * The Import CSV page wrapper.
 * Shows format instructions, a batch direction selector (bullish/bearish),
 * and the ImportBox component.
 *
 * The direction selector determines whether this batch contains
 * bullish (price rising) or bearish (price falling) predictions.
 * It is stored with the batch in Supabase for accurate verdict evaluation.
 *
 * @param {Function} onImport — called with (parsedStocks, direction) on import
 */
import { useState } from 'react'
import ImportBox from './ImportBox.jsx'
import { Upload, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function ImportPage({ onImport }) {
  // direction — 'bullish' (default) or 'bearish'
  // Selected before import — stored with the batch in Supabase
  const [direction, setDirection] = useState('bullish')

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

      {/* ── Batch direction selector ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-base font-semibold m-0">Batch direction</h2>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Select whether this batch contains bullish (prices rising) or
          bearish (prices falling) predictions from Openbank AI.
          This determines how verdicts are evaluated at horizon maturity.
        </p>

        <div className="flex gap-3">
          {/* Bullish option */}
          <button
            onClick={() => setDirection('bullish')}
            className={cn(
              'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer bg-transparent text-left',
              direction === 'bullish'
                ? 'border-green-500 bg-green-50'
                : 'border-border hover:border-green-300 hover:bg-green-50/30'
            )}
          >
            <TrendingUp size={20} className={direction === 'bullish' ? 'text-green-600' : 'text-muted-foreground'} />
            <div>
              <div className={cn('text-[13px] font-bold', direction === 'bullish' ? 'text-green-700' : 'text-foreground')}>
                📈 Bullish
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Openbank predicts prices will rise · target &gt; base price
              </div>
            </div>
            {direction === 'bullish' && (
              <span className="ml-auto text-green-600 font-bold text-lg">✓</span>
            )}
          </button>

          {/* Bearish option */}
          <button
            onClick={() => setDirection('bearish')}
            className={cn(
              'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer bg-transparent text-left',
              direction === 'bearish'
                ? 'border-red-500 bg-red-50'
                : 'border-border hover:border-red-300 hover:bg-red-50/30'
            )}
          >
            <TrendingDown size={20} className={direction === 'bearish' ? 'text-red-600' : 'text-muted-foreground'} />
            <div>
              <div className={cn('text-[13px] font-bold', direction === 'bearish' ? 'text-red-700' : 'text-foreground')}>
                📉 Bearish
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Openbank predicts prices will fall · target &lt; base price
              </div>
            </div>
            {direction === 'bearish' && (
              <span className="ml-auto text-red-600 font-bold text-lg">✓</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Import box ───────────────────────────────────────────────── */}
      <ImportBox onImport={(stocks) => onImport(stocks, direction)} />
    </div>
  )
}

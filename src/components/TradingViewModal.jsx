/**
 * TradingViewModal — modal with embedded TradingView standard widget.
 *
 * Opens a full-screen overlay with the TradingView chart for a given ticker.
 * Uses the free TradingView widget embed (no API key required).
 *
 * The widget URL format:
 *   https://www.tradingview.com/widgetembed/?symbol=NASDAQ:MU&theme=dark...
 *
 * Exchange mapping:
 *   Bare US tickers (MU, TER)   → NASDAQ or NYSE — TradingView auto-detects
 *   European tickers (NEM.DE)   → XETR:NEM
 *   Other European suffixes     → mapped via EXCHANGE_MAP
 *
 * @param {string}   ticker  — ticker symbol e.g. "MU", "NEM.DE"
 * @param {string}   company — company name for modal title
 * @param {Function} onClose — called when user closes the modal
 */
import { useEffect } from 'react'

// ── Exchange suffix → TradingView exchange prefix ─────────────────────────────
const EXCHANGE_MAP = {
  DE: 'XETR',   // Xetra (Germany)
  AS: 'AMS',    // Euronext Amsterdam
  PA: 'EPA',    // Euronext Paris
  L:  'LSE',    // London Stock Exchange
  MC: 'BME',    // Bolsa Madrid
}

/**
 * toTVSymbol — converts a bare or suffixed ticker to TradingView symbol format.
 * US tickers: "MU" → "MU" (TradingView auto-resolves exchange)
 * European:   "NEM.DE" → "XETR:NEM"
 */
function toTVSymbol(ticker) {
  const parts = ticker.toUpperCase().split('.')
  if (parts.length === 1) return parts[0]           // bare US ticker
  const [base, suffix] = parts
  const exchange = EXCHANGE_MAP[suffix]
  return exchange ? `${exchange}:${base}` : base    // mapped or fallback
}

export default function TradingViewModal({ ticker, company, onClose }) {
  const tvSymbol = toTVSymbol(ticker)

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // TradingView widget URL — standard chart, dark theme, no toolbar
  const src = [
    'https://www.tradingview.com/widgetembed/',
    `?symbol=${encodeURIComponent(tvSymbol)}`,
    '&interval=D',
    '&theme=dark',
    '&style=1',
    '&locale=en',
    '&toolbar_bg=%23131722',
    '&hide_top_toolbar=0',
    '&hide_side_toolbar=0',
    '&allow_symbol_change=1',
    '&save_image=0',
    '&withdateranges=1',
  ].join('')

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: '1100px', height: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {/* TradingView logo mark */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#2962ff" aria-hidden>
              <path d="M4 20V10l8-8 8 8v10H4zm8-14.2L5.8 12H18.2L12 5.8z"/>
            </svg>
            <div>
              <span className="text-sm font-bold text-foreground">{ticker}</span>
              {company && (
                <span className="text-xs text-muted-foreground ml-1.5">— {company}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">
              TradingView
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg px-1 rounded"
            aria-label="Close chart"
          >
            ✕
          </button>
        </div>

        {/* TradingView iframe */}
        <iframe
          src={src}
          title={`TradingView chart for ${ticker}`}
          className="flex-1 w-full border-0"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  )
}

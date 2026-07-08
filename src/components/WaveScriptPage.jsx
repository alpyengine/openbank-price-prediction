/**
 * WaveScriptPage — Master Elliott Wave Pine Script generator.
 *
 * Compiles every saved batch projection into a single downloadable
 * TradingView Pine Script v6 indicator (indicador_master_ondas.txt).
 *
 * Each batch (with its own base date) is rendered as one independent
 * "wave": a polyline connecting Base → 1M → 3M → 6M → 12M targets.
 * The same ticker across several batches (different dates) becomes
 * several historical waves on the same chart.
 *
 * Data shape (from useHistory / Supabase `batches` table):
 *   Each batch  = { id, date: "DD/MM/YYYY", results: [...] }
 *   Each result = { ticker, company, horizon: "1M"|"3M"|"6M"|"12M",
 *                   basePrice, targetPrice }
 *   The 4 horizon rows per ticker are grouped into one wave.
 *
 * Horizon dates use CALENDAR-MONTH arithmetic from the batch base date
 * (1M = +1 month, 3M = +3, 6M = +6, 12M = +12) — same day-of-month.
 *
 * NULL HANDLING (critical): if a ticker has no 12M target, the wave is
 * drawn Base→1M→3M→6M only. The final 6M→12M segment is left UNDRAWN.
 * In Pine we push `na` (not a magic -1) for the missing 12M price and
 * test it with `na(p4)` — clean, collision-free, idiomatic v6.
 *
 * @param {Array} batches — all saved batches from useHistory (props).
 *                          If empty, falls back to a direct Supabase read.
 */
import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Waves, Download, FileCode, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Pure generation logic lives in utils/waveScript.js (extracted in v7.15.7 so it
// can be unit-tested). The component only handles UI + the download flow.
import { extractWaves, buildPineScript } from '@/utils/waveScript'

// ── Component ─────────────────────────────────────────────────────────────────

export default function WaveScriptPage({ batches = [] }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // Derive waves from props (already loaded from Supabase via useHistory).
  const waves = useMemo(() => extractWaves(batches), [batches])

  // Quick stats for the summary card.
  const stats = useMemo(() => {
    const tickers = new Set(waves.map(w => w.tickerNorm))
    const no12m   = waves.filter(w => w.p4 == null).length
    return { waves: waves.length, tickers: tickers.size, no12m }
  }, [waves])

  /**
   * Fallback path: if no batches arrived via props, read them straight
   * from Supabase with @supabase/supabase-js (RLS-guarded), then generate.
   */
  const loadFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, date, results')
      .order('date', { ascending: true })
    if (error) throw error
    return data || []
  }, [])

  const handleDownload = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      let source = batches
      if (!source?.length) source = await loadFromSupabase()

      const computed = extractWaves(source)
      if (!computed.length) {
        setError('No hay proyecciones válidas para generar el indicador.')
        return
      }

      const pine = buildPineScript(computed)
      const blob = new Blob([pine], { type: 'text/plain;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'Openbank_Forecast_Ondas_v6.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.message || 'Error generando el indicador.')
    } finally {
      setBusy(false)
    }
  }, [batches, loadFromSupabase])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Waves className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Wave Script</h1>
          <p className="text-xs text-muted-foreground">
            Genera el indicador Pine Script v6 con todas las ondas de proyección
          </p>
        </div>
      </div>

      {/* Summary */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.waves}</div>
            <div className="text-xs text-muted-foreground">Ondas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.tickers}</div>
            <div className="text-xs text-muted-foreground">Tickers únicos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.no12m}</div>
            <div className="text-xs text-muted-foreground">Sin 12M</div>
          </div>
        </div>
      </Card>

      {/* Info about generation rules */}
      <Card className="p-5 space-y-3">
        <div className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
          <span>
            Una onda por cada batch. El mismo ticker en fechas distintas se
            dibuja como onda histórica independiente.
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
          <span>
            Colores por orden cronológico: 1ª roja · 2ª azul · 3ª verde ·
            siguientes naranja/púrpura.
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <span>
            Si falta el objetivo a 12M, el último tramo (6M → 12M) se deja
            sin pintar (<code className="text-xs">p4 = na</code> en Pine).
          </span>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Download */}
      <Button
        onClick={handleDownload}
        disabled={busy || stats.waves === 0}
        className="w-full gap-2"
      >
        {busy ? (
          <>Generando…</>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Descargar indicador_master_ondas.txt
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <FileCode className="h-3.5 w-3.5" />
        Pine Script v6 · TradingView · overlay
      </p>
    </div>
  )
}

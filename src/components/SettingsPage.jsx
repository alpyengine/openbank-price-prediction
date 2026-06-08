/**
 * SettingsPage
 *
 * Application settings panel — accessible from the sidebar.
 *
 * Sections:
 *   1. Analysis defaults — hit margin + close ratio (persisted in localStorage)
 *   2. Profile          — user email + role (read only)
 *   3. Data             — Supabase connection status + clear cache
 *   4. About            — app version + links
 */
import { useEffect, useState } from 'react'
import { useAuth }             from '@/hooks/useAuth'
import { isStorageConfigured } from '@/services/storage.js'
import { SNAPSHOT_PARAMS, CLOSE_RATIO_DEFAULT } from '@/utils/stocks.js'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge }   from '@/components/ui/badge'
import { Button }  from '@/components/ui/button'
import { cn }      from '@/lib/utils'

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS_HIT_MARGIN  = 'openbank_hitMargin'
const LS_CLOSE_RATIO = 'openbank_closeRatio'

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <Card className="mb-4">
      <CardHeader className="py-3 px-5 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      </CardHeader>
      <CardContent className="py-4 px-5">
        {children}
      </CardContent>
    </Card>
  )
}

// ── Row inside a section ──────────────────────────────────────────────────────
function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <div>
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage({ hitMargin, closeRatio, onHitMarginChange, onCloseRatioChange, alertConfig, onSaveAlertConfig }) {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const configured     = isStorageConfigured()
  const [cleared,      setCleared] = useState(false)

  // Persist hitMargin and closeRatio to localStorage when they change
  useEffect(() => {
    if (hitMargin != null) localStorage.setItem(LS_HIT_MARGIN, hitMargin)
  }, [hitMargin])

  useEffect(() => {
    if (closeRatio != null) localStorage.setItem(LS_CLOSE_RATIO, closeRatio)
  }, [closeRatio])

  // Clear local app cache (localStorage only — Supabase data is untouched)
  const handleClearCache = () => {
    localStorage.removeItem(LS_HIT_MARGIN)
    localStorage.removeItem(LS_CLOSE_RATIO)
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Configure analysis defaults and view app information.
        </p>
      </div>

      {/* ── 1. Analysis defaults ─────────────────────────────────────── */}
      <Section title="Analysis defaults">
        <p className="text-[11px] text-muted-foreground mb-3">
          These values control how predictions are evaluated in Batch Details (live mode).
          Accuracy Stats always uses fixed snapshot thresholds — see table below.
        </p>

        {/* Hit margin slider */}
        <Row
          label="Hit margin"
          sub={`Predictions within ±${hitMargin}% of target are counted as Hit`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.5} max={20} step={0.5}
              value={hitMargin}
              onChange={e => onHitMarginChange(parseFloat(e.target.value))}
              style={{ width: 100, accentColor: '#4f46e5', cursor: 'pointer' }}
            />
            <span className="text-[13px] font-bold text-primary w-10 text-right">
              ±{hitMargin}%
            </span>
          </div>
        </Row>

        {/* Close ratio field */}
        <Row
          label="Close ratio"
          sub={`Close zone = Hit margin × ratio = ±${hitMargin}% × ${closeRatio} = ${+(hitMargin * closeRatio).toFixed(1)}% threshold`}
        >
          <input
            type="number"
            min={1} max={5} step={0.1}
            value={closeRatio}
            onChange={e => onCloseRatioChange(parseFloat(e.target.value) || CLOSE_RATIO_DEFAULT)}
            style={{
              width: 56, padding: '3px 6px',
              border: '1px solid var(--border)', borderRadius: 6,
              fontSize: 13, fontWeight: 600,
              color: '#374151', background: '#f9fafb',
              textAlign: 'center', outline: 'none',
            }}
          />
        </Row>

        {/* Live thresholds table — recalculates dynamically with slider + close ratio */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Live thresholds (Batch Details view) — updates with slider above
          </p>
          <div className="rounded-lg border border-primary/30 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-primary/5">
                  {['Horizon', `Hit ±${hitMargin}%`, 'Exceeded', 'Close zone', 'Miss below'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['1M', '3M', '6M', '12M'].map(h => {
                  const ct = +(hitMargin * closeRatio).toFixed(1)
                  return (
                    <tr key={h} className="border-t border-border">
                      <td className="px-3 py-2 font-bold text-foreground">{h}</td>
                      <td className="px-3 py-2">
                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          ±{hitMargin}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          &gt;+{hitMargin}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          −{hitMargin}% → −{ct}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          &lt;−{ct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            All 4 horizons use the same live values in Batch Details ·
            Close threshold = ±{hitMargin}% × {closeRatio} = {+(hitMargin * closeRatio).toFixed(1)}%
          </p>
        </div>

        {/* Snapshot params table */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Fixed snapshot thresholds (Accuracy Stats + Save)
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-muted">
                  {['Horizon', 'Hit ±H%', 'Exceeded', 'Close zone', 'Miss below', 'Close ratio R'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SNAPSHOT_PARAMS).map(([h, p]) => (
                  <tr key={h} className="border-t border-border">
                    <td className="px-3 py-2 font-bold text-foreground">{h}</td>
                    <td className="px-3 py-2">
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        ±{p.H}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        &gt;+{p.H}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        −{p.H}% → −{+(p.H * p.R).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        &lt;−{+(p.H * p.R).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.R}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 2. Profile ───────────────────────────────────────────────── */}
      <Section title="Profile">
        <Row label="Email" sub="Your Supabase account email">
          <span className="text-[13px] text-muted-foreground font-mono">
            {user?.email ?? '—'}
          </span>
        </Row>
        <Row label="Role" sub="Controls access to admin features">
          <Badge className={cn(
            'text-[11px] font-semibold',
            role === 'admin'
              ? 'bg-violet-50 text-violet-700'
              : 'bg-muted text-muted-foreground'
          )}>
            {role ?? 'readonly'}
          </Badge>
        </Row>
      </Section>

      {/* ── 3. Data ──────────────────────────────────────────────────── */}
      {/* ── 3b. Alerts ───────────────────────────────────────────────── */}
      {alertConfig && onSaveAlertConfig && (
        <Section title="Alerts">

          {/* Enable / disable */}
          <Row label="Enable alerts" sub="Send browser + email notifications when watchlist tickers trigger">
            <input
              type="checkbox"
              checked={alertConfig.enabled}
              onChange={e => onSaveAlertConfig({ enabled: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary"
            />
          </Row>

          {/* Email destination */}
          <Row label="Alert email" sub="Address to receive alert emails (leave empty to disable email)">
            <input
              type="email"
              value={alertConfig.email ?? ''}
              onChange={e => onSaveAlertConfig({ email: e.target.value })}
              placeholder="you@email.com"
              className="text-foreground bg-background border border-input rounded px-2 py-1 text-[12px] w-[200px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Row>

          {/* Browser notification */}
          <Row label="Browser notifications" sub="Show OS notification when alert triggers">
            <input
              type="checkbox"
              checked={alertConfig.browser}
              onChange={e => onSaveAlertConfig({ browser: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary"
            />
          </Row>

          {/* Conditions */}
          <Row label="Alert on Exceeded" sub="Price surpassed target by more than hit margin">
            <input type="checkbox" checked={alertConfig.on_exceeded}
              onChange={e => onSaveAlertConfig({ on_exceeded: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary" />
          </Row>
          <Row label="Alert on Hit" sub="Price within ±hit margin of target">
            <input type="checkbox" checked={alertConfig.on_hit}
              onChange={e => onSaveAlertConfig({ on_hit: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary" />
          </Row>
          <Row label="Alert on Close" sub="Price within close threshold of target">
            <input type="checkbox" checked={alertConfig.on_close}
              onChange={e => onSaveAlertConfig({ on_close: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary" />
          </Row>
          <Row label="Alert on Stop loss" sub="Price dropped below base × (1 − stop %)">
            <input type="checkbox" checked={alertConfig.on_stop}
              onChange={e => onSaveAlertConfig({ on_stop: e.target.checked })}
              className="w-4 h-4 cursor-pointer accent-primary" />
          </Row>

          {/* Admin-only settings */}
          <Row
            label={<span className="flex items-center gap-1.5">Stop loss % {!isAdmin && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">admin only</span>}</span>}
            sub={`Trigger stop loss alert if price falls more than ${alertConfig.stop_pct}% below base`}
          >
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={30} step={1}
                value={alertConfig.stop_pct}
                disabled={!isAdmin}
                onChange={e => onSaveAlertConfig({ stop_pct: parseFloat(e.target.value) })}
                style={{ width: 100 }}
              />
              <span className="text-[12px] font-medium w-8">{alertConfig.stop_pct}%</span>
            </div>
          </Row>

          <Row
            label={<span className="flex items-center gap-1.5">Cooldown {!isAdmin && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">admin only</span>}</span>}
            sub={`Minimum ${alertConfig.cooldown_h}h between alerts for the same ticker + horizon`}
          >
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={168} step={1}
                value={alertConfig.cooldown_h}
                disabled={!isAdmin}
                onChange={e => onSaveAlertConfig({ cooldown_h: parseInt(e.target.value) })}
                style={{ width: 100 }}
              />
              <span className="text-[12px] font-medium w-12">{alertConfig.cooldown_h}h</span>
            </div>
          </Row>

        </Section>
      )}

      {/* ── 4. Data ───────────────────────────────────────────────────── */}
      <Section title="Data">
        <Row label="Supabase connection" sub="VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env">
          <Badge className={cn(
            'text-[11px] font-semibold',
            configured
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          )}>
            {configured ? '✓ Connected' : '✗ Not configured'}
          </Badge>
        </Row>
        <Row
          label="Local cache"
          sub="Clears hit margin and close ratio preferences from localStorage (Supabase data is untouched)"
        >
          <Button
            size="sm"
            variant="outline"
            className={cn(cleared && 'border-success text-success')}
            onClick={handleClearCache}
          >
            {cleared ? '✓ Cleared' : 'Clear cache'}
          </Button>
        </Row>
      </Section>

      {/* ── 4. About ─────────────────────────────────────────────────── */}
      <Section title="About">
        <Row label="Version" sub="Openbank Price Prediction">
          <Badge variant="secondary" className="text-[11px] font-mono">
            v7.5.4
          </Badge>
        </Row>
        <Row label="Documentation" sub="Full README on GitHub">
          <a
            href="https://github.com/alpyengine/openbank-price-prediction"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-primary underline underline-offset-2 hover:opacity-80"
          >
            View on GitHub →
          </a>
        </Row>
      </Section>
    </div>
  )
}

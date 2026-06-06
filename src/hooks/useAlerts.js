/**
 * useAlerts — price alert system for watchlisted tickers.
 *
 * Provides:
 *   alertConfig        — current user's alert configuration
 *   loadingConfig      — true while loading from Supabase
 *   saveConfig(cfg)    — persist alert config to Supabase
 *   checkAlerts(...)   — evaluate prices, fire notifications, send email
 *
 * Alert conditions (all configurable):
 *   on_exceeded — price exceeded target by more than hit margin
 *   on_hit      — price within ±hit margin of target
 *   on_close    — price within close threshold of target (but not hit)
 *   on_stop     — price dropped below base × (1 - stop_pct/100)
 *
 * Cooldown: alerts for the same ticker+horizon are suppressed for
 * cooldown_h hours (stored in alert_log, checked before sending).
 *
 * Usage:
 *   const { alertConfig, saveConfig, checkAlerts } = useAlerts()
 */
import { useState, useCallback, useEffect } from 'react'
import { isStorageConfigured } from '@/services/storage.js'
import { loadAlertConfig, saveAlertConfig, loadAlertLog, appendAlertLog } from '@/services/storage.js'
import { evaluatePrediction } from '@/utils/stocks.js'

// ── Default config ─────────────────────────────────────────────────────────────

export const DEFAULT_ALERT_CONFIG = {
  enabled:     true,
  email:       '',
  browser:     true,
  on_exceeded: true,
  on_hit:      true,
  on_close:    false,
  on_stop:     true,
  stop_pct:    10,
  cooldown_h:  24,
}

// ── Email HTML builder ─────────────────────────────────────────────────────────

/**
 * buildAlertEmailHtml — generates the HTML body for the alert email.
 * Matches the shadcn-inspired design shown in the mockup.
 *
 * @param {Object[]} alerts — array of triggered alert objects
 * @param {string}   batchDate — batch date string e.g. '02/06/2026'
 * @returns {string} HTML string for EmailJS {{{alert_body}}} template variable
 */
export function buildAlertEmailHtml(alerts) {
  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  const VERDICT_STYLES = {
    exceeded:  { bg: '#f0fdf4', border: '#bbf7d0', badgeBg: '#dcfce7', badgeColor: '#166534', label: 'Exceeded'  },
    hit:       { bg: '#f0fdf4', border: '#bbf7d0', badgeBg: '#dcfce7', badgeColor: '#166534', label: 'Hit'       },
    close:     { bg: '#fffbeb', border: '#fde68a', badgeBg: '#fef9c3', badgeColor: '#854d0e', label: 'Close'     },
    stop_loss: { bg: '#fef2f2', border: '#fecaca', badgeBg: '#fee2e2', badgeColor: '#991b1b', label: 'Stop loss' },
  }

  const rows = alerts.map(a => {
    const s  = VERDICT_STYLES[a.alertType] ?? VERDICT_STYLES.hit
    const distStr = a.distPct != null
      ? `${a.distPct >= 0 ? '+' : ''}${a.distPct.toFixed(1)}%`
      : ''
    return `
    <tr>
      <td style="padding:10px 16px;background:${s.bg};border-bottom:1px solid #f0f0f0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:14px;font-weight:600;color:#18181b">${a.ticker}</div>
              <div style="font-size:11px;color:#71717a;margin-top:2px">${a.company} · ${a.horizon} target</div>
            </td>
            <td align="right">
              <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:${s.badgeBg};color:${s.badgeColor}">${s.label}</span>
              <div style="font-size:11px;color:#71717a;margin-top:3px">
                $${a.price?.toFixed(2)} vs target <strong style="color:#18181b">$${a.target?.toFixed(2)}</strong> (${distStr})
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  return `
<div style="background:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;max-width:520px;margin:0 auto;overflow:hidden">

    <div style="padding:24px 28px 20px;border-bottom:1px solid #f0f0f0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="width:28px;height:28px;border-radius:6px;background:#18181b;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700">OB</div>
        <span style="font-size:13px;font-weight:600;color:#18181b">Openbank Price Prediction</span>
      </div>
      <div style="font-size:18px;font-weight:600;color:#18181b;margin-bottom:4px">
        Price alert — ${alerts.length} ticker${alerts.length !== 1 ? 's' : ''} triggered
      </div>
      <div style="font-size:13px;color:#71717a">${now} · Watchlist check</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${rows}
    </table>

    <div style="padding:12px 28px;border-top:1px solid #f0f0f0">
      <div style="font-size:11px;color:#71717a;text-align:right">
        ${alerts.length} of your watchlist tickers triggered
      </div>
    </div>

    <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center">
      <div style="font-size:11px;color:#a1a1aa">
        Sent by Openbank Price Prediction
      </div>
    </div>

  </div>
</div>`
}

// ── Browser notification ───────────────────────────────────────────────────────

/**
 * requestNotificationPermission — asks the browser for notification permission.
 * Safe to call multiple times — resolves immediately if already granted.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * sendBrowserNotification — fires a browser notification for a single alert.
 */
function sendBrowserNotification(alert) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const LABELS = {
    exceeded:  '📈 Target exceeded',
    hit:       '✅ Target hit',
    close:     '🟡 Close to target',
    stop_loss: '🔴 Stop loss triggered',
  }
  const title = `${LABELS[alert.alertType] ?? '🔔 Alert'} — ${alert.ticker}`
  const body  = `${alert.horizon} target $${alert.target?.toFixed(2)} · Current $${alert.price?.toFixed(2)}`
  new Notification(title, { body, icon: '/favicon.ico' })
}

// ── EmailJS sender ─────────────────────────────────────────────────────────────

/**
 * sendAlertEmail — sends alert email via EmailJS.
 * Loads the library on demand (same approach as EmailPreview).
 *
 * Requires EmailJS template with variable {{{alert_body}}} (triple braces for HTML).
 */
async function sendAlertEmail(alerts, toEmail) {
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  if (!serviceId || !templateId || !publicKey || !toEmail) return false

  try {
    if (!window.emailjs) {
      await new Promise((resolve, reject) => {
        const script  = document.createElement('script')
        script.src    = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
        script.onload = resolve; script.onerror = reject
        document.head.appendChild(script)
      })
      window.emailjs.init({ publicKey })
    }

    const htmlBody = buildAlertEmailHtml(alerts)
    await window.emailjs.send(serviceId, templateId, {
      to_email:   toEmail,
      report_date: new Date().toLocaleDateString('en-GB'),
      report_body: htmlBody,
      alert_body:  htmlBody,
    })
    return true
  } catch (err) {
    console.warn('[useAlerts] email send failed:', err?.text || err?.message)
    return false
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useAlerts() {
  const [alertConfig,   setAlertConfig]   = useState(DEFAULT_ALERT_CONFIG)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Load config from Supabase on mount
  useEffect(() => {
    if (!isStorageConfigured()) return
    setLoadingConfig(true)
    loadAlertConfig()
      .then(cfg => { if (cfg) setAlertConfig(cfg) })
      .finally(() => setLoadingConfig(false))
  }, [])

  // Persist config to Supabase
  const saveConfig = useCallback(async (cfg) => {
    const merged = { ...alertConfig, ...cfg }
    setAlertConfig(merged)
    await saveAlertConfig(merged)
  }, [alertConfig])

  /**
   * checkAlerts — evaluate all watchlisted tickers against their targets.
   * Called after every price fetch.
   *
   * @param {Object}   autoPrices  — { [ticker]: number } current prices
   * @param {Set}      watchlist   — Set<string> of watched tickers
   * @param {Object[]} batches     — all history batches
   * @param {number}   hitMargin   — current hit margin setting
   */
  const checkAlerts = useCallback(async (autoPrices, watchlist, batches, hitMargin = 5) => {
    if (!alertConfig.enabled) return
    if (!watchlist.size) return

    // Load recent alert log to enforce cooldown
    const recentLog = await loadAlertLog(alertConfig.cooldown_h)
    const recentKeys = new Set(recentLog.map(r => `${r.ticker}__${r.batch_id}__${r.horizon}`))

    const triggered = []

    for (const ticker of watchlist) {
      const price = autoPrices[ticker]
      if (price == null) continue

      // Find all batches containing this ticker
      const tickerBatches = batches.filter(b => b.results?.some(r => r.ticker === ticker))

      for (const batch of tickerBatches) {
        const results = batch.results.filter(r => r.ticker === ticker)

        for (const r of results) {
          if (r.verdict !== 'awaiting') continue  // already resolved

          const cooldownKey = `${ticker}__${batch.id}__${r.horizon}`
          if (recentKeys.has(cooldownKey)) continue  // within cooldown

          const { verdict } = evaluatePrediction(price, r.targetPrice, r.basePrice, hitMargin, { horizon: r.horizon })
          const distPct = (price - r.targetPrice) / r.targetPrice * 100

          // Check stop loss
          const stopThreshold = r.basePrice * (1 - alertConfig.stop_pct / 100)
          const isStop = price < stopThreshold

          let alertType = null
          if      (isStop                           && alertConfig.on_stop)     alertType = 'stop_loss'
          else if (verdict === 'exceeded'           && alertConfig.on_exceeded) alertType = 'exceeded'
          else if (verdict === 'hit'                && alertConfig.on_hit)      alertType = 'hit'
          else if (verdict === 'close'              && alertConfig.on_close)    alertType = 'close'

          if (!alertType) continue

          triggered.push({
            ticker,
            company:   r.company,
            horizon:   r.horizon,
            batchId:   batch.id,
            batchDate: batch.date,
            price,
            target:    r.targetPrice,
            base:      r.basePrice,
            distPct,
            alertType,
            verdict,
          })
        }
      }
    }

    if (!triggered.length) return

    // Browser notifications
    if (alertConfig.browser) {
      const granted = await requestNotificationPermission()
      if (granted) {
        triggered.forEach(a => sendBrowserNotification(a))
      }
    }

    // Email
    const emailTo = alertConfig.email?.trim()
    if (emailTo) {
      await sendAlertEmail(triggered, emailTo)
    }

    // Log alerts to Supabase (for cooldown tracking)
    await appendAlertLog(triggered)

    return triggered
  }, [alertConfig])

  return { alertConfig, loadingConfig, saveConfig, checkAlerts }
}

# Alerts & monitoring

This project emails a **health alert** when the automated price-fetching, or the
crons that drive it, stop behaving as expected. This page explains in plain terms
what can trigger an alert, what each one means, and what to do.

> These are **system-health** alerts (*is the backend running?*). They are **not**
> the in-app **price alerts** (*notify me when a stock hits a target*) — that is a
> separate feature (`alert_config` / `alert_log`, v7.4.4).

---

## How an alert reaches you

```
a problem is detected
        │
        ▼
notify_fetch_failure()  ──HTTP POST──►  EmailJS  ──►  email to alpyengine@gmail.com
```

- **`notify_fetch_failure()`** is the single email channel. It reads the EmailJS
  secrets from the Vault and POSTs to the EmailJS API. **Every** alert email,
  whatever its cause, goes out through this one function.
- The email subject is **"Supabase fetch failure: {function}"**, and the body shows
  `Function`, `Run date`, `Inserted`, `Failed`, and **`Failed tickers`** — the last
  one is the human-readable reason for the alert.

---

## Who raises alerts

### 1. The cron watchdog — `check_cron_health()` (job 9, Mon & Thu 07:00 UTC)

A scheduled function that verifies the backend is alive and the data is current.
It runs three checks; if any fails it emails you and logs to `fetch_log` /
`fetch_log_summary`.

| # | Check | Looks at | Fires when | Message in `Failed tickers` |
|---|---|---|---|---|
| 1 | **Stuck evaluations** | the data itself (`batches`) | a horizon stays `awaiting` **> 3 days** past its target date | `N horizontes awaiting vencidos hace >3d` |
| 2 | **Weekly fetch alive** | pg-cron run log (`cron.job_run_details`) | the weekly cron (`fetch-weekly-prices-edge` / `recovery-weekly-prices`) hasn't fired in **> 8 days** | `fetch-weekly-prices-edge sin ejecucion desde {date}` |
| 3 | **Expired fetch alive** | pg-cron run log | the expired cron (`fetch-expired-horizons-edge`) hasn't fired in **> 4 days** | `fetch-expired-horizons-edge sin ejecucion desde {date}` |

Check 1 watches the **outcome** (are predictions getting settled?). Checks 2 & 3
watch **liveness** (are the crons firing at all?) using pg-cron's own run history —
so they stay correct even in a quiet week with no expirations, when the function
runs but processes nothing.

> **History:** before v7.10.3, Checks 2 & 3 read `fetch_log_summary` for the *old*
> SQL function names. After the v7.9.0 migration those were paused, so the watchdog
> false-alarmed every Mon/Thu (`fetch_expired_horizons sin ejecucion desde …`) even
> though the new `_edge` functions were running fine. v7.10.3 switched them to read
> `cron.job_run_details` by `jobname`.

### 2. A fetch run that ends with failures

If a price-fetch run finishes with `failed > 0`, it can call `notify_fetch_failure`
directly with the list of tickers it couldn't price.

| Message | Means | What to do |
|---|---|---|
| a list of tickers (`Failed > 0`) | that run couldn't get prices for those tickers | look in `fetch_log` for the reason (e.g. `HTTP 429`, timeout) |

> **Note (post-v7.9.0):** the new **Edge Functions only *log* failures** to
> `fetch_log`; they do **not** send emails. So in practice this fetch-failure email
> only comes from the one SQL function still active — the weekly **recovery**
> (job 8). Day to day, the emails you receive are from the **watchdog** (#1).

---

## What to do when an alert arrives

1. **Confirm before worrying.** Most alerts are about *staleness*, not lost data.
2. Check the Edge Functions are running (they log under the `_edge` names):
   ```sql
   select function, max(run_date) as ultimo, count(*) as filas_7d
   from fetch_log
   where function in ('fetch_weekly_prices_edge', 'fetch_expired_horizons_edge')
     and run_date > current_date - 7
   group by function;
   ```
3. Check the crons are firing:
   ```sql
   select j.jobname, max(d.start_time) as ultima_corrida
   from cron.job j
   join cron.job_run_details d on d.jobid = j.jobid
   group by j.jobname
   order by j.jobname;
   ```
4. Ask the watchdog for its current verdict (safe to run by hand):
   ```sql
   select check_cron_health();
   select status, detail from fetch_log
   where function = 'check_cron_health' order by created_at desc limit 1;
   ```
   `inserted · all crons healthy` ⇒ everything is fine.
5. If Check 1 fired (stuck `awaiting`), see which horizons are overdue:
   ```sql
   select r->>'ticker' as ticker, r->>'targetDate' as fecha, r->>'horizon' as h
   from batches b, jsonb_array_elements(b.results) r
   where r->>'verdict' = 'awaiting'
     and to_date(r->>'targetDate','DD Mon YYYY') < current_date
   order by fecha;
   ```

---

## Reference

| Thing | Value |
|---|---|
| Email channel | `notify_fetch_failure()` → EmailJS template `emailjs_template_id_supabase` → `alpyengine@gmail.com` |
| Watchdog | `check_cron_health()` — job 9 `cron-health-check`, Mon & Thu 07:00 UTC |
| Weekly cron watched | job 10 `fetch-weekly-prices-edge` (Sat) + job 8 `recovery-weekly-prices` (Mon) |
| Expired cron watched | job 12 `fetch-expired-horizons-edge` (Tue–Sat) |
| Logs | `fetch_log` (per-ticker) · `fetch_log_summary` (per-run) |
| Thresholds | stuck evaluations > 3d · weekly liveness > 8d · expired liveness > 4d |
| Source | `supabase/sql/04_check_cron_health.sql` |

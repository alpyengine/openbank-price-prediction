# Openbank Price Prediction — Supabase UML Diagram

Complete entity-relationship and system architecture diagram for the Supabase backend.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    auth_users {
        uuid id PK
        text email
        timestamptz created_at
    }

    batches {
        text id PK
        text date
        timestamptz saved_at
        timestamptz updated_at
        jsonb results
        integer stocks
        integer hit_rate
        integer hit_rate_ext
        text direction
        jsonb market_data
        jsonb fundamentals
        jsonb horizon_status
    }

    price_cache {
        text ticker PK
        date target_date PK
        numeric close_price
        timestamptz fetched_at
        text source
    }

    weekly_prices {
        text ticker PK
        text batch_id PK
        integer week PK
        date week_date
        numeric close_price
    }

    profiles {
        uuid id PK
        text email
        text role
        timestamptz created_at
    }

    fundamentals_cache {
        text ticker PK
        text sector
        text industry
        numeric market_cap
        numeric beta
        numeric peg_ttm
        numeric net_margin_ttm
        numeric forward_pe
        timestamptz fetched_at
    }

    watchlist {
        uuid user_id PK
        text ticker PK
        timestamptz added_at
    }

    alert_config {
        uuid user_id PK
        boolean enabled
        text email
        boolean browser
        boolean on_exceeded
        boolean on_hit
        boolean on_close
        boolean on_stop
        numeric stop_pct
        integer cooldown_h
        timestamptz updated_at
    }

    alert_log {
        bigint id PK
        uuid user_id FK
        text ticker
        text batch_id
        text horizon
        text verdict
        numeric price
        numeric target
        timestamptz sent_at
    }

    auth_users ||--|| profiles : "triggers handle_new_user()"
    auth_users ||--o{ watchlist : "user_id"
    auth_users ||--o| alert_config : "user_id"
    auth_users ||--o{ alert_log : "user_id"
    batches ||--o{ weekly_prices : "batch_id"

    fetch_log {
        bigint id PK
        date run_date
        text function
        text ticker
        text status
        text detail
        timestamptz created_at
    }

    fetch_log_summary {
        bigint id PK
        date run_date
        text function
        integer inserted
        integer skipped
        integer failed
        numeric duration_s
        timestamptz created_at
    }
```

---

## System Architecture — Data Flow

```mermaid
flowchart TD
    CSV["`**CSV Import**
    Ticker, Company, Currency
    BasePrice, 1M, 3M, 6M, 12M
    Date`"]

    APP["`**React App**
    v7.9.0
    Vite + Tailwind + shadcn/ui`"]

    SUPABASE["`**Supabase**
    PostgreSQL + Auth
    pg_cron (per-minute triggers)`"]

    EDGE["`**Edge Functions** (v7.9.0)
    fetch-weekly-prices
    fetch-expired-horizons
    chunk ≤7 · ≤8 req/min`"]

    TD["`**Twelve Data API**
    US stock prices
    8 req/min free tier`"]

    AV["`**Alpha Vantage API**
    EU stock prices
    25 req/day free tier`"]

    YF["`**Yahoo Finance**
    EU weekly + historical prices
    No rate limit (server-side)`"]

    FINNHUB["`**Finnhub API**
    Fundamentals: PEG, beta
    net margin, growth`"]

    FMP["`**FMP API**
    Sector, industry
    market cap`"]

    GH["`**GitHub Repo**
    alpyengine/openbank-price-data
    Weekly JSON backup`"]

    EMAIL["`**EmailJS**
    Email reports + alerts
    Browser-side send`"]

    CSV -->|import| APP
    APP -->|save batch| SUPABASE
    APP -->|fetch live prices US| TD
    APP -->|fetch live prices EU| AV
    APP -->|fetch fundamentals| FINNHUB
    APP -->|fetch sector/industry| FMP
    APP -->|send report| EMAIL
    APP -->|send alert| EMAIL

    SUPABASE -->|"pg_cron → net.http_post (per minute)"| EDGE
    EDGE -->|expired + weekly · US| TD
    EDGE -->|expired + weekly · EU| YF
    SUPABASE -->|weekly backup| GH
```

---

## Cron Job Schedule

```mermaid
gantt
    title Supabase cron jobs — weekly schedule (UTC) · v7.9.0
    dateFormat HH:mm
    axisFormat %H:%M

    section Tue–Sat
    fetch-expired-horizons-edge (job 12, per min) :crit, 02:00, 120m

    section Saturday
    fetch-weekly-prices-edge (job 10, per min)    :active, 10:00, 120m

    section Sunday
    backup_to_github (job 6)                      :done, 23:00, 30m

    section Monday
    fetch_weekly_prices_recovery (job 8)          :crit, 06:00, 30m
```

> Jobs 10 & 12 fire **every minute** inside their window and trigger the Edge
> Function via `net.http_post`; each call handles a chunk of ≤7 and returns in
> seconds. The old SQL jobs 1 (`fetch_expired_horizons`) and 2 (`fetch_weekly_prices`)
> are **paused** since v7.9.0 (kept as fallback).

---

## Function Call Flow — fetch-expired-horizons (Edge Function · v7.9.0)

```mermaid
sequenceDiagram
    participant CRON as pg_cron (Tue–Sat 02:00–03:59, per min)
    participant EF as Edge fetch-expired-horizons
    participant RPC as SQL RPCs
    participant DB as batches / price_cache
    participant TD as Twelve Data
    participant YF as Yahoo Finance

    CRON->>EF: net.http_post (Authorization: service_role)
    EF->>RPC: get_pending_expired(7)
    RPC-->>EF: up to 7 (ticker, target_date, cached_close)
    loop for each pending (≤7)
        alt cached_close present
            note over EF: use cached price (no API call)
        else EU ticker (.DE/.AS/.PA/.L/.MC)
            EF->>YF: chart/TICKER?interval=1d&period1=(t-5d)&period2=t
            YF-->>EF: close (nearest trading day ≤ target)
        else US ticker
            EF->>TD: time_series?symbol&start=(t-5)&end=t&outputsize=5
            TD-->>EF: close (nearest trading day ≤ target)
        end
        EF->>RPC: save_expired_verdict(ticker, target_date, close)
        RPC->>DB: cache price + evaluate verdict + UPDATE batches.results
    end
    EF->>RPC: recalc_hit_rates()
    RPC->>DB: UPDATE hit_rate + hit_rate_ext for evaluated batches
    EF-->>CRON: { processed, updated, failed }
    note over CRON,EF: next minute resumes with the next ≤7 (idempotent)
```

---

## Function Call Flow — fetch-weekly-prices (Edge Function · v7.9.0)

```mermaid
sequenceDiagram
    participant CRON as pg_cron (Sat 10:00–11:59, per min)
    participant EF as Edge fetch-weekly-prices
    participant RPC as SQL RPCs
    participant WP as weekly_prices
    participant TD as Twelve Data
    participant YF as Yahoo Finance

    CRON->>EF: net.http_post (Authorization: service_role)
    EF->>RPC: get_pending_weekly_tickers(7)
    RPC-->>EF: up to 7 unique tickers missing this Friday
    EF->>EF: friday = computeFriday() (= current_weekly_friday)
    alt US tickers
        EF->>TD: time_series?symbol=A,B,C…&start=(fri-7)&end=fri (one BATCH call)
        TD-->>EF: per-symbol values — pick closest day ≤ friday<br/>(status:error / 429 → all stay pending)
    end
    loop for each EU ticker
        EF->>YF: chart/TICKER?interval=1d&period1=(fri-5d)&period2=(fri+1d)
        YF-->>EF: close (closest day ≤ friday)
    end
    loop for each ticker with a price
        EF->>RPC: save_weekly_price(ticker, close)
        RPC->>WP: fan-out — INSERT into every batch (week_num per batch)
    end
    EF-->>CRON: { processed, inserted, failed, friday }
    note over CRON,EF: next minute resumes with the next ≤7 (idempotent)
```

## Function Call Flow — fetch_weekly_prices_recovery()

> Still a **SQL** function (job 8, active). Kept as a Monday safety net. With the
> v7.9.0 weekly Edge Function self-resuming across the Saturday window it's largely
> redundant, but it stays as a cheap fallback.

```mermaid
sequenceDiagram
    participant CRON as pg_cron (Mon 06:00 UTC)
    participant FN as fetch_weekly_prices_recovery()
    participant DB as batches table
    participant WP as weekly_prices
    participant LOG as fetch_log / fetch_log_summary
    participant TD as Twelve Data
    participant YF as Yahoo Finance

    CRON->>FN: execute every Monday
    FN->>FN: friday = last week's Friday (Saturday run target)
    FN->>DB: SELECT distinct tickers WHERE missing weekly_prices row for friday
    note over FN: Only tickers that SHOULD have a row<br/>(batch old enough) but DON'T
    loop for each missing ticker
        alt EU ticker
            FN->>YF: GET chart/TICKER?interval=1d&period1=(fri-5d)&period2=(fri+1d)
            YF-->>FN: closest day <= friday
        else US ticker
            FN->>TD: GET time_series?start=(fri-7)&end=fri&outputsize=10
            TD-->>FN: closest day <= friday
        end
        alt price obtained
            loop for each batch missing this ticker+friday
                FN->>WP: INSERT recovered row
                FN->>LOG: INSERT fetch_log status=inserted detail=RECOVERED...
            end
        else no price
            FN->>LOG: INSERT fetch_log status=failed
        end
        FN->>FN: pg_sleep(2)
    end
    FN->>LOG: INSERT fetch_log_summary (inserted, skipped, failed, duration_s)
```

---

## Row Level Security — Access Matrix

```mermaid
graph LR
    subgraph AUTH["Authenticated Users (all)"]
        B_R["batches — read ✅"]
        B_W["batches — write ✅"]
        PC_R["price_cache — read ✅"]
        WP_R["weekly_prices — read ✅"]
        F_R["fundamentals_cache — read ✅"]
        F_W["fundamentals_cache — write ✅"]
    end

    subgraph OWN["Per-user (own rows only)"]
        P_OWN["profiles — own row ✅"]
        WL_S["watchlist — select own ✅"]
        WL_I["watchlist — insert own ✅"]
        WL_D["watchlist — delete own ✅"]
        AC_OWN["alert_config — own row ✅"]
        AL_OWN["alert_log — own rows ✅"]
    end

    subgraph CRON["Security Definer (cron only)"]
        PC_W["price_cache — write"]
        WP_W["weekly_prices — write"]
    end
```

---

## Verdict Evaluation Logic

```mermaid
flowchart TD
    START([close_price available?]) -->|no| SKIP[skip — no update]
    START -->|yes| DIR{target direction}

    DIR -->|bullish target > base| BUL[bullish path]
    DIR -->|bearish target < base| BEA[bearish path]
    DIR -->|target = base| FLAT[flat path]

    BUL --> B1{price > target × 1+margin%?}
    B1 -->|yes| EXCEEDED[exceeded ✅]
    B1 -->|no| B2{abs dist ≤ margin%?}
    B2 -->|yes| HIT[hit ✅]
    B2 -->|no| B3{price < target AND dist ≤ close threshold?}
    B3 -->|yes| CLOSE[close 🟡]
    B3 -->|no| B4{price < base?}
    B4 -->|yes| WRONG[wrong_way 🔴]
    B4 -->|no| MISS[miss ❌]

    BEA --> BE1{price < target × 1-margin%?}
    BE1 -->|yes| EXCEEDED
    BE1 -->|no| BE2{abs dist ≤ margin%?}
    BE2 -->|yes| HIT
    BE2 -->|no| BE3{price > target AND dist ≤ close threshold?}
    BE3 -->|yes| CLOSE
    BE3 -->|no| BE4{price > base?}
    BE4 -->|yes| WRONG
    BE4 -->|no| MISS

    FLAT --> F1{abs dist ≤ margin%?}
    F1 -->|yes| HIT
    F1 -->|no| MISS
```

---

## Hit Margin Parameters by Horizon

```mermaid
graph LR
    subgraph PARAMS["Verdict parameters by horizon"]
        H1M["1M\nhit ±3%\nclose ±6%"]
        H3M["3M\nhit ±5%\nclose ±10%"]
        H6M["6M\nhit ±7%\nclose ±12.6%"]
        H12M["12M\nhit ±10%\nclose ±16%"]
    end
```

---

*Generated from `docs/supabase_setup.sql` + `supabase/` (Edge Functions & RPCs) · v7.9.0 · June 2026*

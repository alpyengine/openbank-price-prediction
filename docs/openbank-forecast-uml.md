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
    v7.5.0
    Vite + Tailwind + shadcn/ui`"]

    SUPABASE["`**Supabase**
    PostgreSQL + Auth + pg_cron`"]

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

    SUPABASE -->|fetch expired horizons US| TD
    SUPABASE -->|fetch expired horizons EU| YF
    SUPABASE -->|fetch weekly prices US| TD
    SUPABASE -->|fetch weekly prices EU| YF
    SUPABASE -->|weekly backup| GH
```

---

## Cron Job Schedule

```mermaid
gantt
    title Supabase cron jobs — weekly schedule (UTC)
    dateFormat HH:mm
    axisFormat %H:%M

    section Tuesday–Saturday
    fetch_expired_horizons() :crit, 02:00, 30m

    section Saturday
    fetch_weekly_prices()    :active, 10:00, 60m

    section Sunday
    backup_to_github()       :done, 23:00, 30m
```

---

## Function Call Flow — fetch_expired_horizons()

```mermaid
sequenceDiagram
    participant CRON as pg_cron (02:00 UTC)
    participant FN as fetch_expired_horizons()
    participant DB as batches table
    participant PC as price_cache
    participant TD as Twelve Data
    participant YF as Yahoo Finance

    CRON->>FN: execute daily (Tue–Sat)
    FN->>DB: SELECT awaiting predictions where targetDate <= today
    loop for each expired prediction
        FN->>PC: check price_cache (ticker, targetDate)
        alt cache hit
            PC-->>FN: return cached close_price
        else EU ticker (.DE/.AS/.PA/.L/.MC)
            FN->>YF: GET /v8/finance/chart/TICKER?interval=1d&period1=X&period2=Y
            YF-->>FN: return close_price (nearest trading day ±3 days)
            FN->>PC: INSERT into price_cache
        else US ticker
            FN->>TD: GET /eod?symbol=TICKER&date=targetDate
            TD-->>FN: return close_price
            FN->>PC: INSERT into price_cache
        end
        FN->>FN: evaluate verdict (exceeded/hit/close/wrong_way/miss)
        FN->>DB: UPDATE batches.results (verdict + priceOnDate)
        FN->>FN: pg_sleep(8) — rate limit pause
    end
    FN->>DB: UPDATE hit_rate + hit_rate_ext for all affected batches
```

---

## Function Call Flow — fetch_weekly_prices()

```mermaid
sequenceDiagram
    participant CRON as pg_cron (Sat 10:00 UTC)
    participant FN as fetch_weekly_prices()
    participant DB as batches table
    participant WP as weekly_prices
    participant TD as Twelve Data
    participant YF as Yahoo Finance

    CRON->>FN: execute every Saturday
    FN->>FN: calculate last Friday date
    FN->>DB: SELECT distinct tickers from all batches (horizon=1M)
    loop for each ticker × batch
        FN->>FN: week_num = (friday - base_date) / 7
        alt week_num <= 0 or > 52
            FN->>FN: skip (out of range)
        else already exists
            FN->>WP: check if (ticker, batch_id, week) exists
            WP-->>FN: exists → skip
        else EU ticker (.DE/.AS/.PA/.L/.MC)
            FN->>YF: GET /v8/finance/chart/TICKER?interval=1wk&range=1wk
            YF-->>FN: return weekly close_price
            FN->>WP: INSERT (ticker, batch_id, week, week_date, close_price)
        else US ticker
            FN->>TD: GET /eod?symbol=TICKER&date=friday
            TD-->>FN: return close_price
            FN->>WP: INSERT (ticker, batch_id, week, week_date, close_price)
        end
        FN->>FN: pg_sleep(8) — rate limit pause
    end
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

*Generated from `docs/supabase_setup.sql` · v7.5.0 · June 2026*

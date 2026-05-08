# Openbank Price Check — React Edition

## Structure

```
openbank_react/
  backend/
    run.py              # Python server (yfinance / stooq price fetching)
  src/
    components/
      Header.jsx
      ServerWarn.jsx
      FetchBar.jsx
      SummaryCards.jsx
      HorizonTabs.jsx
      StockTable.jsx
      StockRow.jsx        # memo — no unnecessary rerenders
      ImportBox.jsx
      EmailPreview.jsx
    hooks/
      useServerHealth.js  # polls /health with retries
      usePriceFetch.js    # fetches /prices with timeout + error classification
    utils/
      dates.js            # date helpers
      stocks.js           # price/target logic
    styles/
      global.css          # CSS tokens + reset
    App.jsx               # root — all state lives here
    main.jsx
  index.html
  vite.config.js          # proxies /api -> localhost:8765
  package.json
```

## Install (once)

```bash
# 1. Frontend dependencies
cd openbank_react
npm install

# 2. Python dependencies
pip install requests yfinance
```

## Run (every time)

Open two terminals:

**Terminal 1 — Python backend:**
```bash
cd openbank_react/backend
python run.py
# Server starts at http://localhost:8765
```

**Terminal 2 — React frontend:**
```bash
cd openbank_react
npm run dev
# Vite starts at http://localhost:5173
```

Open http://localhost:5173 in Chrome.

## How it works

- Vite proxies all `/api/*` requests to `http://localhost:8765`
  so the browser never calls the Python server directly — no CORS issues
- Price fetch: yfinance first, stooq fallback
- StockRow uses React.memo — only rerenders the rows that actually changed
- Override inputs fire onBlur/Enter only — no focus loss on typing
- All state lives in App.jsx, passed down as props — easy to debug

## Build for production

```bash
npm run build
# Output in dist/ — serve with any static server
```

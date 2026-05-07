# -*- coding: utf-8 -*-
# Openbank Price Check - local server
# Usage:  python run.py
# Open:   http://localhost:8765/openbank_price_check.html
# Needs:  pip install requests

import json
import os
import sys
import threading
import time

PY2 = sys.version_info[0] == 2
if PY2:
    from urlparse import urlparse, parse_qs
    from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler as _Base
else:
    from urllib.parse import urlparse, parse_qs
    from http.server import HTTPServer, BaseHTTPRequestHandler as _Base

PORT = 8765
SERVE_DIR = os.path.dirname(os.path.abspath(__file__))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm":  "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ico":  "image/x-icon",
    ".png":  "image/png",
    ".svg":  "image/svg+xml",
}

# ---------------------------------------------------------------------------
# Source 1: yfinance with session cookie fix
# ---------------------------------------------------------------------------
def fetch_yfinance(ticker):
    try:
        import yfinance as yf
        # Use a requests session to pass cookies -- avoids rate limit on newer yf
        try:
            import requests
            session = requests.Session()
            session.headers.update({
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0 Safari/537.36"
                ),
                "Accept": "application/json",
            })
            # Prime cookies
            session.get("https://finance.yahoo.com", timeout=8)
            t = yf.Ticker(ticker, session=session)
        except Exception:
            t = yf.Ticker(ticker)

        hist = t.history(period="5d", auto_adjust=True)
        if hist is None or hist.empty:
            return None, "yfinance: no data"

        for i in range(len(hist) - 1, -1, -1):
            val = hist["Close"].iloc[i]
            if val == val and val is not None:
                return round(float(val), 4), str(hist.index[i].date())
        return None, "yfinance: all closes null"

    except ImportError:
        return None, "yfinance not installed"
    except Exception as e:
        msg = str(e)
        if "Too Many Requests" in msg or "Rate" in msg:
            return None, "yfinance: rate limited by Yahoo"
        return None, "yfinance: " + msg


# ---------------------------------------------------------------------------
# Source 2: stooq.com -- free, no auth, reliable, no rate limiting
# Supports: NYSE/NASDAQ tickers as TICKER.US, European as TICKER.DE etc.
# ---------------------------------------------------------------------------
def fetch_stooq(ticker, currency="USD"):
    try:
        import requests

        # Map currency to stooq suffix
        suffix_map = {
            "USD": "us", "EUR": "de", "GBP": "uk",
            "CHF": "ch", "SEK": "se", "NOK": "no",
        }
        suffix = suffix_map.get(currency.upper(), "us")
        symbol = "{}.{}".format(ticker.lower(), suffix)
        url = "https://stooq.com/q/l/?s={}&f=sd2t2ohlcv&h&e=json".format(symbol)

        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        })
        if resp.status_code != 200:
            return None, "stooq: HTTP {}".format(resp.status_code)

        data = resp.json()
        syms = data.get("symbols", [])
        if not syms:
            return None, "stooq: empty response"

        row = syms[0]
        close = row.get("Close") or row.get("close")
        if close in (None, "N/D", ""):
            return None, "stooq: no close value (market may be closed)"

        return round(float(close), 4), str(row.get("Date", ""))

    except ImportError:
        return None, "requests not installed"
    except Exception as e:
        return None, "stooq: " + str(e)


# ---------------------------------------------------------------------------
# Source 3: Alpha Vantage (requires free API key -- user provides it)
# ---------------------------------------------------------------------------
AV_KEY = os.environ.get("AV_KEY", "")

def fetch_alphavantage(ticker):
    if not AV_KEY:
        return None, "alphavantage: no AV_KEY env var set"
    try:
        import requests
        url = (
            "https://www.alphavantage.co/query"
            "?function=GLOBAL_QUOTE&symbol={}&apikey={}"
        ).format(ticker, AV_KEY)
        resp = requests.get(url, timeout=10)
        data = resp.json()
        gq = data.get("Global Quote", {})
        price = gq.get("05. price")
        if not price:
            return None, "alphavantage: no price in response"
        return round(float(price), 4), gq.get("07. latest trading day", "")
    except Exception as e:
        return None, "alphavantage: " + str(e)


# ---------------------------------------------------------------------------
# Main fetch: try each source in order, return first success
# ---------------------------------------------------------------------------
def fetch_prev_close(ticker, currency="USD"):
    sources = [
        ("yfinance",     lambda: fetch_yfinance(ticker)),
        ("stooq",        lambda: fetch_stooq(ticker, currency)),
        ("alphavantage", lambda: fetch_alphavantage(ticker)),
    ]
    errors = []
    for name, fn in sources:
        try:
            price, meta = fn()
            if price is not None:
                sys.stdout.write("    [{}] OK = {}\n".format(name, price))
                sys.stdout.flush()
                return {
                    "ticker":  ticker,
                    "price":   price,
                    "date":    meta,
                    "source":  name,
                }
            else:
                sys.stdout.write("    [{}] {}\n".format(name, meta))
                sys.stdout.flush()
                errors.append("{}: {}".format(name, meta))
        except Exception as e:
            errors.append("{}: {}".format(name, str(e)))

    return {
        "ticker": ticker,
        "error":  " | ".join(errors),
        "price":  None,
    }


def fetch_all(tickers, currencies):
    results = {}
    for tk in tickers:
        cur = currencies.get(tk, "USD")
        sys.stdout.write("  Fetching {} ({})...\n".format(tk, cur))
        sys.stdout.flush()
        results[tk] = fetch_prev_close(tk, cur)
        time.sleep(0.3)  # small delay between tickers to avoid rate limits
    return results


# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------
class Handler(_Base):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # /health
        if parsed.path == "/health":
            try:
                import requests
                req_ok = True
            except ImportError:
                req_ok = False
            try:
                import yfinance
                yf_ok = True
            except ImportError:
                yf_ok = False
            self._json({
                "status":   "ok",
                "port":     PORT,
                "yfinance": yf_ok,
                "requests": req_ok,
                "sources":  ["yfinance", "stooq", "alphavantage"],
                "av_key":   bool(AV_KEY),
            })
            return

        # /prices?tickers=TER,HWM&currencies=USD,USD
        if parsed.path == "/prices":
            params = parse_qs(parsed.query)
            raw_t = params.get("tickers", [""])[0]
            raw_c = params.get("currencies", [""])[0]

            tickers = [x.strip().upper() for x in raw_t.split(",") if x.strip()]
            cur_list = [x.strip().upper() for x in raw_c.split(",") if x.strip()]

            if not tickers:
                self._json({"error": "no tickers provided"}, 400)
                return

            # Build currency map -- pad with USD if not enough values
            currencies = {}
            for i, tk in enumerate(tickers):
                currencies[tk] = cur_list[i] if i < len(cur_list) else "USD"

            results = fetch_all(tickers, currencies)
            self._json(results)
            return

        # Static files
        path = parsed.path.lstrip("/") or "openbank_price_check.html"
        filepath = os.path.normpath(os.path.join(SERVE_DIR, path))
        if not filepath.startswith(SERVE_DIR):
            self.send_response(403)
            self.end_headers()
            return
        if not os.path.isfile(filepath):
            self.send_response(404)
            self.end_headers()
            return

        ext = os.path.splitext(filepath)[1].lower()
        ctype = MIME.get(ext, "application/octet-stream")
        with open(filepath, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        msg = fmt % args
        if "/health" in msg or "/prices" in msg:
            return
        sys.stdout.write("[server] " + msg + "\n")
        sys.stdout.flush()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Check requests is installed
    try:
        import requests
    except ImportError:
        sys.stdout.write("Installing requests...\n")
        sys.stdout.flush()
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])

    try:
        server = HTTPServer(("localhost", PORT), Handler)
    except OSError as e:
        msg = str(e)
        if "Address already in use" in msg or "10048" in msg:
            sys.stdout.write("\nERROR: Port {} already in use. Stop the other process.\n\n".format(PORT))
        else:
            sys.stdout.write("\nERROR: " + msg + "\n\n")
        sys.exit(1)

    url = "http://localhost:{}/openbank_price_check.html".format(PORT)

    sys.stdout.write("\n")
    sys.stdout.write("  Openbank Price Check\n")
    sys.stdout.write("  URL: " + url + "\n")
    sys.stdout.write("  Price sources: yfinance -> stooq -> alphavantage\n")
    if AV_KEY:
        sys.stdout.write("  Alpha Vantage key: set\n")
    else:
        sys.stdout.write("  Tip: set AV_KEY=yourkey env var to enable Alpha Vantage fallback\n")
    sys.stdout.write("  Ctrl+C to stop\n\n")
    sys.stdout.flush()

    try:
        import webbrowser
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write("\n  Stopped.\n")
        sys.stdout.flush()

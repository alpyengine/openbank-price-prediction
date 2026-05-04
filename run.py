# -*- coding: utf-8 -*-
# Openbank Price Check - local server
# Usage:  python run.py
# Open:   http://localhost:8765/openbank_price_check.html
# Needs:  pip install yfinance

import json
import os
import sys
import threading

# -- Python 2 / 3 compatibility ------------------------------------------------
PY2 = sys.version_info[0] == 2

if PY2:
    from urlparse import urlparse, parse_qs
    from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler as _Base
    string_types = (str, unicode)
else:
    from urllib.parse import urlparse, parse_qs
    from http.server import HTTPServer, BaseHTTPRequestHandler as _Base
    string_types = (str,)

# -- yfinance check ------------------------------------------------------------
try:
    import yfinance as yf
    YF_OK = True
except ImportError:
    YF_OK = False
    sys.stdout.write("yfinance not installed. Run: pip install yfinance\n")
    sys.stdout.flush()

# -- MIME types ----------------------------------------------------------------
MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm":  "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png":  "image/png",
    ".ico":  "image/x-icon",
    ".svg":  "image/svg+xml",
}

SERVE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8765


# -- Price fetching -------------------------------------------------------------
def fetch_prev_close(ticker):
    """
    Fetch the most recent closing price for ticker via yfinance.
    Always returns a dict  never raises.
    """
    if not YF_OK:
        return {"ticker": ticker, "error": "yfinance not installed"}

    if not ticker or not isinstance(ticker, string_types):
        return {"ticker": str(ticker), "error": "invalid ticker"}

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="5d", auto_adjust=True)

        if hist is None or hist.empty:
            return {"ticker": ticker, "error": "no data returned (check ticker symbol)"}

        # Walk back to find the last non-null close
        closes = hist["Close"]
        price = None
        date_str = None
        for i in range(len(closes) - 1, -1, -1):
            val = closes.iloc[i]
            if val is not None and val == val:  # not NaN
                price = round(float(val), 4)
                date_str = str(hist.index[i].date())
                break

        if price is None:
            return {"ticker": ticker, "error": "all close values are null"}

        return {"ticker": ticker, "price": price, "date": date_str}

    except Exception as e:
        # Serialize the exception safely  some yfinance errors contain
        # non-serialisable objects
        err_msg = str(e)
        if not err_msg:
            err_msg = type(e).__name__
        return {"ticker": ticker, "error": err_msg}


def fetch_all(tickers):
    """Fetch a list of tickers. Returns dict keyed by ticker."""
    results = {}
    for tk in tickers:
        clean = tk.strip().upper()
        sys.stdout.write("  Fetching " + clean + "...")
        sys.stdout.flush()
        result = fetch_prev_close(clean)
        results[clean] = result
        px = result.get("price")
        if px is not None:
            sys.stdout.write(" OK = " + str(px) + "\n")
        else:
            sys.stdout.write(" FAIL: " + str(result.get("error", "unknown")) + "\n")
        sys.stdout.flush()
    return results


# -- HTTP Handler --------------------------------------------------------------
class Handler(_Base):

    def do_OPTIONS(self):
        """Pre-flight CORS  needed by some browsers even on localhost."""
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # -- /health ------------------------------------------------------------
        if parsed.path == "/health":
            self._json({"status": "ok", "yfinance": YF_OK, "port": PORT})
            return

        # -- /prices?tickers=TER,HWM,NEM ---------------------------------------
        if parsed.path == "/prices":
            params = parse_qs(parsed.query)
            raw = params.get("tickers", [""])[0]
            tickers = [x.strip().upper() for x in raw.split(",") if x.strip()]

            if not tickers:
                self._json({"error": "no tickers provided"}, 400)
                return

            if not YF_OK:
                self._json({"error": "yfinance not installed  run: pip install yfinance"}, 503)
                return

            results = fetch_all(tickers)
            self._json(results)
            return

        # -- Static files -------------------------------------------------------
        path = parsed.path.lstrip("/") or "openbank_price_check.html"

        # Security: prevent path traversal
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
        # Suppress health/price polling noise
        if "/health" in msg or "/prices" in msg:
            return
        sys.stdout.write("[server] " + msg + "\n")
        sys.stdout.flush()


# -- Main ----------------------------------------------------------------------
if __name__ == "__main__":
    # Try binding; give a clear error if port is in use
    try:
        server = HTTPServer(("localhost", PORT), Handler)
    except OSError as e:
        if "Address already in use" in str(e) or "10048" in str(e):
            sys.stdout.write("\nERROR: Port " + str(PORT) + " is already in use.\n")
            sys.stdout.write("Stop the other process or change PORT in run.py\n\n")
        else:
            sys.stdout.write("\nERROR starting server: " + str(e) + "\n\n")
        sys.exit(1)

    url = "http://localhost:" + str(PORT) + "/openbank_price_check.html"

    sys.stdout.write("\n")
    sys.stdout.write("  Openbank Price Check\n")
    sys.stdout.write("  URL:     " + url + "\n")
    sys.stdout.write("  yfinance installed: " + str(YF_OK) + "\n")
    if not YF_OK:
        sys.stdout.write("  WARNING: run 'pip install yfinance' to enable price fetch\n")
    sys.stdout.write("  Ctrl+C to stop\n\n")
    sys.stdout.flush()

    # Auto-open browser after short delay
    try:
        import webbrowser
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write("\n  Server stopped.\n")
        sys.stdout.flush()

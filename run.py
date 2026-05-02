# -*- coding: utf-8 -*-
# Openbank Price Check - local server
# Usage:  python run.py
# Then open:  http://localhost:8765/openbank_price_check.html
# Requires:   pip install yfinance

import json
import os
import sys
import threading

PY2 = sys.version_info[0] == 2

if PY2:
    from urlparse import urlparse, parse_qs
    from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler as _Base
else:
    from urllib.parse import urlparse, parse_qs
    from http.server import HTTPServer, BaseHTTPRequestHandler as _Base

try:
    import yfinance as yf
except ImportError:
    print("Installing yfinance...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yfinance", "-q"])
    import yfinance as yf


def fetch_prev_close(ticker):
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist.empty:
            return {"ticker": ticker, "error": "no data"}
        price = round(float(hist["Close"].iloc[-1]), 4)
        date_str = str(hist.index[-1].date())
        return {"ticker": ticker, "price": price, "date": date_str}
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


SERVE_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(_Base):

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/prices":
            params = parse_qs(parsed.query)
            raw = params.get("tickers", [""])[0]
            tickers = [x.strip().upper() for x in raw.split(",") if x.strip()]
            if not tickers:
                self._json({"error": "no tickers"}, 400)
                return
            results = {}
            for tk in tickers:
                sys.stdout.write("  Fetching " + tk + "...\n")
                sys.stdout.flush()
                results[tk] = fetch_prev_close(tk)
                px = results[tk].get("price")
                if px:
                    sys.stdout.write("  OK " + tk + " = " + str(px) + "\n")
                else:
                    sys.stdout.write("  FAIL " + tk + ": " + str(results[tk].get("error", "?")) + "\n")
                sys.stdout.flush()
            self._json(results)
            return

        if parsed.path == "/health":
            self._json({"status": "ok"})
            return

        # Static file serving
        path = parsed.path.lstrip("/") or "openbank_price_check.html"
        filepath = os.path.join(SERVE_DIR, path)
        if not os.path.isfile(filepath):
            self.send_response(404)
            self.end_headers()
            return
        with open(filepath, "rb") as f:
            data = f.read()
        ctype = "text/html" if path.endswith(".html") else "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        msg = fmt % args
        if "/health" not in msg and "/prices" not in msg:
            sys.stdout.write("[server] " + msg + "\n")
            sys.stdout.flush()


PORT = 8765

if __name__ == "__main__":
    server = HTTPServer(("localhost", PORT), Handler)
    url = "http://localhost:" + str(PORT) + "/openbank_price_check.html"
    sys.stdout.write("\n  Openbank Price Check\n")
    sys.stdout.write("  Open: " + url + "\n")
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

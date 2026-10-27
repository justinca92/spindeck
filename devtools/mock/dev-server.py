"""Serves the mock and bridges the plugin's backend calls to the real main.py.

    python dev-server.py [--port 5190] [--data .dev-data]

GET  /              the mock (index.html, steam.css, out/*.js)
POST /api/<method>  runs Plugin.<method>(*json_args) from ../../main.py
POST /dev/reset     deletes the saved settings (dev only)
GET  /health        "ok" (for Playwright's webServer)

Settings live in <data>/settings instead of Decky's folder. Only requests from
this server's own page (localhost) are accepted, so other sites open in your
browser can't drive it. Standard library only.
"""

import argparse
import asyncio
import json
import logging
import os
import shutil
import sys
import types
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

args = argparse.ArgumentParser()
args.add_argument("--port", type=int, default=5190)
args.add_argument("--data", default=os.path.join(HERE, ".dev-data"))
opts = args.parse_args()
DATA = os.path.abspath(opts.data)
SETTINGS_DIR = os.path.join(DATA, "settings")
os.makedirs(SETTINGS_DIR, exist_ok=True)

# The `decky` module Decky Loader injects into plugin backends.
decky = types.ModuleType("decky")
decky.DECKY_PLUGIN_SETTINGS_DIR = SETTINGS_DIR
decky.DECKY_PLUGIN_DIR = ROOT
decky.DECKY_HOME = DATA
decky.logger = logging.getLogger("spindeck")
sys.modules["decky"] = decky
logging.basicConfig(level=logging.INFO, format="[backend] %(message)s")
sys.path.insert(0, ROOT)
import main  # noqa: E402  (needs the fake decky module first)

plugin = main.Plugin()
loop = asyncio.new_event_loop()
loop.run_until_complete(plugin._main())
ALLOWED_ORIGINS = {f"http://localhost:{opts.port}", f"http://127.0.0.1:{opts.port}"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *a):
        if not self.path.startswith(("/out/", "/steam.css", "/health")):
            super().log_message(fmt, *a)

    def guess_type(self, path):
        return "text/javascript" if path.endswith(".js") else super().guess_type(path)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, "ok", "text/plain")
        if self.path.startswith("/.dev-data") or ".." in self.path:
            return self._send(404, "not found", "text/plain")
        return super().do_GET()

    def do_POST(self):
        origin = self.headers.get("Origin")
        if origin not in ALLOWED_ORIGINS:
            return self._json(403, {"error": "only the mock page may call the backend"})
        if self.path == "/dev/reset":
            shutil.rmtree(SETTINGS_DIR, ignore_errors=True)
            os.makedirs(SETTINGS_DIR, exist_ok=True)
            return self._json(200, {"result": True})
        if not self.path.startswith("/api/"):
            return self._json(404, {"error": "unknown route"})
        name = self.path[len("/api/"):]
        method = getattr(plugin, name, None)
        # Only the plugin's public backend methods, like Decky's callable().
        if name.startswith("_") or not callable(method):
            return self._json(404, {"error": f"no backend method {name}"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            call_args = json.loads(self.rfile.read(length) or b"[]")
            if not isinstance(call_args, list):
                raise ValueError("arguments must be a JSON array")
            result = asyncio.run_coroutine_threadsafe(method(*call_args), loop).result(timeout=10)
            return self._json(200, {"result": result})
        except Exception as e:  # report to the page, like Decky does
            decky.logger.error(f"{name} failed: {e}")
            return self._json(500, {"error": str(e)})

    def _json(self, code, body):
        self._send(code, json.dumps(body), "application/json")

    def _send(self, code, text, ctype):
        data = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    import threading

    threading.Thread(target=loop.run_forever, daemon=True).start()
    print(f"Spindeck mock: http://localhost:{opts.port}  (settings in {SETTINGS_DIR})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", opts.port), Handler).serve_forever()

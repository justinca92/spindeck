#!/usr/bin/env python3
"""Record Steam UI errors (console errors + uncaught exceptions, with stacks)
from the Steam Deck's CEF debugger into ~/spindeck-errors.log.

Steam's UI runs in CEF; Decky keeps its remote debugging port (8080) open.
This connects to the SharedJSContext tab (and the Big Picture tabs), and keeps
reconnecting while Steam restarts, so it can be started in Desktop Mode and
keep logging after "Return to Gaming Mode":

    systemd-run --user --unit=spindeck-cef python3 ~/cef-errors.py
    ...switch to Gaming Mode, reproduce the error, come back...
    systemctl --user stop spindeck-cef
    # then send ~/spindeck-errors.log

Standard library only (SteamOS has no websocket module). Reads only; it never
sends anything but "enable" commands to the debugger.
"""
import base64
import json
import os
import socket
import struct
import sys
import time
import urllib.request

PORT = int(os.environ.get("CEF_PORT", "8080"))
HOST = os.environ.get("CEF_HOST", "127.0.0.1")
LOG = os.path.expanduser(os.environ.get("CEF_LOG", "~/spindeck-errors.log"))
RUN_FOR_S = int(os.environ.get("CEF_RUN_FOR", str(30 * 60)))
WANT = ("SharedJSContext", "Steam Big Picture Mode", "QuickAccess", "MainMenu")


def log(line):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(time.strftime("%H:%M:%S ") + line + "\n")


def targets():
    with urllib.request.urlopen(f"http://{HOST}:{PORT}/json", timeout=3) as r:
        return [t for t in json.load(r) if t.get("webSocketDebuggerUrl") and any(w in t.get("title", "") for w in WANT)]


class WS:
    def __init__(self, url):
        rest = url.split("://", 1)[1]
        hostport, path = rest.split("/", 1)
        host, port = hostport.rsplit(":", 1)
        self.s = socket.create_connection((host, int(port)), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(
            f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n".encode()
        )
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.s.recv(1)
            if not chunk:
                raise ConnectionError("handshake closed")
            head += chunk
        if b" 101 " not in head.split(b"\r\n", 1)[0]:
            raise ConnectionError(head.split(b"\r\n", 1)[0].decode(errors="replace"))
        self.s.setblocking(False)
        self.buf = b""

    def send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytes([0x81])
        n = len(data)
        if n < 126:
            hdr += bytes([0x80 | n])
        elif n < 65536:
            hdr += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            hdr += bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        self.s.setblocking(True)
        self.s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        self.s.setblocking(False)

    def messages(self):
        """Complete text messages received so far (non-blocking)."""
        try:
            while True:
                chunk = self.s.recv(65536)
                if not chunk:
                    raise ConnectionError("closed")
                self.buf += chunk
        except BlockingIOError:
            pass
        out, frag = [], getattr(self, "frag", b"")
        while len(self.buf) >= 2:
            b0, b1 = self.buf[0], self.buf[1]
            n, off = b1 & 0x7F, 2
            if n == 126:
                if len(self.buf) < 4:
                    break
                n, off = struct.unpack(">H", self.buf[2:4])[0], 4
            elif n == 127:
                if len(self.buf) < 10:
                    break
                n, off = struct.unpack(">Q", self.buf[2:10])[0], 10
            if len(self.buf) < off + n:
                break
            payload, self.buf = self.buf[off : off + n], self.buf[off + n :]
            op = b0 & 0x0F
            if op == 8:
                raise ConnectionError("closed by Steam")
            if op in (0, 1):
                frag += payload
                if b0 & 0x80:
                    out.append(frag.decode(errors="replace"))
                    frag = b""
        self.frag = frag
        return out


def describe(obj):
    if not isinstance(obj, dict):
        return str(obj)
    return obj.get("description") or (json.dumps(obj["value"]) if "value" in obj else obj.get("type", "?"))


def stack(st):
    frames = (st or {}).get("callFrames", [])[:25]
    return "".join(f"\n      at {f.get('functionName') or '<anon>'} ({f.get('url', '')}:{f.get('lineNumber', 0) + 1}:{f.get('columnNumber', 0) + 1})" for f in frames)


def handle(title, msg):
    m = json.loads(msg)
    method, p = m.get("method"), m.get("params", {})
    if method == "Runtime.exceptionThrown":
        d = p.get("exceptionDetails", {})
        log(f"[{title}] UNCAUGHT {describe(d.get('exception', {})) or d.get('text')}{stack(d.get('stackTrace'))}")
    elif method == "Runtime.consoleAPICalled" and p.get("type") in ("error", "assert"):
        log(f"[{title}] console.{p['type']}: " + " ".join(describe(a) for a in p.get("args", [])) + stack(p.get("stackTrace")))
    elif method == "Log.entryAdded" and p.get("entry", {}).get("level") == "error":
        e = p["entry"]
        log(f"[{title}] log.error: {e.get('text')} {e.get('url', '')}{stack(e.get('stackTrace'))}")


def main():
    end = time.time() + RUN_FOR_S
    log(f"--- recording Steam UI errors for {RUN_FOR_S // 60} min (CEF {HOST}:{PORT})")
    conns = {}
    while time.time() < end:
        try:
            for t in targets():
                if t["id"] not in conns:
                    try:
                        ws = WS(t["webSocketDebuggerUrl"])
                        for i, meth in enumerate(("Runtime.enable", "Log.enable")):
                            ws.send({"id": i + 1, "method": meth})
                        conns[t["id"]] = (t["title"], ws)
                        log(f"connected: {t['title']}")
                    except Exception as e:
                        log(f"could not attach to {t['title']}: {e}")
        except Exception:
            pass  # Steam not up (yet), restarting, or switching modes
        for tid, (title, ws) in list(conns.items()):
            try:
                for msg in ws.messages():
                    handle(title, msg)
            except Exception as e:
                log(f"disconnected: {title} ({e})")
                conns.pop(tid, None)
        time.sleep(0.2)
    log("--- done")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)

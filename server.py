#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import os
import re
import ssl
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import parse, request


DATA_DIR = Path("data")
LEADS_PATH = DATA_DIR / "leads.ndjson"
ANALYTICS_PATH = DATA_DIR / "analytics.ndjson"
NDJSON_WRITE_LOCK = threading.Lock()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def append_ndjson(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    row = json.dumps(payload, ensure_ascii=False) + "\n"
    with NDJSON_WRITE_LOCK:
        with path.open("a", encoding="utf-8") as f:
            f.write(row)


def append_ndjson_many(path: Path, payloads: list[dict]) -> None:
    if not payloads:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in payloads)
    with NDJSON_WRITE_LOCK:
        with path.open("a", encoding="utf-8") as f:
            f.write(rows)


def sanitize_text(value: str, max_len: int = 1200) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text[:max_len]


def sanitize_event_ts(value: object) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        ts = int(value)
    elif isinstance(value, str):
        raw = value.strip()
        if not raw.isdigit():
            return None
        ts = int(raw)
    else:
        return None
    if ts < 0:
        return None
    return ts


def env_flag(name: str, default: bool = False) -> bool:
    raw = str(os.environ.get(name, "")).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    try:
        raw = path.read_text(encoding="utf-8")
    except Exception:  # noqa: BLE001
        return
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if not key:
            continue
        os.environ.setdefault(key, value)


def send_telegram(
    token: str,
    chat_id: str,
    text: str,
    timeout: float = 8.0,
    insecure: bool = False,
    http_proxy: str = "",
) -> tuple[bool, str]:
    if not token or not chat_id:
        return False, "telegram_not_configured"

    endpoint = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode("utf-8")
    req = request.Request(endpoint, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    handlers: list[request.BaseHandler] = []
    if http_proxy:
        handlers.append(request.ProxyHandler({"http": http_proxy, "https": http_proxy}))
    if insecure:
        handlers.append(request.HTTPSHandler(context=ssl._create_unverified_context()))  # noqa: S323
    opener = request.build_opener(*handlers)

    try:
        with opener.open(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", "ignore")
        parsed = json.loads(body)
        if parsed.get("ok"):
            return True, "sent"
        return False, str(parsed.get("description") or "telegram_unknown_error")
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


class AppHandler(SimpleHTTPRequestHandler):
    server_version = "MellowServer/1.0"
    protocol_version = "HTTP/1.1"
    telegram_token: str = ""
    telegram_chat_id: str = ""
    telegram_insecure: bool = False
    telegram_http_proxy: str = ""

    def cache_control_for_request(self) -> str:
        split = parse.urlsplit(self.path or "/")
        path = split.path or "/"
        query = split.query

        if self.command not in {"GET", "HEAD"} or path.startswith("/api/"):
            return "no-store, max-age=0"

        if path in {"/", "/index.html", "/app.html"} or path.endswith(".html"):
            return "public, max-age=0, must-revalidate"

        if path.endswith("manifest.json"):
            return "public, max-age=300, stale-while-revalidate=600"

        immutable_paths = (
            "/assets/img/optimized/",
            "/unsplash-local/images/",
        )
        if path.startswith(immutable_paths):
            return "public, max-age=31536000, immutable"

        static_exts = (
            ".css",
            ".js",
            ".mjs",
            ".json",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".avif",
            ".gif",
            ".svg",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
            ".otf",
            ".webmanifest",
            ".xml",
            ".txt",
        )
        if path.lower().endswith(static_exts):
            if query:
                return "public, max-age=31536000, immutable"
            return "public, max-age=604800, stale-while-revalidate=86400"

        return "public, max-age=3600"

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        cache_control = self.cache_control_for_request()
        self.send_header("Cache-Control", cache_control)
        if "no-store" in cache_control:
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' http://127.0.0.1:8787 https://r.jina.ai https://unsplash.com https://api.unsplash.com; "
            "frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
        )
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self.path.startswith("/api/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        self.send_response(405)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/leads":
            self.handle_lead()
            return
        if self.path == "/api/analytics":
            self.handle_analytics()
            return
        self.send_json(404, {"ok": False, "error": "not_found"})

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict:
        raw_len = self.headers.get("Content-Length", "0")
        try:
            content_len = max(0, min(1_000_000, int(raw_len)))
        except ValueError:
            content_len = 0
        body = self.rfile.read(content_len) if content_len else b""
        if not body:
            return {}
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"invalid_json: {exc}") from exc
        if not isinstance(data, dict):
            raise ValueError("invalid_payload_type")
        return data

    def handle_lead(self) -> None:
        try:
            payload = self.read_json_body()
        except ValueError as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
            return

        name = sanitize_text(payload.get("name", ""), 120)
        contact = sanitize_text(payload.get("contact", ""), 180)
        comment = sanitize_text(payload.get("comment", ""), 2000)
        source = sanitize_text(payload.get("source", "site"), 80)
        page = sanitize_text(payload.get("page", "/"), 180)

        if not name or not contact:
            self.send_json(400, {"ok": False, "error": "name_and_contact_required"})
            return

        lead = {
            "ts": utc_now_iso(),
            "name": name,
            "contact": contact,
            "comment": comment,
            "source": source,
            "page": page,
            "ip": self.client_address[0] if self.client_address else "",
            "ua": sanitize_text(self.headers.get("User-Agent", ""), 320),
        }
        append_ndjson(LEADS_PATH, lead)

        message = (
            "<b>Новая заявка с сайта</b>\n"
            f"<b>Имя:</b> {html.escape(name)}\n"
            f"<b>Контакт:</b> {html.escape(contact)}\n"
            f"<b>Источник:</b> {html.escape(source)}\n"
            f"<b>Страница:</b> {html.escape(page)}\n"
            f"<b>Комментарий:</b> {html.escape(comment) if comment else '—'}"
        )
        sent, reason = send_telegram(
            self.telegram_token,
            self.telegram_chat_id,
            message,
            insecure=self.telegram_insecure,
            http_proxy=self.telegram_http_proxy,
        )

        self.send_json(200, {"ok": True, "telegram_sent": sent, "telegram_status": reason})

    def handle_analytics(self) -> None:
        try:
            payload = self.read_json_body()
        except ValueError as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
            return

        events = payload.get("events")
        if not isinstance(events, list):
            self.send_json(400, {"ok": False, "error": "events_list_required"})
            return

        now = utc_now_iso()
        page = sanitize_text(payload.get("page", "/"), 180)
        ip = self.client_address[0] if self.client_address else ""
        ua = sanitize_text(self.headers.get("User-Agent", ""), 320)

        rows: list[dict] = []
        for evt in events[:200]:
            if not isinstance(evt, dict):
                continue
            name = sanitize_text(evt.get("name", ""), 120)
            if not name:
                continue
            rows.append(
                {
                    "ts": now,
                    "name": name,
                    "data": evt.get("data", {}) if isinstance(evt.get("data"), dict) else {},
                    "at": sanitize_event_ts(evt.get("at")),
                    "page": page,
                    "ip": ip,
                    "ua": ua,
                }
            )

        append_ndjson_many(ANALYTICS_PATH, rows)
        accepted = len(rows)

        self.send_json(200, {"ok": True, "accepted": accepted})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve static site + API for leads/analytics.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=4173, help="Bind port")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_dotenv()

    AppHandler.telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    AppHandler.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    AppHandler.telegram_insecure = env_flag("TELEGRAM_INSECURE", default=False)
    AppHandler.telegram_http_proxy = os.environ.get("TELEGRAM_HTTP_PROXY", "").strip()

    httpd = ThreadingHTTPServer((args.host, args.port), AppHandler)
    print(json.dumps({
        "status": "started",
        "host": args.host,
        "port": args.port,
        "telegram_enabled": bool(AppHandler.telegram_token and AppHandler.telegram_chat_id),
        "telegram_insecure": AppHandler.telegram_insecure,
        "telegram_proxy": bool(AppHandler.telegram_http_proxy),
    }, ensure_ascii=False))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('{"status":"stopped"}')
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

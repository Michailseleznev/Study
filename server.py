#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import os
import posixpath
import re
import ssl
import threading
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, parse, request


DATA_DIR = Path("data")
LEADS_PATH = DATA_DIR / "leads.ndjson"
ANALYTICS_PATH = DATA_DIR / "analytics.ndjson"
NDJSON_WRITE_LOCK = threading.Lock()
DEFAULT_SITE_ROOT = Path("dist")

UNSPLASH_PROXY_USER_AGENT = "MellowServerUnsplashProxy/1.0"
UNSPLASH_PROXY_DEFAULT_TIMEOUT = 14.0
UNSPLASH_PROXY_DEFAULT_CACHE_TTL = 120


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


def env_float(name: str, default: float) -> float:
    raw = str(os.environ.get(name, "")).strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def env_int(name: str, default: int) -> int:
    raw = str(os.environ.get(name, "")).strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


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
    unsplash_access_key: str = ""
    unsplash_upstream_proxy: str = ""
    unsplash_proxy_timeout: float = UNSPLASH_PROXY_DEFAULT_TIMEOUT
    unsplash_proxy_cache_ttl: int = UNSPLASH_PROXY_DEFAULT_CACHE_TTL
    unsplash_proxy_insecure: bool = False
    unsplash_cache: dict[tuple[str, tuple[tuple[str, str], ...]], tuple[float, int, str, bytes]] = {}
    unsplash_cache_lock = threading.Lock()
    site_root: Path = DEFAULT_SITE_ROOT.resolve()

    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0]
        path = path.split("#", 1)[0]
        trailing_slash = path.endswith("/")

        try:
            path = parse.unquote(path, errors="surrogatepass")
        except UnicodeDecodeError:
            path = parse.unquote(path)

        normalized = posixpath.normpath(path)
        parts = [part for part in normalized.split("/") if part]
        resolved = self.site_root

        for part in parts:
            if part in {os.curdir, os.pardir} or os.path.dirname(part):
                continue
            resolved = resolved / part

        if trailing_slash:
            resolved = resolved / ""

        return str(resolved)

    def cache_control_for_request(self) -> str:
        split = parse.urlsplit(self.path or "/")
        path = split.path or "/"
        query = split.query

        if self.command not in {"GET", "HEAD"} or path.startswith("/api/") or path.startswith("/proxy/"):
            return "no-store, max-age=0"

        if path in {"/", "/index.html"} or path.endswith(".html"):
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
        path = parse.urlsplit(self.path or "/").path or "/"
        if path.startswith("/api/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        if path.startswith("/proxy/unsplash/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Unsplash-Key, Authorization")
            self.end_headers()
            return
        self.send_response(405)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        split = parse.urlsplit(self.path or "/")
        path = split.path or "/"
        if path.startswith("/proxy/unsplash/"):
            self.handle_unsplash_proxy(split)
            return
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802
        split = parse.urlsplit(self.path or "/")
        path = split.path or "/"
        if path.startswith("/proxy/unsplash/"):
            self.handle_unsplash_proxy(split, send_body=False)
            return
        super().do_HEAD()

    def do_POST(self) -> None:  # noqa: N802
        path = parse.urlsplit(self.path or "/").path or "/"
        if path == "/api/leads":
            self.handle_lead()
            return
        if path == "/api/analytics":
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

    def send_proxy_payload(
        self,
        status: int,
        body: bytes,
        content_type: str = "application/json; charset=utf-8",
        send_body: bool = True,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Unsplash-Key, Authorization")
        self.end_headers()
        if send_body:
            self.wfile.write(body)

    def normalize_unsplash_query(self, query: dict[str, list[str]]) -> str:
        raw_per_page = (query.get("per_page") or ["32"])[0]
        raw_order_by = (query.get("order_by") or ["latest"])[0]

        try:
            per_page = max(1, min(50, int(str(raw_per_page).strip())))
        except ValueError:
            per_page = 32

        order_by = str(raw_order_by).strip().lower()
        if order_by not in {"latest", "oldest", "popular"}:
            order_by = "latest"

        return parse.urlencode({"per_page": per_page, "order_by": order_by})

    def extract_unsplash_access_key(self, query: dict[str, list[str]]) -> str:
        key = (self.headers.get("X-Unsplash-Key") or "").strip()
        if key:
            return key

        auth = (self.headers.get("Authorization") or "").strip()
        if auth.lower().startswith("client-id "):
            return auth[10:].strip()

        query_key = str((query.get("access_key") or [""])[0]).strip()
        if query_key:
            return query_key

        return self.unsplash_access_key.strip()

    @staticmethod
    def is_cert_verify_error(exc: Exception) -> bool:
        if isinstance(exc, ssl.SSLCertVerificationError):
            return True
        if isinstance(exc, error.URLError):
            reason = getattr(exc, "reason", None)
            if isinstance(reason, ssl.SSLCertVerificationError):
                return True
            if isinstance(reason, ssl.SSLError) and "CERTIFICATE_VERIFY_FAILED" in str(reason):
                return True
        return "CERTIFICATE_VERIFY_FAILED" in str(exc)

    def build_unsplash_opener(self, insecure: bool) -> request.OpenerDirector:
        handlers: list[request.BaseHandler] = []
        upstream_proxy = self.unsplash_upstream_proxy.strip()
        if upstream_proxy:
            handlers.append(request.ProxyHandler({"http": upstream_proxy, "https": upstream_proxy}))
        if insecure:
            handlers.append(request.HTTPSHandler(context=ssl._create_unverified_context()))  # noqa: S323
        return request.build_opener(*handlers)

    def fetch_unsplash(self, url: str, headers: dict[str, str]) -> tuple[int, str, bytes]:
        cache_key = (url, tuple(sorted((k.lower(), v) for k, v in headers.items())))
        cache_ttl = max(0, int(self.unsplash_proxy_cache_ttl))
        now = time.time()

        if cache_ttl > 0:
            with self.unsplash_cache_lock:
                hit = self.unsplash_cache.get(cache_key)
                if hit and hit[0] > now:
                    return hit[1], hit[2], hit[3]

        req = request.Request(url=url, headers=headers, method="GET")
        timeout = max(2.0, float(self.unsplash_proxy_timeout))
        opener = self.build_unsplash_opener(insecure=bool(self.unsplash_proxy_insecure))
        try:
            with opener.open(req, timeout=timeout) as resp:
                status = int(resp.getcode() or 200)
                body = resp.read()
                content_type = resp.headers.get("Content-Type", "application/json; charset=utf-8")
        except error.HTTPError as exc:
            status = int(exc.code or 502)
            body = exc.read() or b""
            content_type = exc.headers.get("Content-Type", "application/json; charset=utf-8") if exc.headers else "application/json; charset=utf-8"
        except Exception as exc:  # noqa: BLE001
            if not self.unsplash_proxy_insecure and self.is_cert_verify_error(exc):
                try:
                    retry_opener = self.build_unsplash_opener(insecure=True)
                    with retry_opener.open(req, timeout=timeout) as resp:
                        status = int(resp.getcode() or 200)
                        body = resp.read()
                        content_type = resp.headers.get("Content-Type", "application/json; charset=utf-8")
                except Exception as retry_exc:  # noqa: BLE001
                    payload = {"error": "upstream_unreachable", "message": str(retry_exc)}
                    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                    return 502, "application/json; charset=utf-8", body
            else:
                payload = {"error": "upstream_unreachable", "message": str(exc)}
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                return 502, "application/json; charset=utf-8", body

        if cache_ttl > 0 and 200 <= status < 300:
            with self.unsplash_cache_lock:
                self.unsplash_cache[cache_key] = (now + cache_ttl, status, content_type, body)

        return status, content_type, body

    def handle_unsplash_proxy(self, split: parse.SplitResult, send_body: bool = True) -> None:
        path = split.path or ""
        query = parse.parse_qs(split.query or "")

        if path == "/proxy/unsplash/health":
            payload = json.dumps({"ok": True, "ts": int(time.time())}, ensure_ascii=False).encode("utf-8")
            self.send_proxy_payload(200, payload, send_body=send_body)
            return

        api_match = re.match(r"^/proxy/unsplash/api/users/([^/]+)/photos$", path)
        if api_match:
            username = parse.quote(api_match.group(1))
            access_key = self.extract_unsplash_access_key(query)
            if not access_key:
                payload = json.dumps({"error": "missing_access_key"}, ensure_ascii=False).encode("utf-8")
                self.send_proxy_payload(400, payload, send_body=send_body)
                return
            query_string = self.normalize_unsplash_query(query)
            url = f"https://api.unsplash.com/users/{username}/photos?{query_string}"
            headers = {
                "Accept-Version": "v1",
                "Authorization": f"Client-ID {access_key}",
                "User-Agent": UNSPLASH_PROXY_USER_AGENT,
            }
            status, content_type, body = self.fetch_unsplash(url, headers)
            self.send_proxy_payload(status, body, content_type=content_type, send_body=send_body)
            return

        public_match = re.match(r"^/proxy/unsplash/public/users/([^/]+)/photos$", path)
        if public_match:
            username = parse.quote(public_match.group(1))
            query_string = self.normalize_unsplash_query(query)
            url = f"https://unsplash.com/napi/users/{username}/photos?{query_string}"
            headers = {
                "Accept": "application/json",
                "User-Agent": UNSPLASH_PROXY_USER_AGENT,
            }
            status, content_type, body = self.fetch_unsplash(url, headers)
            self.send_proxy_payload(status, body, content_type=content_type, send_body=send_body)
            return

        payload = json.dumps({"error": "not_found"}, ensure_ascii=False).encode("utf-8")
        self.send_proxy_payload(404, payload, send_body=send_body)

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
    parser = argparse.ArgumentParser(description="Serve static site + API for leads/analytics + Unsplash proxy.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=4173, help="Bind port")
    parser.add_argument(
        "--site-root",
        default=str(DEFAULT_SITE_ROOT),
        help="Directory to serve frontend assets from (default: dist)",
    )
    parser.add_argument(
        "--unsplash-upstream-proxy",
        default=os.environ.get("UNSPLASH_UPSTREAM_PROXY", ""),
        help="Optional upstream HTTP proxy for Unsplash proxy requests",
    )
    parser.add_argument(
        "--unsplash-access-key",
        default=os.environ.get("UNSPLASH_ACCESS_KEY", ""),
        help="Default Unsplash Access Key for /proxy/unsplash/api/* routes",
    )
    parser.add_argument(
        "--unsplash-proxy-timeout",
        type=float,
        default=env_float("UNSPLASH_PROXY_TIMEOUT", UNSPLASH_PROXY_DEFAULT_TIMEOUT),
        help="Unsplash upstream timeout in seconds (default: 14)",
    )
    parser.add_argument(
        "--unsplash-proxy-cache-ttl",
        type=int,
        default=env_int("UNSPLASH_PROXY_CACHE_TTL", UNSPLASH_PROXY_DEFAULT_CACHE_TTL),
        help="Unsplash proxy in-memory cache TTL in seconds (default: 120)",
    )
    parser.add_argument(
        "--unsplash-proxy-insecure",
        action="store_true",
        default=env_flag("UNSPLASH_PROXY_INSECURE", default=False),
        help="Disable TLS cert verification for Unsplash proxy upstream",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_dotenv()
    site_root = Path(args.site_root).expanduser().resolve()
    if not site_root.exists() or not site_root.is_dir():
        raise SystemExit(f'site_root_not_found: "{site_root}"')

    AppHandler.telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    AppHandler.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    AppHandler.telegram_insecure = env_flag("TELEGRAM_INSECURE", default=False)
    AppHandler.telegram_http_proxy = os.environ.get("TELEGRAM_HTTP_PROXY", "").strip()
    AppHandler.unsplash_upstream_proxy = args.unsplash_upstream_proxy.strip()
    AppHandler.unsplash_access_key = args.unsplash_access_key.strip()
    AppHandler.unsplash_proxy_timeout = max(2.0, float(args.unsplash_proxy_timeout))
    AppHandler.unsplash_proxy_cache_ttl = max(0, int(args.unsplash_proxy_cache_ttl))
    AppHandler.unsplash_proxy_insecure = bool(args.unsplash_proxy_insecure)
    AppHandler.site_root = site_root

    httpd = ThreadingHTTPServer((args.host, args.port), AppHandler)
    print(json.dumps({
        "status": "started",
        "host": args.host,
        "port": args.port,
        "site_root": str(AppHandler.site_root),
        "telegram_enabled": bool(AppHandler.telegram_token and AppHandler.telegram_chat_id),
        "telegram_insecure": AppHandler.telegram_insecure,
        "telegram_proxy": bool(AppHandler.telegram_http_proxy),
        "unsplash_proxy_path": "/proxy/unsplash",
        "unsplash_proxy_upstream": bool(AppHandler.unsplash_upstream_proxy),
        "unsplash_proxy_access_key": bool(AppHandler.unsplash_access_key),
        "unsplash_proxy_timeout": AppHandler.unsplash_proxy_timeout,
        "unsplash_proxy_cache_ttl": AppHandler.unsplash_proxy_cache_ttl,
        "unsplash_proxy_insecure": AppHandler.unsplash_proxy_insecure,
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

#!/usr/bin/env python3
"""
Local reverse proxy for Unsplash endpoints.

Why:
- Browser requests to Unsplash can fail from some regions.
- This proxy can route traffic through an upstream HTTP(S) proxy with a foreign IP.
- Frontend can call localhost and get CORS-enabled JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import threading
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Tuple
from urllib import error, parse, request


USER_AGENT = "MellowPhotosLocalProxy/1.0"


@dataclass
class CachedResponse:
    status: int
    content_type: str
    body: bytes
    expires_at: float


class Fetcher:
    def __init__(self, upstream_proxy: str, timeout: float, cache_ttl: int, insecure: bool) -> None:
        handlers = []
        if upstream_proxy:
            handlers.append(request.ProxyHandler({"http": upstream_proxy, "https": upstream_proxy}))
        if insecure:
            handlers.append(request.HTTPSHandler(context=ssl._create_unverified_context()))  # noqa: S323
        self._opener = request.build_opener(*handlers)
        self._timeout = timeout
        self._cache_ttl = max(0, int(cache_ttl))
        self._cache: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], CachedResponse] = {}
        self._lock = threading.Lock()

    def get(self, url: str, headers: Dict[str, str]) -> Tuple[int, str, bytes]:
        cache_key = (url, tuple(sorted((k.lower(), v) for k, v in headers.items())))
        now = time.time()
        if self._cache_ttl > 0:
            with self._lock:
                hit = self._cache.get(cache_key)
                if hit and hit.expires_at > now:
                    return hit.status, hit.content_type, hit.body

        req = request.Request(url=url, headers=headers, method="GET")
        try:
            with self._opener.open(req, timeout=self._timeout) as resp:
                body = resp.read()
                status = int(resp.getcode() or 200)
                content_type = resp.headers.get("Content-Type", "application/json; charset=utf-8")
        except error.HTTPError as exc:
            body = exc.read() or b""
            status = int(exc.code or 502)
            content_type = exc.headers.get("Content-Type", "application/json; charset=utf-8") if exc.headers else "application/json; charset=utf-8"
        except Exception as exc:  # noqa: BLE001
            payload = {"error": "upstream_unreachable", "message": str(exc)}
            return 502, "application/json; charset=utf-8", json.dumps(payload, ensure_ascii=False).encode("utf-8")

        if self._cache_ttl > 0 and status >= 200 and status < 300:
            with self._lock:
                self._cache[cache_key] = CachedResponse(
                    status=status,
                    content_type=content_type,
                    body=body,
                    expires_at=now + self._cache_ttl,
                )
        return status, content_type, body


class UnsplashProxyHandler(BaseHTTPRequestHandler):
    fetcher: Fetcher
    default_access_key: str

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        # Keep logs concise and machine-readable.
        print(f"[proxy] {self.address_string()} {fmt % args}")

    def _set_common_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Unsplash-Key, Authorization")
        self.send_header("Vary", "Origin")

    def _respond_json(self, status: int, payload: Dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._set_common_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._set_common_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        path = parsed.path or ""
        query = parse.parse_qs(parsed.query or "")

        if path == "/health":
            self._respond_json(200, {"ok": True, "ts": int(time.time())})
            return

        api_match = re.match(r"^/api/users/([^/]+)/photos$", path)
        if api_match:
            self._handle_api(api_match.group(1), query)
            return

        public_match = re.match(r"^/public/users/([^/]+)/photos$", path)
        if public_match:
            self._handle_public(public_match.group(1), query)
            return

        self._respond_json(404, {"error": "not_found"})

    def _normalize_query(self, query: Dict[str, object]) -> str:
        per_page = 32
        raw_page = (query.get("per_page") or [32])[0]
        try:
            per_page = max(1, min(50, int(raw_page)))
        except Exception:  # noqa: BLE001
            per_page = 32

        order_by = str((query.get("order_by") or ["latest"])[0]).strip().lower()
        if order_by not in {"latest", "oldest", "popular"}:
            order_by = "latest"

        return parse.urlencode({"per_page": per_page, "order_by": order_by})

    def _extract_access_key(self, query: Dict[str, object]) -> str:
        header_key = (self.headers.get("X-Unsplash-Key") or "").strip()
        if header_key:
            return header_key

        auth = (self.headers.get("Authorization") or "").strip()
        if auth.lower().startswith("client-id "):
            return auth[10:].strip()

        query_key = str((query.get("access_key") or [""])[0]).strip()
        if query_key:
            return query_key

        return (self.default_access_key or "").strip()

    def _proxy(self, url: str, headers: Dict[str, str]) -> None:
        status, content_type, body = self.fetcher.get(url, headers)
        self.send_response(status)
        self._set_common_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_api(self, username: str, query: Dict[str, object]) -> None:
        access_key = self._extract_access_key(query)
        if not access_key:
            self._respond_json(400, {"error": "missing_access_key"})
            return

        query_string = self._normalize_query(query)
        endpoint = f"https://api.unsplash.com/users/{parse.quote(username)}/photos?{query_string}"
        headers = {
            "Accept-Version": "v1",
            "Authorization": f"Client-ID {access_key}",
            "User-Agent": USER_AGENT,
        }
        self._proxy(endpoint, headers)

    def _handle_public(self, username: str, query: Dict[str, object]) -> None:
        query_string = self._normalize_query(query)
        endpoint = f"https://unsplash.com/napi/users/{parse.quote(username)}/photos?{query_string}"
        headers = {
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        }
        self._proxy(endpoint, headers)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local Unsplash reverse proxy.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8787, help="Bind port (default: 8787)")
    parser.add_argument(
        "--upstream-proxy",
        default=os.environ.get("UNSPLASH_UPSTREAM_PROXY", ""),
        help="Upstream HTTP(S) proxy URL for foreign egress IP, e.g. http://user:pass@host:port",
    )
    parser.add_argument(
        "--access-key",
        default=os.environ.get("UNSPLASH_ACCESS_KEY", ""),
        help="Default Unsplash Access Key if not passed from client",
    )
    parser.add_argument("--timeout", type=float, default=20.0, help="Upstream request timeout in seconds")
    parser.add_argument("--cache-ttl", type=int, default=120, help="In-memory cache TTL in seconds")
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification for upstream requests (use only with trusted proxy)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    fetcher = Fetcher(
        upstream_proxy=args.upstream_proxy.strip(),
        timeout=args.timeout,
        cache_ttl=args.cache_ttl,
        insecure=bool(args.insecure),
    )

    UnsplashProxyHandler.fetcher = fetcher
    UnsplashProxyHandler.default_access_key = args.access_key.strip()

    server = ThreadingHTTPServer((args.host, args.port), UnsplashProxyHandler)
    print(
        json.dumps(
            {
                "status": "started",
                "host": args.host,
                "port": args.port,
                "upstream_proxy": bool(args.upstream_proxy.strip()),
                "insecure": bool(args.insecure),
                "cache_ttl": args.cache_ttl,
            },
            ensure_ascii=False,
        )
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('{"status":"stopped"}')
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Download latest Unsplash photos to local files and generate a frontend manifest.

Default output:
- unsplash-local/images/*.jpg
- unsplash-local/manifest.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple
from urllib import error, parse, request


USER_AGENT = "MellowPhotosUnsplashSync/1.0"
UNSPLASH_CATEGORY = "Недавние фотографии"
DEFAULT_PROXY_BASE = "http://127.0.0.1:4173/proxy/unsplash"


class HttpClient:
    def __init__(self, timeout: float, proxy_url: str = "", insecure: bool = False) -> None:
        self._proxy_url = str(proxy_url or "").strip()
        self._insecure = bool(insecure)
        self._opener = self._build_opener(insecure=self._insecure)
        self._timeout = timeout

    def _build_opener(self, insecure: bool) -> request.OpenerDirector:
        handlers = []
        if self._proxy_url:
            handlers.append(request.ProxyHandler({"http": self._proxy_url, "https": self._proxy_url}))
        if insecure:
            handlers.append(request.HTTPSHandler(context=ssl._create_unverified_context()))  # noqa: S323
        return request.build_opener(*handlers)

    @staticmethod
    def _is_cert_verify_error(exc: Exception) -> bool:
        if isinstance(exc, ssl.SSLCertVerificationError):
            return True
        if isinstance(exc, error.URLError):
            reason = getattr(exc, "reason", None)
            if isinstance(reason, ssl.SSLCertVerificationError):
                return True
            if isinstance(reason, ssl.SSLError) and "CERTIFICATE_VERIFY_FAILED" in str(reason):
                return True
        return "CERTIFICATE_VERIFY_FAILED" in str(exc)

    def _open(self, req: request.Request):
        try:
            return self._opener.open(req, timeout=self._timeout)
        except Exception as exc:  # noqa: BLE001
            if not self._insecure and self._is_cert_verify_error(exc):
                # Auto-fallback helps on systems with broken CA trust stores.
                self._insecure = True
                self._opener = self._build_opener(insecure=True)
                return self._opener.open(req, timeout=self._timeout)
            raise

    def get_json(self, url: str, headers: Dict[str, str]) -> List[Dict[str, object]]:
        req = request.Request(url=url, headers=headers, method="GET")
        with self._open(req) as resp:
            body = resp.read()
            data = json.loads(body.decode("utf-8"))
        if isinstance(data, list):
            return data
        raise ValueError("Unexpected JSON payload (expected list)")

    def download_file(self, url: str, dest: Path, headers: Dict[str, str]) -> None:
        req = request.Request(url=url, headers=headers, method="GET")
        with self._open(req) as resp:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("wb") as fh:
                fh.write(resp.read())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Unsplash photos to local files.")
    parser.add_argument("--username", default="mihmihfoto", help="Unsplash username")
    parser.add_argument("--count", type=int, default=32, help="Number of photos (1..50)")
    parser.add_argument("--output-dir", default="unsplash-local", help="Output directory in project root")
    parser.add_argument("--images-dir", default="images", help="Images subfolder inside output-dir")
    parser.add_argument("--manifest-name", default="manifest.json", help="Manifest filename")
    parser.add_argument(
        "--access-key",
        default=os.environ.get("UNSPLASH_ACCESS_KEY", ""),
        help="Unsplash Access Key (or set UNSPLASH_ACCESS_KEY env var)",
    )
    parser.add_argument(
        "--proxy-base",
        default=os.environ.get("UNSPLASH_PROXY_BASE", DEFAULT_PROXY_BASE),
        help=f"Proxy base URL (default: {DEFAULT_PROXY_BASE})",
    )
    parser.add_argument("--direct", action="store_true", help="Bypass local proxy and call Unsplash directly")
    parser.add_argument(
        "--http-proxy",
        default=os.environ.get("HTTPS_PROXY", os.environ.get("HTTP_PROXY", "")),
        help="HTTP(S) proxy URL for image downloads (and direct mode if --direct is used)",
    )
    parser.add_argument("--timeout", type=float, default=20.0, help="Request timeout in seconds")
    parser.add_argument("--max-width", type=int, default=1800, help="Downloaded image width from raw URL")
    parser.add_argument("--quality", type=int, default=82, help="JPEG quality for Unsplash dynamic URLs")
    parser.add_argument("--clean", action="store_true", help="Delete stale files in images folder")
    parser.add_argument("--force", action="store_true", help="Redownload files even if they already exist")
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification (for some public proxies with broken cert chain)",
    )
    return parser.parse_args()


def format_ru_date(raw_value: str) -> str:
    if not raw_value:
        return ""
    value = raw_value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return ""
    month_names = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
    ]
    return f"{dt.day:02d} {month_names[dt.month - 1]} {dt.year}"


def safe_photo_id(raw_id: object, index: int) -> str:
    value = str(raw_id or "").strip()
    if not value:
        return f"photo_{index + 1:03d}"
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", value).strip("-")
    return cleaned or f"photo_{index + 1:03d}"


def build_query_url(base_url: str, params: Dict[str, object]) -> str:
    parsed = parse.urlparse(base_url)
    current = parse.parse_qs(parsed.query, keep_blank_values=True)
    for key, value in params.items():
        current[str(key)] = [str(value)]
    query = parse.urlencode(current, doseq=True)
    return parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, query, parsed.fragment))


def choose_download_url(photo: Dict[str, object], max_width: int, quality: int) -> str:
    urls = photo.get("urls") or {}
    if not isinstance(urls, dict):
        urls = {}

    raw = str(urls.get("raw") or "").strip()
    if raw:
        return build_query_url(
            raw,
            {
                "auto": "format",
                "fit": "max",
                "fm": "jpg",
                "q": max(1, min(100, quality)),
                "w": max(640, min(4000, max_width)),
            },
        )

    for key in ("regular", "full", "small"):
        url = str(urls.get(key) or "").strip()
        if url:
            return url
    return ""


def fetch_unsplash_items(
    client: HttpClient,
    username: str,
    count: int,
    access_key: str,
    proxy_base: str,
    direct: bool,
) -> Tuple[List[Dict[str, object]], str]:
    errors: List[str] = []
    count = max(1, min(50, int(count)))
    username_q = parse.quote(username)

    proxy_base = proxy_base.strip().rstrip("/")
    if proxy_base and not direct:
        if access_key:
            api_url = f"{proxy_base}/api/users/{username_q}/photos?per_page={count}&order_by=latest"
            try:
                data = client.get_json(api_url, {"X-Unsplash-Key": access_key, "User-Agent": USER_AGENT})
                return data, "proxy_api"
            except Exception as exc:  # noqa: BLE001
                errors.append(f"proxy_api:{exc}")

        public_url = f"{proxy_base}/public/users/{username_q}/photos?per_page={count}&order_by=latest"
        try:
            data = client.get_json(public_url, {"Accept": "application/json", "User-Agent": USER_AGENT})
            return data, "proxy_public"
        except Exception as exc:  # noqa: BLE001
            errors.append(f"proxy_public:{exc}")

    if access_key:
        direct_api_url = f"https://api.unsplash.com/users/{username_q}/photos?per_page={count}&order_by=latest"
        try:
            data = client.get_json(
                direct_api_url,
                {
                    "Accept-Version": "v1",
                    "Authorization": f"Client-ID {access_key}",
                    "User-Agent": USER_AGENT,
                },
            )
            return data, "direct_api"
        except Exception as exc:  # noqa: BLE001
            errors.append(f"direct_api:{exc}")

    direct_public_url = f"https://unsplash.com/napi/users/{username_q}/photos?per_page={count}&order_by=latest"
    try:
        data = client.get_json(direct_public_url, {"Accept": "application/json", "User-Agent": USER_AGENT})
        return data, "direct_public"
    except Exception as exc:  # noqa: BLE001
        errors.append(f"direct_public:{exc}")

    raise RuntimeError("; ".join(errors) or "all_sources_failed")


def sync_files(
    download_client: HttpClient,
    raw_items: List[Dict[str, object]],
    output_dir: Path,
    images_dir_name: str,
    count: int,
    max_width: int,
    quality: int,
    force: bool,
) -> Tuple[List[Dict[str, object]], List[str]]:
    images_dir = output_dir / images_dir_name
    images_dir.mkdir(parents=True, exist_ok=True)
    result: List[Dict[str, object]] = []
    kept_files: List[str] = []

    for idx, photo in enumerate(raw_items[:count]):
        pid = safe_photo_id(photo.get("id"), idx)
        shot_at = str(photo.get("created_at") or photo.get("updated_at") or "").strip()
        date_label = format_ru_date(shot_at)
        title = date_label or f"Фото #{idx + 1}"
        img_w = int(photo.get("width") or 0) if str(photo.get("width") or "").isdigit() else 0
        img_h = int(photo.get("height") or 0) if str(photo.get("height") or "").isdigit() else 0

        download_url = choose_download_url(photo, max_width=max_width, quality=quality)
        if not download_url:
            continue

        file_name = f"{idx + 1:03d}_{pid}.jpg"
        local_file = images_dir / file_name
        kept_files.append(file_name)

        if force or not local_file.exists() or local_file.stat().st_size == 0:
            download_client.download_file(download_url, local_file, {"User-Agent": USER_AGENT})

        rel_path = f"{output_dir.name}/{images_dir_name}/{file_name}"
        result.append(
            {
                "id": pid,
                "title": title,
                "category": UNSPLASH_CATEGORY,
                "desc": "",
                "shotAt": shot_at,
                "dateLabel": date_label,
                "thumb": rel_path,
                "full": rel_path,
                "imgW": img_w,
                "imgH": img_h,
                "origin": "unsplash-local",
            }
        )

    return result, kept_files


def cleanup_stale_files(images_dir: Path, keep_names: List[str]) -> int:
    keep = set(keep_names)
    removed = 0
    for child in images_dir.glob("*"):
        if not child.is_file():
            continue
        if child.name in keep:
            continue
        child.unlink(missing_ok=True)
        removed += 1
    return removed


def main() -> int:
    args = parse_args()

    count = max(1, min(50, int(args.count)))
    username = str(args.username).strip().lstrip("@")
    if not username:
        raise SystemExit("username is required")

    output_dir = Path(args.output_dir).resolve()
    images_dir = output_dir / args.images_dir
    manifest_path = output_dir / args.manifest_name

    meta_proxy = str(args.http_proxy or "").strip() if args.direct else ""
    download_proxy = str(args.http_proxy or "").strip()
    metadata_client = HttpClient(timeout=args.timeout, proxy_url=meta_proxy, insecure=bool(args.insecure))
    download_client = HttpClient(timeout=args.timeout, proxy_url=download_proxy, insecure=bool(args.insecure))

    try:
        raw_items, source = fetch_unsplash_items(
            client=metadata_client,
            username=username,
            count=count,
            access_key=str(args.access_key or "").strip(),
            proxy_base=str(args.proxy_base or ""),
            direct=bool(args.direct),
        )
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Failed to fetch Unsplash photos: {exc}")

    photos, keep_files = sync_files(
        download_client=download_client,
        raw_items=raw_items,
        output_dir=output_dir,
        images_dir_name=args.images_dir,
        count=count,
        max_width=args.max_width,
        quality=args.quality,
        force=args.force,
    )

    removed_count = 0
    if args.clean:
        removed_count = cleanup_stale_files(images_dir, keep_files)

    payload = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "username": username,
        "count": len(photos),
        "source": source,
        "photos": photos,
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "ok",
                "source": source,
                "username": username,
                "downloaded": len(photos),
                "manifest": str(manifest_path),
                "images_dir": str(images_dir),
                "cleaned": removed_count,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# Unsplash Local Cache + Proxy

## 1) Start local proxy

```bash
python3 scripts/unsplash_local_proxy.py \
  --host 127.0.0.1 \
  --port 8787 \
  --upstream-proxy "http://USER:PASS@PROXY_HOST:PROXY_PORT"
```

Notes:
- `--upstream-proxy` must be a real external proxy with non-RU egress IP.
- Without upstream proxy, local proxy works but will use your current network route.

## 2) Download Unsplash photos to local files

```bash
python3 scripts/unsplash_sync.py \
  --username mihmihfoto \
  --count 32 \
  --proxy-base http://127.0.0.1:8787 \
  --http-proxy "http://USER:PASS@PROXY_HOST:PROXY_PORT" \
  --access-key "$UNSPLASH_ACCESS_KEY" \
  --insecure \
  --clean
```

Output:
- `unsplash-local/images/*.jpg`
- `unsplash-local/manifest.json`

## 3) Frontend behavior

`index.html` now loads Unsplash tab in this order:
1. Local cache (`unsplash-local/manifest.json`)
2. Online Unsplash via built-in site proxy (`/proxy/unsplash/public/...`)
3. Online fallback chain (public endpoint / jina fallback)

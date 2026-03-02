# Site Setup

## 1) Start Unsplash local proxy (optional, only if you need external egress proxy)

```bash
python3 scripts/unsplash_local_proxy.py \
  --host 127.0.0.1 \
  --port 8787 \
  --upstream-proxy "$UNSPLASH_UPSTREAM_PROXY" \
  --insecure
```

## 2) Sync latest Unsplash photos locally

Run `server.py` from step 4 in another terminal first (or replace `--proxy-base` with `http://127.0.0.1:8787` if you use standalone `unsplash_local_proxy.py`).

```bash
python3 scripts/unsplash_sync.py \
  --username mihmihfoto \
  --count 32 \
  --proxy-base http://127.0.0.1:4173/proxy/unsplash \
  --http-proxy "$UNSPLASH_UPSTREAM_PROXY" \
  --access-key "$UNSPLASH_ACCESS_KEY" \
  --insecure \
  --clean
```

## 3) Build image variants (AVIF/WebP/JPEG)

```bash
python3 scripts/optimize_images.py
```

## 4) Run the site + API locally

```bash
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHAT_ID="..."
# optional (if network inserts custom TLS cert)
# export TELEGRAM_INSECURE="1"
# optional proxy for Telegram API
# export TELEGRAM_HTTP_PROXY="http://user:pass@host:port"
# optional proxy for built-in Unsplash proxy
# export UNSPLASH_UPSTREAM_PROXY="http://user:pass@host:port"
# optional Unsplash API key for /proxy/unsplash/api/*
# export UNSPLASH_ACCESS_KEY="..."
python3 server.py --host 127.0.0.1 --port 4173
```

API endpoints:
- `POST /api/leads` — website lead form
- `POST /api/analytics` — event tracking
- `GET /proxy/unsplash/public/users/:username/photos` — built-in Unsplash public proxy
- `GET /proxy/unsplash/api/users/:username/photos` — built-in Unsplash API proxy

Data files:
- `data/leads.ndjson`
- `data/analytics.ndjson`

## 5) Vite (requires Node.js)

```bash
npm install
npm run dev
```

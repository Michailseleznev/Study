# Mellow Photos: единая инструкция

Этот файл содержит все инструкции по проекту: установка, запуск, синхронизация Unsplash и обслуживание.

## 1. Что в проекте сейчас

- Основной сайт: `index.html` (весь frontend-код теперь внутри одного файла: HTML + CSS + JS).
- Локальный сервер/API: `server.py`.
- Данные заявок и аналитики: `data/leads.ndjson`, `data/analytics.ndjson`.
- Кеш Unsplash: `unsplash-local/manifest.json` и `unsplash-local/images/*`.
- Манифест оптимизированных изображений: `assets/img/optimized/manifest.json`.

## 2. Требования

- Python 3.10+
- Node.js + npm (только если нужен Vite-режим)

## 3. Быстрый запуск (рекомендуется)

```bash
./start-localhost.command
```

После запуска:
- сайт: `http://localhost:4173`
- `POST /api/leads` - заявки с формы
- `POST /api/analytics` - события аналитики
- `GET /proxy/unsplash/public/users/:username/photos` - публичный Unsplash proxy
- `GET /proxy/unsplash/api/users/:username/photos` - API Unsplash proxy

Проверка статуса:

```bash
./scripts/localhost_status.sh
# ok | port_busy | not_running
```

Остановка фонового сервиса:

```bash
./stop-localhost.command
```

## 3.1 Опционально: `http://localhost` без `:4173`

Нужен один раз admin-пароль (macOS запросит его через системное окно):

```bash
./enable-localhost80.command
```

Проверка:

```bash
./scripts/localhost80_status.sh
# ok | port80_busy | not_enabled
```

Отключение:

```bash
./disable-localhost80.command
```

Важно: `./start-localhost.command` всегда открывает `http://localhost:4173` (это режим для стабильного ручного старта из IDE).

## 4. Переменные окружения (.env)

Пример:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
# TELEGRAM_INSECURE=1
# TELEGRAM_HTTP_PROXY=http://user:pass@host:port
# UNSPLASH_UPSTREAM_PROXY=http://user:pass@host:port
# UNSPLASH_ACCESS_KEY=...
```

## 5. Unsplash: локальный кеш и встроенный proxy

Единственный поддерживаемый путь для Unsplash proxy - встроенный обработчик в `server.py` на `/proxy/unsplash`.
Отдельный `scripts/unsplash_local_proxy.py` больше не используется, чтобы не поддерживать два разных поведения.

### 5.1 Синхронизация последних фото Unsplash

Нужен запущенный `server.py` на `:4173`:

```bash
python3 scripts/unsplash_sync.py \
  --username mihmihfoto \
  --count 32 \
  --proxy-base http://localhost:4173/proxy/unsplash \
  --http-proxy "$UNSPLASH_UPSTREAM_PROXY" \
  --access-key "$UNSPLASH_ACCESS_KEY" \
  --insecure \
  --clean
```

Результат:
- `unsplash-local/images/*.jpg`
- `unsplash-local/manifest.json`

## 6. Оптимизация изображений

```bash
python3 scripts/optimize_images.py
```

## 7. Vite-режим (опционально)

```bash
npm install
npm run dev
```

URL для проверки в Vite-режиме: `http://localhost:4173`

Другие команды:

```bash
npm run build
npm run preview
npm test
npm run test:e2e
```

## 8. PWA/service worker

- Файл: `sw.js`
- Core cache включает:
  - `/`
  - `/index.html`
  - `/assets/img/optimized/manifest.json`
  - `/unsplash-local/manifest.json`

## 9. Что считать источником правды

- Для frontend: только `index.html`.
- Для backend/API: `server.py`.
- Для инструкций: этот файл (`docs/PROJECT_GUIDE.md`).

import { useEffect, useState } from "react";

const UNSPLASH_CATEGORY = "Недавние фотографии";
const UNSPLASH_COUNT = 32;
const UNSPLASH_LOCAL_MANIFEST = "/unsplash-local/manifest.json";
const UNSPLASH_PROFILE_FALLBACK = "https://unsplash.com/@mihmihfoto";
const UNSPLASH_MEMORY_TTL_MS = 5 * 60 * 1000;

let cachedItems = [];
let cachedAt = 0;

function hasFreshMemoryData() {
  return cachedItems.length > 0 && (Date.now() - cachedAt) < UNSPLASH_MEMORY_TTL_MS;
}

function rememberItems(items) {
  cachedItems = Array.isArray(items) ? items.slice(0, UNSPLASH_COUNT) : [];
  cachedAt = Date.now();
}

function formatRuDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  } catch (_error) {
    return date.toLocaleDateString("ru-RU");
  }
}

function mapUnsplashData(data) {
  if (!Array.isArray(data)) return [];

  const items = [];
  for (let index = 0; index < data.length; index += 1) {
    const photo = data[index] || {};
    const urls = photo.urls || {};
    const thumb = String(urls.small || urls.regular || urls.full || photo.thumb || "").trim();
    const full = String(urls.full || urls.regular || urls.small || photo.full || thumb).trim();
    if (!thumb || !full) continue;

    const rawWidth = parseInt(photo.width || photo.imgW, 10);
    const rawHeight = parseInt(photo.height || photo.imgH, 10);
    const shotAt = photo.created_at || photo.updated_at || photo.shotAt || "";
    const dateLabel = formatRuDate(shotAt) || photo.dateLabel || "";

    items.push({
      id: String(photo.id || `unsplash_${index}`),
      title: dateLabel || "Дата не указана",
      category: UNSPLASH_CATEGORY,
      desc: String(photo.desc || ""),
      shotAt: String(shotAt || ""),
      dateLabel: String(dateLabel || ""),
      thumb,
      full,
      imgW: rawWidth > 0 ? rawWidth : 0,
      imgH: rawHeight > 0 ? rawHeight : 0,
      origin: String(photo.origin || "unsplash")
    });
  }

  return items;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: options.headers || {},
      signal: controller.signal,
      cache: options.cache || "default"
    });

    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }

    if (options.responseType === "text") {
      return await response.text();
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchLocalManifest() {
  const data = await requestJson(`${UNSPLASH_LOCAL_MANIFEST}?v=${Date.now()}`, {
    timeoutMs: 2600,
    cache: "no-store"
  });
  return mapUnsplashData(data?.photos || []);
}

function buildProxyUrl(pathname) {
  return `/proxy/unsplash${pathname}`;
}

async function fetchViaProxy(username) {
  const data = await requestJson(
    buildProxyUrl(`/public/users/${encodeURIComponent(username)}/photos?per_page=${UNSPLASH_COUNT}&order_by=latest`),
    { timeoutMs: 12000 }
  );
  return mapUnsplashData(data);
}

async function fetchViaJina(username) {
  const text = await requestJson(
    `https://r.jina.ai/http://unsplash.com/napi/users/${encodeURIComponent(username)}/photos?per_page=${UNSPLASH_COUNT}&order_by=latest`,
    { timeoutMs: 14000, responseType: "text" }
  );

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) {
    throw new Error("jina_parse_error");
  }

  return mapUnsplashData(JSON.parse(text.slice(start, end + 1)));
}

function parseUsername() {
  const match = /@([A-Za-z0-9_-]+)/.exec(UNSPLASH_PROFILE_FALLBACK);
  return match?.[1] || "mihmihfoto";
}

export function useUnsplashGallery({ active, trackEvent }) {
  const [state, setState] = useState({
    items: [],
    source: "",
    status: "idle",
    message: "Открой вкладку — сначала покажу локальный кэш, затем при необходимости обновлю из Unsplash."
  });

  useEffect(() => {
    if (!active) return undefined;

    if (hasFreshMemoryData()) {
      setState({
        items: cachedItems,
        source: "memory_cache",
        status: "ready",
        message: ""
      });
      trackEvent("unsplash_loaded", { source: "memory_cache", count: cachedItems.length });
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setState((current) => ({
        items: current.items,
        source: "",
        status: "loading",
        message: "Проверяю локальный кэш фото…"
      }));

      const username = parseUsername();
      const sources = [
        { name: "local_manifest", run: fetchLocalManifest },
        { name: "proxy_public", run: () => fetchViaProxy(username) },
        { name: "jina_fallback", run: () => fetchViaJina(username) }
      ];

      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index];
        try {
          const items = await source.run();
          if (!items.length) continue;
          if (cancelled) return;

          const topItems = items.slice(0, UNSPLASH_COUNT);
          rememberItems(topItems);
          setState({
            items: topItems,
            source: source.name,
            status: "ready",
            message: ""
          });
          trackEvent("unsplash_loaded", { source: source.name, count: topItems.length });
          return;
        } catch (_error) {
          // Try the next source.
        }
      }

      if (cancelled) return;
      setState({
        items: [],
        source: "",
        status: "error",
        message: "Не удалось загрузить фото из локального кэша и Unsplash. Запусти: python3 scripts/unsplash_sync.py"
      });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [active, trackEvent]);

  return state;
}

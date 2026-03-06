import { useEffect, useRef } from "react";

const ANALYTICS_FLUSH_DELAY_MS = 2200;
const ANALYTICS_MAX_QUEUE = 120;

export function useAnalytics() {
  const queueRef = useRef([]);
  const flushTimerRef = useRef(null);

  const flushAnalyticsRef = useRef(null);
  if (!flushAnalyticsRef.current) {
    flushAnalyticsRef.current = () => {
      if (!queueRef.current.length) return;

      const payload = queueRef.current.splice(0, queueRef.current.length);
      const body = JSON.stringify({
        events: payload,
        page: window.location.pathname,
        ts: Date.now()
      });

      if (navigator.sendBeacon) {
        try {
          const sent = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
          if (sent) return;
        } catch (_error) {
          // Fall back to fetch below.
        }
      }

      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true
      }).catch(() => {
        // Best-effort analytics.
      });
    };
  }

  const scheduleFlushRef = useRef(null);
  if (!scheduleFlushRef.current) {
    scheduleFlushRef.current = () => {
      if (flushTimerRef.current) return;

      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushAnalyticsRef.current();
      }, ANALYTICS_FLUSH_DELAY_MS);
    };
  }

  const trackEventRef = useRef(null);
  if (!trackEventRef.current) {
    trackEventRef.current = (name, data = {}) => {
      if (queueRef.current.length >= ANALYTICS_MAX_QUEUE) {
        queueRef.current.shift();
      }

      queueRef.current.push({
        name: String(name || "unknown"),
        data,
        at: Date.now()
      });
      scheduleFlushRef.current();
    };
  }

  useEffect(() => {
    const flush = () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushAnalyticsRef.current();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, []);

  return {
    trackEvent: trackEventRef.current
  };
}

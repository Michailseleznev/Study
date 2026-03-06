import { useEffect, useRef } from "react";
import {
  computeMobileGlowLayoutMetrics,
  DESKTOP_GLOW_LAYOUT,
  DESKTOP_UNSPLASH_GLOW_TOP
} from "../lib/glowLayout";

const TAB_CLASS_MAP = {
  "tab-portraits": "tabs-portraits",
  "tab-creative": "tabs-creative",
  "tab-nature": "tabs-nature",
  "tab-stock": "tabs-stock",
  "tab-studio": "tabs-studio",
  "tab-unsplash": "tabs-unsplash"
};

const TAB_CLASS_LIST = Object.values(TAB_CLASS_MAP);

const TAB_PALETTES = {
  "tab-studio": ["90,230,230", "70,190,255", "40,130,210"],
  "tab-portraits": ["255,120,220", "200,110,255", "120,85,230"],
  "tab-creative": ["86,180,255", "82,120,250", "133,96,255"],
  "tab-stock": ["255,146,126", "255,106,186", "120,145,255"],
  "tab-nature": ["255,170,90", "255,105,80", "200,60,80"],
  "tab-unsplash": ["255,145,170", "255,195,125", "196,120,255"]
};

const TAB_LINE_MAP = {
  "tab-studio": ["glowA", "glowB", "glowA", "glowB", "glowC"],
  "tab-portraits": ["glowC", "glowA", "glowC", "glowA", "glowC"],
  "tab-creative": ["glowA", "glowB", "glowC", "glowA", "glowB"],
  "tab-stock": ["glowA", "glowA", "glowB", "glowC", "glowA"],
  "tab-nature": ["glowA", "glowA", "glowB", "glowA", "glowB"],
  "tab-unsplash": ["glowB", "glowA", "glowB", "glowC", "glowB"]
};

const TAB_PANEL_MAP = {
  "tab-creative": ".grid-panel--creative",
  "tab-portraits": ".grid-panel--portraits",
  "tab-nature": ".grid-panel--nature",
  "tab-stock": ".grid-panel--stock",
  "tab-studio": ".grid-panel--studio",
  "tab-unsplash": ".grid-panel--unsplash"
};

function isMobileViewport() {
  return Boolean(window.matchMedia && window.matchMedia("(max-width: 980px)").matches);
}

function isLowPerfDevice() {
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const memory = Number(navigator.deviceMemory) || 0;
  return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
}

function getGlowTimingProfile() {
  const mobile = isMobileViewport();
  const lowPerf = isLowPerfDevice();

  if (mobile && lowPerf) {
    return {
      durationMs: 1600,
      delayStepMs: 70,
      pulseDelayMs: 44,
      minRepeatGapMs: 260
    };
  }

  if (mobile) {
    return {
      durationMs: 1850,
      delayStepMs: 90,
      pulseDelayMs: 52,
      minRepeatGapMs: 220
    };
  }

  return {
    durationMs: 2200,
    delayStepMs: 120,
    pulseDelayMs: 60,
    minRepeatGapMs: 180,
    stopAfterMs: 3000
  };
}

function normalizeRgb(value) {
  if (!value) return "";
  return value.toString().replace(/\s+/g, "").trim();
}

function rgbStringToArray(rgbString) {
  return rgbString.split(",").map((value) => parseInt(value, 10));
}

function rgbToHsl(red, green, blue) {
  let r = red / 255;
  let g = green / 255;
  let b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        hue = ((g - b) / delta) + (g < b ? 6 : 0);
        break;
      case g:
        hue = ((b - r) / delta) + 2;
        break;
      default:
        hue = ((r - g) / delta) + 4;
        break;
    }

    hue /= 6;
  }

  return [hue, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return [value, value, value];
  }

  const hue2rgb = (p, q, t) => {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + ((q - p) * 6 * next);
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + ((q - p) * (2 / 3 - next) * 6);
    return p;
  };

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - (lightness * saturation);
  const p = (2 * lightness) - q;

  return [
    Math.round(hue2rgb(p, q, hue + (1 / 3)) * 255),
    Math.round(hue2rgb(p, q, hue) * 255),
    Math.round(hue2rgb(p, q, hue - (1 / 3)) * 255)
  ];
}

function boostLineColor(rgbString, saturationBoost, lightnessBoost) {
  try {
    const [red, green, blue] = rgbStringToArray(rgbString);
    if (![red, green, blue].every(Number.isFinite)) return rgbString;

    const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
    const boostedSaturation = Math.min(1, saturation * (1 + saturationBoost));
    const boostedLightness = Math.min(0.92, lightness + lightnessBoost);
    return hslToRgb(hue, boostedSaturation, boostedLightness).join(",");
  } catch (_error) {
    return rgbString;
  }
}

function readPositiveFloat(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getPanelByTabId(tabId) {
  const grid = document.getElementById("grid");
  if (!grid || !tabId || !TAB_PANEL_MAP[tabId]) return null;
  return grid.querySelector(TAB_PANEL_MAP[tabId]);
}

function calcPanelHeight(panel, mobile) {
  const rect = panel.getBoundingClientRect();
  const measuredHeight = Math.max(panel.scrollHeight || 0, panel.offsetHeight || 0, rect.height || 0);
  if (panel.classList.contains("grid-panel--unsplash")) {
    return Math.max(measuredHeight, mobile ? 560 : 520);
  }
  return Math.max(measuredHeight, mobile ? 420 : 340);
}

export function usePortfolioGlow(activeTab, contentVersion = 0) {
  const activeTabRef = useRef(activeTab);
  const pathCacheRef = useRef(null);
  const glowReadyRef = useRef(false);
  const rafRef = useRef({ layout: 0, first: 0, second: 0 });
  const timeoutRef = useRef({ start: 0, stop: 0 });
  const observerRef = useRef({ resize: null, mutation: null });
  const pulseRef = useRef({ lastTabId: "", lastAt: 0 });
  const prevTabRef = useRef("");

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const getGlowElement = () => document.getElementById("tabGlow");

    const getGlowPaths = () => {
      const glow = getGlowElement();
      if (!glow) return null;
      if (!pathCacheRef.current) {
        pathCacheRef.current = {
          a: glow.querySelector(".glow-path.a"),
          b: glow.querySelector(".glow-path.b"),
          c: glow.querySelector(".glow-path.c"),
          d: glow.querySelector(".glow-path.d"),
          e: glow.querySelector(".glow-path.e")
        };
      }
      return pathCacheRef.current;
    };

    const initGlowPaths = () => {
      if (glowReadyRef.current) return;
      const paths = getGlowPaths();
      if (!paths) return;

      Object.values(paths).forEach((path) => {
        if (!path) return;
        path.style.setProperty("--dash-len", path.getTotalLength().toFixed(2));
      });
      glowReadyRef.current = true;
    };

    const applyGlowStops = (first, second, third) => {
      const glow = getGlowElement();
      if (!glow) return;
      glow.style.setProperty("--glow-a", `rgba(${first},1)`);
      glow.style.setProperty("--glow-b", `rgba(${second},0.98)`);
      glow.style.setProperty("--glow-c", `rgba(${third},0.96)`);
    };

    const applyLineMap = (tabId) => {
      const paths = getGlowPaths();
      if (!paths) return;
      const map = TAB_LINE_MAP[tabId] || ["glowA", "glowB", "glowC", "glowB", "glowA"];
      if (paths.a) paths.a.setAttribute("stroke", `url(#${map[0]})`);
      if (paths.b) paths.b.setAttribute("stroke", `url(#${map[1]})`);
      if (paths.c) paths.c.setAttribute("stroke", `url(#${map[2]})`);
      if (paths.d) paths.d.setAttribute("stroke", `url(#${map[3]})`);
      if (paths.e) paths.e.setAttribute("stroke", `url(#${map[4]})`);
    };

    const readLabelPalette = (tabId) => {
      const label = document.querySelector(`.tabs label[for="${tabId}"]`);
      if (!label) return null;
      const styles = window.getComputedStyle(label);
      const first = normalizeRgb(styles.getPropertyValue("--tab-a"));
      const second = normalizeRgb(styles.getPropertyValue("--tab-b"));
      const third = normalizeRgb(styles.getPropertyValue("--tab-c"));
      return first && second && third ? [first, second, third] : null;
    };

    const applyTheme = (tabId) => {
      const body = document.body;
      TAB_CLASS_LIST.forEach((className) => {
        body.classList.remove(className);
      });
      if (TAB_CLASS_MAP[tabId]) {
        body.classList.add(TAB_CLASS_MAP[tabId]);
      }

      const palette = readLabelPalette(tabId) || TAB_PALETTES[tabId];
      if (palette) {
        const first = boostLineColor(palette[0], 0.25, 0.12);
        const second = boostLineColor(palette[1], 0.25, 0.12);
        const third = boostLineColor(palette[2], 0.25, 0.12);
        body.style.setProperty("--ga", first);
        body.style.setProperty("--gb", second);
        body.style.setProperty("--gc", third);
        applyGlowStops(first, second, third);
      } else {
        body.style.removeProperty("--ga");
        body.style.removeProperty("--gb");
        body.style.removeProperty("--gc");
      }

      initGlowPaths();
      applyLineMap(tabId);
    };

    const applyGlowLayout = (tabId) => {
      const glow = getGlowElement();
      const grid = document.getElementById("grid");
      const panel = getPanelByTabId(tabId);
      if (!glow || !grid || !panel) return;

      const mobile = isMobileViewport();
      const gridRect = grid.getBoundingClientRect();
      const panelHeight = calcPanelHeight(panel, mobile);
      const gridWidth = Math.max(grid.clientWidth || 0, gridRect.width || 0, window.innerWidth || 0);

      glow.style.left = "50%";
      if (mobile) {
        const documentElement = document.documentElement;
        const bodyElement = document.body;
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        const heroMedia = document.querySelector(".hero-media") || document.getElementById("heroImg");
        const heroRect = heroMedia?.getBoundingClientRect?.() || null;
        const heroBottomDoc = heroRect ? (heroRect.bottom + scrollTop) : Number.NaN;
        const siteBottomDoc = Math.max(
          documentElement?.scrollHeight || 0,
          documentElement?.offsetHeight || 0,
          documentElement?.clientHeight || 0,
          bodyElement?.scrollHeight || 0,
          bodyElement?.offsetHeight || 0,
          bodyElement?.clientHeight || 0
        );
        const mobileLayout = computeMobileGlowLayoutMetrics({
          panelHeight,
          gridWidth,
          viewportHeight: window.innerHeight || 0,
          viewportWidth: window.innerWidth || 0,
          gridTopDoc: gridRect.top + scrollTop,
          heroBottomDoc,
          siteBottomDoc
        });

        glow.style.top = `${mobileLayout.top}px`;
        glow.style.width = `${mobileLayout.width}px`;
        glow.style.height = `${mobileLayout.height}px`;
        glow.style.transform = "translate3d(-50%, -50%, 0) rotate(-90deg)";
        return;
      }

      if (tabId === "tab-unsplash") {
        const unsplashTop = Math.min(
          Math.max(panelHeight * DESKTOP_UNSPLASH_GLOW_TOP.fromPanel, DESKTOP_UNSPLASH_GLOW_TOP.minPx),
          DESKTOP_UNSPLASH_GLOW_TOP.maxPx
        );
        glow.style.top = `${Math.round(unsplashTop)}px`;
      } else {
        glow.style.top = "50%";
      }

      const desktopSweep = Math.min(
        DESKTOP_GLOW_LAYOUT.maxSweepPx,
        Math.max(gridWidth * DESKTOP_GLOW_LAYOUT.sweepFromGrid, DESKTOP_GLOW_LAYOUT.minSweepPx)
      );
      const desktopBand = Math.min(
        DESKTOP_GLOW_LAYOUT.maxBandPx,
        Math.max(panelHeight * DESKTOP_GLOW_LAYOUT.bandFromPanel, (window.innerHeight || 0) * DESKTOP_GLOW_LAYOUT.bandFromViewport)
      );

      glow.style.width = `${Math.round(desktopSweep)}px`;
      glow.style.height = `${Math.round(desktopBand)}px`;
      glow.style.transform = "translate3d(-50%, -50%, 0)";
    };

    const scheduleGlowLayout = (tabId) => {
      if (rafRef.current.layout) cancelAnimationFrame(rafRef.current.layout);
      rafRef.current.layout = requestAnimationFrame(() => {
        applyGlowLayout(tabId);
      });
    };

    const playGlow = () => {
      const glow = getGlowElement();
      if (!glow) return;
      const timing = getGlowTimingProfile();
      const stopAfter = timing.stopAfterMs || (timing.durationMs + (timing.delayStepMs * 4) + 260);

      glow.style.setProperty("--glow-run-duration", `${timing.durationMs}ms`);
      glow.style.setProperty("--glow-delay-step", `${timing.delayStepMs}ms`);
      glow.classList.remove("run");

      if (rafRef.current.first) cancelAnimationFrame(rafRef.current.first);
      if (rafRef.current.second) cancelAnimationFrame(rafRef.current.second);
      rafRef.current.first = requestAnimationFrame(() => {
        rafRef.current.second = requestAnimationFrame(() => {
          glow.classList.add("run");
        });
      });

      if (timeoutRef.current.stop) clearTimeout(timeoutRef.current.stop);
      timeoutRef.current.stop = window.setTimeout(() => {
        glow.classList.remove("run");
      }, stopAfter);
    };

    const pulseGlow = (tabId) => {
      const timing = getGlowTimingProfile();
      const now = Date.now();
      if (pulseRef.current.lastTabId === tabId && (now - pulseRef.current.lastAt) < timing.minRepeatGapMs) {
        return;
      }

      pulseRef.current.lastTabId = tabId;
      pulseRef.current.lastAt = now;

      if (timeoutRef.current.start) clearTimeout(timeoutRef.current.start);
      timeoutRef.current.start = window.setTimeout(() => {
        applyTheme(tabId);
        scheduleGlowLayout(tabId);
        playGlow();
      }, timing.pulseDelayMs);
    };

    const handleResize = () => {
      scheduleGlowLayout(activeTabRef.current);
    };

    const handleImageLoad = (event) => {
      const target = event?.target;
      if (!target || target.tagName !== "IMG" || !target.closest?.("#grid")) return;
      scheduleGlowLayout(activeTabRef.current);
    };

    initGlowPaths();
    applyTheme(activeTabRef.current);
    scheduleGlowLayout(activeTabRef.current);

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize);
    document.addEventListener("load", handleImageLoad, true);

    const grid = document.getElementById("grid");
    if (grid && window.ResizeObserver) {
      observerRef.current.resize = new ResizeObserver(() => {
        scheduleGlowLayout(activeTabRef.current);
      });
      observerRef.current.resize.observe(grid);
      grid.querySelectorAll(".grid-panel").forEach((panel) => {
        observerRef.current.resize.observe(panel);
      });
    }

    if (grid && window.MutationObserver) {
      let mutationTimer = 0;
      observerRef.current.mutation = new MutationObserver((mutations) => {
        const hasNodes = mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length);
        if (!hasNodes) return;

        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = window.setTimeout(() => {
          mutationTimer = 0;
          scheduleGlowLayout(activeTabRef.current);
        }, 120);
      });
      observerRef.current.mutation.observe(grid, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("load", handleImageLoad, true);

      if (observerRef.current.resize) observerRef.current.resize.disconnect();
      if (observerRef.current.mutation) observerRef.current.mutation.disconnect();
      if (timeoutRef.current.start) clearTimeout(timeoutRef.current.start);
      if (timeoutRef.current.stop) clearTimeout(timeoutRef.current.stop);
      if (rafRef.current.layout) cancelAnimationFrame(rafRef.current.layout);
      if (rafRef.current.first) cancelAnimationFrame(rafRef.current.first);
      if (rafRef.current.second) cancelAnimationFrame(rafRef.current.second);
    };
  }, []);

  useEffect(() => {
    if (!activeTab) return;

    const body = document.body;
    TAB_CLASS_LIST.forEach((className) => {
      body.classList.remove(className);
    });
    if (TAB_CLASS_MAP[activeTab]) {
      body.classList.add(TAB_CLASS_MAP[activeTab]);
    }

    const label = document.querySelector(`.tabs label[for="${activeTab}"]`);
    const styles = label ? window.getComputedStyle(label) : null;
    const palette = styles
      ? [
        normalizeRgb(styles.getPropertyValue("--tab-a")),
        normalizeRgb(styles.getPropertyValue("--tab-b")),
        normalizeRgb(styles.getPropertyValue("--tab-c"))
      ]
      : null;
    const fallbackPalette = palette?.every(Boolean) ? palette : TAB_PALETTES[activeTab];

    if (fallbackPalette) {
      body.style.setProperty("--ga", boostLineColor(fallbackPalette[0], 0.25, 0.12));
      body.style.setProperty("--gb", boostLineColor(fallbackPalette[1], 0.25, 0.12));
      body.style.setProperty("--gc", boostLineColor(fallbackPalette[2], 0.25, 0.12));
    }

    const glow = document.getElementById("tabGlow");
    const paths = pathCacheRef.current || {
      a: glow?.querySelector(".glow-path.a"),
      b: glow?.querySelector(".glow-path.b"),
      c: glow?.querySelector(".glow-path.c"),
      d: glow?.querySelector(".glow-path.d"),
      e: glow?.querySelector(".glow-path.e")
    };
    pathCacheRef.current = paths;

    const map = TAB_LINE_MAP[activeTab] || ["glowA", "glowB", "glowC", "glowB", "glowA"];
    if (paths.a) paths.a.setAttribute("stroke", `url(#${map[0]})`);
    if (paths.b) paths.b.setAttribute("stroke", `url(#${map[1]})`);
    if (paths.c) paths.c.setAttribute("stroke", `url(#${map[2]})`);
    if (paths.d) paths.d.setAttribute("stroke", `url(#${map[3]})`);
    if (paths.e) paths.e.setAttribute("stroke", `url(#${map[4]})`);

    const activePanel = getPanelByTabId(activeTab);
    if (glow && activePanel) {
      const grid = document.getElementById("grid");
      if (grid) {
        const mobile = isMobileViewport();
        const gridRect = grid.getBoundingClientRect();
        const panelHeight = calcPanelHeight(activePanel, mobile);
        const gridWidth = Math.max(grid.clientWidth || 0, gridRect.width || 0, window.innerWidth || 0);

        glow.style.left = "50%";
        if (mobile) {
          const scrollTop = window.scrollY || window.pageYOffset || 0;
          const heroMedia = document.querySelector(".hero-media") || document.getElementById("heroImg");
          const heroRect = heroMedia?.getBoundingClientRect?.() || null;
          const documentElement = document.documentElement;
          const bodyElement = document.body;
          const mobileLayout = computeMobileGlowLayoutMetrics({
            panelHeight,
            gridWidth,
            viewportHeight: window.innerHeight || 0,
            viewportWidth: window.innerWidth || 0,
            gridTopDoc: gridRect.top + scrollTop,
            heroBottomDoc: heroRect ? (heroRect.bottom + scrollTop) : Number.NaN,
            siteBottomDoc: Math.max(
              documentElement?.scrollHeight || 0,
              documentElement?.offsetHeight || 0,
              documentElement?.clientHeight || 0,
              bodyElement?.scrollHeight || 0,
              bodyElement?.offsetHeight || 0,
              bodyElement?.clientHeight || 0
            )
          });

          glow.style.top = `${mobileLayout.top}px`;
          glow.style.width = `${mobileLayout.width}px`;
          glow.style.height = `${mobileLayout.height}px`;
          glow.style.transform = "translate3d(-50%, -50%, 0) rotate(-90deg)";
        } else {
          glow.style.top = activeTab === "tab-unsplash"
            ? `${Math.round(Math.min(
              Math.max(panelHeight * DESKTOP_UNSPLASH_GLOW_TOP.fromPanel, DESKTOP_UNSPLASH_GLOW_TOP.minPx),
              DESKTOP_UNSPLASH_GLOW_TOP.maxPx
            ))}px`
            : "50%";
          glow.style.width = `${Math.round(Math.min(
            DESKTOP_GLOW_LAYOUT.maxSweepPx,
            Math.max(gridWidth * DESKTOP_GLOW_LAYOUT.sweepFromGrid, DESKTOP_GLOW_LAYOUT.minSweepPx)
          ))}px`;
          glow.style.height = `${Math.round(Math.min(
            DESKTOP_GLOW_LAYOUT.maxBandPx,
            Math.max(panelHeight * DESKTOP_GLOW_LAYOUT.bandFromPanel, (window.innerHeight || 0) * DESKTOP_GLOW_LAYOUT.bandFromViewport)
          ))}px`;
          glow.style.transform = "translate3d(-50%, -50%, 0)";
        }
      }
    }

    if (prevTabRef.current && prevTabRef.current !== activeTab && glow) {
      const timing = getGlowTimingProfile();
      const now = Date.now();
      const shouldSkip = pulseRef.current.lastTabId === activeTab
        && (now - pulseRef.current.lastAt) < timing.minRepeatGapMs;

      if (!shouldSkip) {
        pulseRef.current.lastTabId = activeTab;
        pulseRef.current.lastAt = now;
        if (timeoutRef.current.start) clearTimeout(timeoutRef.current.start);
        timeoutRef.current.start = window.setTimeout(() => {
          glow.classList.remove("run");
          if (rafRef.current.first) cancelAnimationFrame(rafRef.current.first);
          if (rafRef.current.second) cancelAnimationFrame(rafRef.current.second);

          glow.style.setProperty("--glow-run-duration", `${timing.durationMs}ms`);
          glow.style.setProperty("--glow-delay-step", `${timing.delayStepMs}ms`);
          rafRef.current.first = requestAnimationFrame(() => {
            rafRef.current.second = requestAnimationFrame(() => {
              glow.classList.add("run");
            });
          });

          if (timeoutRef.current.stop) clearTimeout(timeoutRef.current.stop);
          timeoutRef.current.stop = window.setTimeout(() => {
            glow.classList.remove("run");
          }, timing.stopAfterMs || (timing.durationMs + (timing.delayStepMs * 4) + 260));
        }, timing.pulseDelayMs);
      }
    }

    prevTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab) return;

    const grid = document.getElementById("grid");
    const glow = document.getElementById("tabGlow");
    const panel = getPanelByTabId(activeTab);
    if (!grid || !glow || !panel) return;

    const mobile = isMobileViewport();
    const gridRect = grid.getBoundingClientRect();
    const panelHeight = calcPanelHeight(panel, mobile);
    const gridWidth = Math.max(grid.clientWidth || 0, gridRect.width || 0, window.innerWidth || 0);

    glow.style.left = "50%";
    if (mobile) {
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const heroMedia = document.querySelector(".hero-media") || document.getElementById("heroImg");
      const heroRect = heroMedia?.getBoundingClientRect?.() || null;
      const documentElement = document.documentElement;
      const bodyElement = document.body;
      const mobileLayout = computeMobileGlowLayoutMetrics({
        panelHeight,
        gridWidth,
        viewportHeight: window.innerHeight || 0,
        viewportWidth: window.innerWidth || 0,
        gridTopDoc: gridRect.top + scrollTop,
        heroBottomDoc: heroRect ? (heroRect.bottom + scrollTop) : Number.NaN,
        siteBottomDoc: Math.max(
          documentElement?.scrollHeight || 0,
          documentElement?.offsetHeight || 0,
          documentElement?.clientHeight || 0,
          bodyElement?.scrollHeight || 0,
          bodyElement?.offsetHeight || 0,
          bodyElement?.clientHeight || 0
        )
      });
      glow.style.top = `${mobileLayout.top}px`;
      glow.style.width = `${mobileLayout.width}px`;
      glow.style.height = `${mobileLayout.height}px`;
      glow.style.transform = "translate3d(-50%, -50%, 0) rotate(-90deg)";
      return;
    }

    glow.style.top = activeTab === "tab-unsplash"
      ? `${Math.round(Math.min(
        Math.max(panelHeight * DESKTOP_UNSPLASH_GLOW_TOP.fromPanel, DESKTOP_UNSPLASH_GLOW_TOP.minPx),
        DESKTOP_UNSPLASH_GLOW_TOP.maxPx
      ))}px`
      : "50%";
    glow.style.width = `${Math.round(Math.min(
      DESKTOP_GLOW_LAYOUT.maxSweepPx,
      Math.max(gridWidth * DESKTOP_GLOW_LAYOUT.sweepFromGrid, DESKTOP_GLOW_LAYOUT.minSweepPx)
    ))}px`;
    glow.style.height = `${Math.round(Math.min(
      DESKTOP_GLOW_LAYOUT.maxBandPx,
      Math.max(panelHeight * DESKTOP_GLOW_LAYOUT.bandFromPanel, (window.innerHeight || 0) * DESKTOP_GLOW_LAYOUT.bandFromViewport)
    ))}px`;
    glow.style.transform = "translate3d(-50%, -50%, 0)";
  }, [activeTab, contentVersion]);
}

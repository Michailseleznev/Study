export const MOBILE_GLOW_LAYOUT = {
  fallbackSweepFromPanel: 1.12,
  fallbackSweepFromViewport: 1.9,
  minSweepFromViewport: 1.15,
  minSweepPx: 520,
  heroSpanPadding: 1.02,
  maxSweepWithHeroPx: 20000,
  maxSweepFallbackPx: 7200,
  centerFromPanel: 0.5,
  centerFromViewport: 0.5,
  minCenterPx: 260,
  bandFromGrid: 1.9,
  bandFromViewport: 1.7,
  minBandPx: 520,
  maxBandPx: 1800
};

export const DESKTOP_GLOW_LAYOUT = {
  sweepFromGrid: 1.18,
  minSweepPx: 980,
  maxSweepPx: 1800,
  bandFromPanel: 0.5,
  bandFromViewport: 0.82,
  maxBandPx: 1100
};

export const DESKTOP_UNSPLASH_GLOW_TOP = {
  fromPanel: 0.09,
  minPx: 150,
  maxPx: 280
};

export function computeDesktopGlowTop(tabId, panelHeight) {
  if (tabId !== "tab-unsplash") return "50%";

  const measuredPanelHeight = Math.max(0, Number(panelHeight) || 0);
  const top = Math.min(
    Math.max(measuredPanelHeight * DESKTOP_UNSPLASH_GLOW_TOP.fromPanel, DESKTOP_UNSPLASH_GLOW_TOP.minPx),
    DESKTOP_UNSPLASH_GLOW_TOP.maxPx
  );

  return `${Math.round(top)}px`;
}

export function computeMobileGlowLayoutMetrics(input) {
  const panelHeight = Math.max(0, Number(input?.panelHeight) || 0);
  const gridWidth = Math.max(0, Number(input?.gridWidth) || 0);
  const viewportHeight = Math.max(0, Number(input?.viewportHeight) || 0);
  const viewportWidth = Math.max(0, Number(input?.viewportWidth) || 0);

  let gridTopDoc = Number(input?.gridTopDoc);
  if (!Number.isFinite(gridTopDoc)) gridTopDoc = 0;

  const heroBottomDoc = Number(input?.heroBottomDoc);
  const siteBottomDoc = Number(input?.siteBottomDoc);
  const hasHeroSpan = Number.isFinite(heroBottomDoc) && Number.isFinite(siteBottomDoc) && siteBottomDoc > heroBottomDoc;

  const startY = hasHeroSpan ? heroBottomDoc - gridTopDoc : 0;
  const endY = hasHeroSpan ? siteBottomDoc - gridTopDoc : 0;
  const rawSweep = hasHeroSpan
    ? endY - startY
    : Math.max(
      panelHeight * MOBILE_GLOW_LAYOUT.fallbackSweepFromPanel,
      viewportHeight * MOBILE_GLOW_LAYOUT.fallbackSweepFromViewport
    );

  let sweep = Math.max(
    rawSweep,
    viewportHeight * MOBILE_GLOW_LAYOUT.minSweepFromViewport,
    MOBILE_GLOW_LAYOUT.minSweepPx
  );
  sweep = hasHeroSpan
    ? Math.min(MOBILE_GLOW_LAYOUT.maxSweepWithHeroPx, sweep * MOBILE_GLOW_LAYOUT.heroSpanPadding)
    : Math.min(MOBILE_GLOW_LAYOUT.maxSweepFallbackPx, sweep);

  const centerY = hasHeroSpan
    ? (startY + endY) / 2
    : Math.max(
      panelHeight * MOBILE_GLOW_LAYOUT.centerFromPanel,
      viewportHeight * MOBILE_GLOW_LAYOUT.centerFromViewport,
      MOBILE_GLOW_LAYOUT.minCenterPx
    );

  const band = Math.min(
    MOBILE_GLOW_LAYOUT.maxBandPx,
    Math.max(
      gridWidth * MOBILE_GLOW_LAYOUT.bandFromGrid,
      viewportWidth * MOBILE_GLOW_LAYOUT.bandFromViewport,
      MOBILE_GLOW_LAYOUT.minBandPx
    )
  );

  return {
    top: Math.round(centerY),
    width: Math.round(sweep),
    height: Math.round(band)
  };
}

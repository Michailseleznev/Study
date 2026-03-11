const MOBILE_VIEWPORT_QUERY = "(max-width: 980px)";

export function isMobileViewport() {
  return Boolean(window.matchMedia && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches);
}

export function isLowPerfDevice() {
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const memory = Number(navigator.deviceMemory) || 0;
  return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
}

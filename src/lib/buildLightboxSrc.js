export function buildLightboxSrc(src) {
  return String(src || "").replace(/-(480|960)\.(avif|webp|jpe?g)$/i, "-1600.$2");
}

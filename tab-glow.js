const MOBILE_GLOW_LAYOUT = {
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

const DESKTOP_GLOW_LAYOUT = {
  sweepFromGrid: 1.18,
  minSweepPx: 980,
  maxSweepPx: 1800,
  bandFromPanel: 0.5,
  bandFromViewport: 0.82,
  maxBandPx: 1100
};

const DESKTOP_UNSPLASH_GLOW_TOP = {
  fromPanel: 0.09,
  minPx: 150,
  maxPx: 280
};

export function computeMobileGlowLayoutMetrics(input){
  input = input || {};

  var panelHeight = Math.max(0, Number(input.panelHeight) || 0);
  var gridWidth = Math.max(0, Number(input.gridWidth) || 0);
  var viewportHeight = Math.max(0, Number(input.viewportHeight) || 0);
  var viewportWidth = Math.max(0, Number(input.viewportWidth) || 0);

  var gridTopDoc = Number(input.gridTopDoc);
  if (!isFinite(gridTopDoc)) gridTopDoc = 0;

  var heroBottomDoc = Number(input.heroBottomDoc);
  var siteBottomDoc = Number(input.siteBottomDoc);
  var hasHeroSpan = isFinite(heroBottomDoc) && isFinite(siteBottomDoc) && siteBottomDoc > heroBottomDoc;

  var startY = hasHeroSpan ? (heroBottomDoc - gridTopDoc) : 0;
  var endY = hasHeroSpan ? (siteBottomDoc - gridTopDoc) : 0;
  var rawSweep = hasHeroSpan
    ? (endY - startY)
    : Math.max(
      panelHeight * MOBILE_GLOW_LAYOUT.fallbackSweepFromPanel,
      viewportHeight * MOBILE_GLOW_LAYOUT.fallbackSweepFromViewport
    );

  var sweep = Math.max(
    rawSweep,
    viewportHeight * MOBILE_GLOW_LAYOUT.minSweepFromViewport,
    MOBILE_GLOW_LAYOUT.minSweepPx
  );
  sweep = hasHeroSpan
    ? Math.min(MOBILE_GLOW_LAYOUT.maxSweepWithHeroPx, sweep * MOBILE_GLOW_LAYOUT.heroSpanPadding)
    : Math.min(MOBILE_GLOW_LAYOUT.maxSweepFallbackPx, sweep);

  var centerY;
  if (hasHeroSpan) {
    centerY = (startY + endY) / 2;
  } else {
    centerY = Math.max(
      panelHeight * MOBILE_GLOW_LAYOUT.centerFromPanel,
      viewportHeight * MOBILE_GLOW_LAYOUT.centerFromViewport,
      MOBILE_GLOW_LAYOUT.minCenterPx
    );
  }

  var band = Math.min(
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

if (typeof document !== "undefined") {
(function(){
  function bind(){
    var body = document.body;
    var inputs = document.querySelectorAll('.tab-input[name="workTabs"]');
    var labels = document.querySelectorAll('.tabs label[for]');
    var startTimer = null;
    var stopTimer = null;
    var rafA = null;
    var rafB = null;
    var lastPulseId = "";
    var lastPulseAt = 0;
    var classMap = {
      "tab-portraits": "tabs-portraits",
      "tab-creative": "tabs-creative",
      "tab-nature": "tabs-nature",
      "tab-stock": "tabs-stock",
      "tab-studio": "tabs-studio",
      "tab-unsplash": "tabs-unsplash"
    };
    var classList = ["tabs-portraits","tabs-creative","tabs-nature","tabs-stock","tabs-studio","tabs-unsplash"];
    var palette = {
      /* fallback palettes = match CSS button gradients (light/base/dark) */
      "tab-studio":    ["90,230,230",  "70,190,255",  "40,130,210"],
      "tab-portraits": ["255,120,220", "200,110,255", "120,85,230"],
      "tab-creative":  ["86,180,255",  "82,120,250",  "133,96,255"],
      "tab-stock":     ["255,146,126", "255,106,186", "120,145,255"],
      "tab-nature":    ["255,170,90",  "255,105,80",  "200,60,80"],
      "tab-unsplash":  ["255,145,170", "255,195,125", "196,120,255"]
    };
    var lineMap = {
      /* per-tab emphasis: more lines in dominant hues */
      "tab-studio":    ["glowA","glowB","glowA","glowB","glowC"],
      "tab-portraits": ["glowC","glowA","glowC","glowA","glowC"],
      "tab-creative":  ["glowA","glowB","glowC","glowA","glowB"],
      "tab-stock":     ["glowA","glowA","glowB","glowC","glowA"],
      "tab-nature":    ["glowA","glowA","glowB","glowA","glowB"],
      "tab-unsplash":  ["glowB","glowA","glowB","glowC","glowB"]
    };
    var glowPaths = null;
    var glowReady = false;
    var glowEl = null;
    var layoutRaf = null;
    var layoutObserversBound = false;
    var resizeObserver = null;
    var mutationObserver = null;
    var panelMap = {
      "tab-creative": ".grid-panel--creative",
      "tab-portraits": ".grid-panel--portraits",
      "tab-nature": ".grid-panel--nature",
      "tab-stock": ".grid-panel--stock",
      "tab-studio": ".grid-panel--studio",
      "tab-unsplash": ".grid-panel--unsplash"
    };

    function isMobileViewport(){
      return !!(window.matchMedia && window.matchMedia("(max-width: 980px)").matches);
    }

    function isLowPerfDevice(){
      var cores = Number(navigator.hardwareConcurrency) || 0;
      var memory = Number(navigator.deviceMemory) || 0;
      return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
    }

    function getGlowTimingProfile(){
      var mobile = isMobileViewport();
      var lowPerf = isLowPerfDevice();

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

      if (lowPerf) {
        return {
          durationMs: 2000,
          delayStepMs: 100,
          pulseDelayMs: 56,
          minRepeatGapMs: 220
        };
      }

      return {
        durationMs: 2200,
        delayStepMs: 120,
        pulseDelayMs: 60,
        minRepeatGapMs: 180
      };
    }

    function getGlowPaths(){
      var glow = document.getElementById("tabGlow");
      if (!glow) return null;
      if (!glowPaths){
        glowPaths = {
          a: glow.querySelector(".glow-path.a"),
          b: glow.querySelector(".glow-path.b"),
          c: glow.querySelector(".glow-path.c"),
          d: glow.querySelector(".glow-path.d"),
          e: glow.querySelector(".glow-path.e")
        };
      }
      return glowPaths;
    }

    function getGlowEl(){
      if (glowEl) return glowEl;
      glowEl = document.getElementById("tabGlow");
      return glowEl;
    }

    function getActiveTabId(){
      for (var i = 0; i < inputs.length; i++){
        if (inputs[i].checked) return inputs[i].id;
      }
      return "";
    }

    function getPanelByTabId(id){
      var grid = document.getElementById("grid");
      if (!grid || !id || !panelMap[id]) return null;
      return grid.querySelector(panelMap[id]);
    }

    function readPositiveInt(value){
      var n = parseInt(value, 10);
      return isNaN(n) || n <= 0 ? 0 : n;
    }

    function readPositiveFloat(value){
      var n = parseFloat(value);
      return isNaN(n) || n <= 0 ? 0 : n;
    }

    function calcPanelHeight(panel, isMobile){
      var rect = panel.getBoundingClientRect();
      var measured = Math.max(panel.scrollHeight || 0, panel.offsetHeight || 0, rect.height || 0);
      if (panel.classList.contains("grid-panel--unsplash")) {
        return Math.max(measured, isMobile ? 560 : 520);
      }
      return Math.max(measured, isMobile ? 420 : 340);
    }

    function applyGlowLayout(id){
      var glow = getGlowEl();
      var grid = document.getElementById("grid");
      if (!glow || !grid) return;

      var activeId = id || getActiveTabId();
      var panel = getPanelByTabId(activeId);
      if (!panel) return;

      var isMobile = window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
      var gridRect = grid.getBoundingClientRect();
      var panelHeight = calcPanelHeight(panel, isMobile);
      var gridWidth = Math.max(grid.clientWidth || 0, gridRect.width || 0, window.innerWidth || 0);

      glow.style.left = "50%";
      if (isMobile){
        var docEl = document.documentElement;
        var bodyEl = document.body;
        var scrollTop = window.scrollY || window.pageYOffset || 0;
        var heroMedia = document.querySelector(".hero-media");
        if (!heroMedia) heroMedia = document.getElementById("heroImg");
        var heroRect = heroMedia && heroMedia.getBoundingClientRect ? heroMedia.getBoundingClientRect() : null;
        var heroBottomDoc = heroRect ? (heroRect.bottom + scrollTop) : NaN;
        var siteBottomDoc = Math.max(
          (docEl && docEl.scrollHeight) || 0,
          (docEl && docEl.offsetHeight) || 0,
          (docEl && docEl.clientHeight) || 0,
          (bodyEl && bodyEl.scrollHeight) || 0,
          (bodyEl && bodyEl.offsetHeight) || 0,
          (bodyEl && bodyEl.clientHeight) || 0
        );
        var mobileLayout = computeMobileGlowLayoutMetrics({
          panelHeight: panelHeight,
          gridWidth: gridWidth,
          viewportHeight: window.innerHeight || 0,
          viewportWidth: window.innerWidth || 0,
          gridTopDoc: gridRect.top + scrollTop,
          heroBottomDoc: heroBottomDoc,
          siteBottomDoc: siteBottomDoc
        });
        glow.style.top = mobileLayout.top + "px";
        glow.style.width = mobileLayout.width + "px";
        glow.style.height = mobileLayout.height + "px";
        glow.style.transform = "translate3d(-50%, -50%, 0) rotate(-90deg)";
      } else {
        if (activeId === "tab-unsplash") {
          var unsplashTop = Math.min(
            Math.max(panelHeight * DESKTOP_UNSPLASH_GLOW_TOP.fromPanel, DESKTOP_UNSPLASH_GLOW_TOP.minPx),
            DESKTOP_UNSPLASH_GLOW_TOP.maxPx
          );
          glow.style.top = Math.round(unsplashTop) + "px";
        } else {
          glow.style.top = "50%";
        }
        var desktopSweep = Math.min(
          DESKTOP_GLOW_LAYOUT.maxSweepPx,
          Math.max(gridWidth * DESKTOP_GLOW_LAYOUT.sweepFromGrid, DESKTOP_GLOW_LAYOUT.minSweepPx)
        );
        var desktopBand = Math.min(
          DESKTOP_GLOW_LAYOUT.maxBandPx,
          Math.max(
            panelHeight * DESKTOP_GLOW_LAYOUT.bandFromPanel,
            (window.innerHeight || 0) * DESKTOP_GLOW_LAYOUT.bandFromViewport
          )
        );
        glow.style.width = Math.round(desktopSweep) + "px";
        glow.style.height = Math.round(desktopBand) + "px";
        glow.style.transform = "translate3d(-50%, -50%, 0)";
      }
    }

    function scheduleGlowLayout(id){
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      layoutRaf = requestAnimationFrame(function(){
        applyGlowLayout(id);
      });
    }

    function bindGlowLayoutObservers(){
      if (layoutObserversBound) return;
      layoutObserversBound = true;

      var grid = document.getElementById("grid");
      if (!grid) return;

      window.addEventListener("resize", function(){ scheduleGlowLayout(); }, { passive: true });
      window.addEventListener("orientationchange", function(){ scheduleGlowLayout(); });

      document.addEventListener("load", function(evt){
        var target = evt && evt.target;
        if (!target || target.tagName !== "IMG" || !target.closest || !target.closest("#grid")) return;
        scheduleGlowLayout();
      }, true);

      if (window.ResizeObserver){
        resizeObserver = new ResizeObserver(function(){
          scheduleGlowLayout();
        });
        resizeObserver.observe(grid);
        var panels = grid.querySelectorAll(".grid-panel");
        for (var i = 0; i < panels.length; i++){
          resizeObserver.observe(panels[i]);
        }
      }

      if (window.MutationObserver){
        var mutationTimer = null;
        mutationObserver = new MutationObserver(function(mutations){
          var hasRelevantNodes = false;
          for (var m = 0; m < mutations.length; m++){
            if (mutations[m].addedNodes.length || mutations[m].removedNodes.length) {
              hasRelevantNodes = true;
              break;
            }
          }
          if (!hasRelevantNodes) return;
          if (mutationTimer) clearTimeout(mutationTimer);
          mutationTimer = setTimeout(function(){
            mutationTimer = null;
            scheduleGlowLayout();
          }, 120);
        });
        mutationObserver.observe(grid, { childList: true, subtree: true });
      }

      scheduleGlowLayout();
      setTimeout(function(){ scheduleGlowLayout(); }, 120);
    }

    function initGlowPaths(){
      if (glowReady) return;
      var paths = getGlowPaths();
      if (!paths) return;
      Object.keys(paths).forEach(function(key){
        var p = paths[key];
        if (!p) return;
        var len = p.getTotalLength();
        p.style.setProperty("--dash-len", len.toFixed(2));
      });
      glowReady = true;
    }

    function applyLineMap(id){
      var paths = getGlowPaths();
      if (!paths) return;
      var map = lineMap[id] || ["glowA","glowB","glowC","glowB","glowA"];
      if (paths.a) paths.a.setAttribute("stroke", "url(#" + map[0] + ")");
      if (paths.b) paths.b.setAttribute("stroke", "url(#" + map[1] + ")");
      if (paths.c) paths.c.setAttribute("stroke", "url(#" + map[2] + ")");
      if (paths.d) paths.d.setAttribute("stroke", "url(#" + map[3] + ")");
      if (paths.e) paths.e.setAttribute("stroke", "url(#" + map[4] + ")");
    }

    function normalizeRgb(value){
      if (!value) return "";
      return value.toString().replace(/\s+/g, "").trim();
    }

    function clamp(v){
      return Math.max(0, Math.min(255, v));
    }

    function rgbStrToArr(rgbStr){
      return rgbStr.split(",").map(function(v){ return parseInt(v, 10); });
    }

    function rgbToHsl(r, g, b){
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;
      if (max === min){
        h = s = 0;
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max){
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          default: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, l];
    }

    function hslToRgb(h, s, l){
      var r, g, b;
      if (s === 0){
        r = g = b = l;
      } else {
        function hue2rgb(p, q, t){
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function boostLineColor(rgbStr, satBoost, lightBoost){
      try {
        var arr = rgbStrToArr(rgbStr);
        if (arr.length !== 3 || isNaN(arr[0])) return rgbStr;
        var hsl = rgbToHsl(arr[0], arr[1], arr[2]);
        hsl[1] = Math.min(1, hsl[1] * (1 + satBoost));
        hsl[2] = Math.min(0.92, hsl[2] + lightBoost);
        var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
        return rgb.join(",");
      } catch (e) {
        return rgbStr;
      }
    }

    function applyGlowStops(ga, gb, gc){
      var glow = getGlowEl();
      if (!glow) return;
      glow.style.setProperty("--glow-a", "rgba(" + ga + ",1)");
      glow.style.setProperty("--glow-b", "rgba(" + gb + ",0.98)");
      glow.style.setProperty("--glow-c", "rgba(" + gc + ",0.96)");
    }

    function readLabelPalette(id){
      var label = document.querySelector('.tabs label[for="' + id + '"]');
      if (!label) return null;
      var styles = window.getComputedStyle(label);
      var a = normalizeRgb(styles.getPropertyValue("--tab-a"));
      var b = normalizeRgb(styles.getPropertyValue("--tab-b"));
      var c = normalizeRgb(styles.getPropertyValue("--tab-c"));
      if (!a || !b || !c) return null;
      return [a, b, c];
    }

    function clearClasses(){
      for (var i = 0; i < classList.length; i++){
        body.classList.remove(classList[i]);
      }
    }

    function applyTheme(id){
      clearClasses();
      if (classMap[id]) body.classList.add(classMap[id]);

      var p = readLabelPalette(id) || palette[id];
      if (p){
        var ga = boostLineColor(p[0], 0.25, 0.12);
        var gb = boostLineColor(p[1], 0.25, 0.12);
        var gc = boostLineColor(p[2], 0.25, 0.12);
        body.style.setProperty("--ga", ga);
        body.style.setProperty("--gb", gb);
        body.style.setProperty("--gc", gc);
        applyGlowStops(ga, gb, gc);
      } else {
        body.style.removeProperty("--ga");
        body.style.removeProperty("--gb");
        body.style.removeProperty("--gc");
      }
      initGlowPaths();
      applyLineMap(id);
    }

    function play(){
      var glow = document.getElementById("tabGlow");
      if (!glow) return;
      var timing = getGlowTimingProfile();
      var stopAfter = timing.durationMs + (timing.delayStepMs * 4) + 260;

      glow.style.setProperty("--glow-run-duration", timing.durationMs + "ms");
      glow.style.setProperty("--glow-delay-step", timing.delayStepMs + "ms");

      glow.classList.remove("run");
      if (rafA) cancelAnimationFrame(rafA);
      if (rafB) cancelAnimationFrame(rafB);
      rafA = requestAnimationFrame(function(){
        rafB = requestAnimationFrame(function(){
          glow.classList.add("run");
        });
      });
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = setTimeout(function(){
        glow.classList.remove("run");
      }, stopAfter);
    }

    function pulse(id){
      var timing = getGlowTimingProfile();
      var now = Date.now();
      if (id === lastPulseId && (now - lastPulseAt) < timing.minRepeatGapMs) return;
      lastPulseId = id;
      lastPulseAt = now;

      if (startTimer) clearTimeout(startTimer);
      startTimer = setTimeout(function(){
        applyTheme(id);
        scheduleGlowLayout(id);
        play();
      }, timing.pulseDelayMs);
    }

    bindGlowLayoutObservers();
    initGlowPaths();
    for (var i = 0; i < inputs.length; i++){
      inputs[i].addEventListener("change", function(){
        if (!this.checked) return;
        pulse(this.id);
        scheduleGlowLayout(this.id);
        setTimeout(function(){ scheduleGlowLayout(); }, 140);
      });
      if (inputs[i].checked) {
        applyTheme(inputs[i].id);
        scheduleGlowLayout(inputs[i].id);
      }
    }

    for (var j = 0; j < labels.length; j++){
      if (labels[j].__glowBound) continue;
      labels[j].__glowBound = true;
      labels[j].addEventListener("click", function(){
        var id = this.getAttribute("for");
        if (!id) return;
        requestAnimationFrame(function(){
          pulse(id);
          scheduleGlowLayout(id);
          setTimeout(function(){ scheduleGlowLayout(id); }, 140);
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
}

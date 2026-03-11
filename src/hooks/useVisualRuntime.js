import { useEffect } from "react";
import { isLowPerfDevice, isMobileViewport } from "../lib/deviceProfile";

let responsiveManifestData = null;
let responsiveManifestRequest = null;
let responsiveManifestDisabled = false;
let responsiveManifestWarned = false;
let preloaderInitialized = false;
let serviceWorkerRegistered = false;

function getMotionBudget() {
  if (isMobileViewport() && isLowPerfDevice()) {
    return { cards: 3, unsplash: 0, sectionDelay: 48, revealDelay: 44, cardDelay: 36, cardSettle: 560 };
  }
  if (isMobileViewport()) {
    return { cards: 6, unsplash: 4, sectionDelay: 54, revealDelay: 52, cardDelay: 40, cardSettle: 620 };
  }
  return {
    cards: isLowPerfDevice() ? 5 : 10,
    unsplash: isLowPerfDevice() ? 0 : 8,
    sectionDelay: 70,
    revealDelay: 70,
    cardDelay: 60,
    cardSettle: 760
  };
}

function initPreloader(prefersReducedMotion) {
  if (prefersReducedMotion || preloaderInitialized) return undefined;
  preloaderInitialized = true;

  const loader = document.createElement("div");
  loader.className = "page-preloader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = '<span class="page-preloader__ring"></span>';
  document.body.appendChild(loader);

  let hidden = false;
  let domHideTimer = 0;
  let forceHideTimer = window.setTimeout(hide, 2600);

  function hide() {
    if (hidden) return;
    hidden = true;
    if (forceHideTimer) clearTimeout(forceHideTimer);
    if (domHideTimer) clearTimeout(domHideTimer);
    loader.classList.add("is-hidden");
    window.setTimeout(() => {
      loader.remove();
    }, 520);
  }

  function scheduleDomHide() {
    if (hidden || domHideTimer) return;
    domHideTimer = window.setTimeout(() => {
      domHideTimer = 0;
      hide();
    }, 180);
  }

  if (document.readyState === "complete") {
    requestAnimationFrame(hide);
  } else if (document.readyState === "interactive") {
    scheduleDomHide();
  } else {
    document.addEventListener("DOMContentLoaded", scheduleDomHide, { once: true });
    window.addEventListener("load", () => {
      window.setTimeout(hide, 140);
    }, { once: true });
  }

  return () => {
    hide();
  };
}

function initProgressBar() {
  const bar = document.querySelector(".progress > span");
  if (!bar) return undefined;

  let frame = 0;
  const render = () => {
    frame = 0;
    const documentElement = document.documentElement;
    const scrollTop = documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = documentElement.scrollHeight - documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
    bar.style.width = `${(progress * 100).toFixed(2)}%`;
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(render);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();

  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}

function applyReveal(root, revealObserver, revealDelayStep, prefersReducedMotion, supportsIO) {
  const revealTargets = [
    ".io-target",
    ".tabs .tab",
    ".price-card",
    ".qa",
    ".t-card",
    "#contact .field",
    "#contact .actions",
    "#contact .micro",
    ".hero .chip",
    ".hero h1",
    ".hero .lead",
    ".hero .hero-cta",
    ".hero .hero-media",
    ".section-head > *"
  ];

  const nodes = root.querySelectorAll(revealTargets.join(","));
  const groupedNodes = new Map();
  const freshNodes = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const element = nodes[index];
    if (element.dataset.ioBound === "1") continue;

    element.dataset.ioBound = "1";
    element.classList.add("io-reveal");
    freshNodes.push(element);

    const scope = element.closest("section") || element.parentElement || document.body;
    if (!groupedNodes.has(scope)) groupedNodes.set(scope, []);
    groupedNodes.get(scope).push(element);
  }

  groupedNodes.forEach((items) => {
    for (let index = 0; index < items.length; index += 1) {
      items[index].style.setProperty("--io-delay", `${Math.min(index, 8) * revealDelayStep}ms`);
    }
  });

  if (!freshNodes.length) return;

  if (prefersReducedMotion || !supportsIO) {
    freshNodes.forEach((element) => {
      element.classList.add("io-in");
    });
    return;
  }

  freshNodes.forEach((element) => {
    revealObserver.observe(element);
  });
}

function initSectionIntro(prefersReducedMotion, supportsIO) {
  const sections = [".hero", "#portfolio", "#services", "#reviews", "#pricing", "#contact"]
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  if (!sections.length) return undefined;

  document.body.classList.add("motion-enabled");
  const introDelayStep = getMotionBudget().sectionDelay;

  sections.forEach((section, index) => {
    section.classList.add("section-animate");
    section.style.setProperty("--section-delay", `${index * introDelayStep}ms`);
  });

  if (prefersReducedMotion || !supportsIO) {
    sections.forEach((section) => {
      section.classList.add("section-in");
    });
    return undefined;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("section-in");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -10% 0px"
  });

  sections.forEach((section) => {
    observer.observe(section);
  });

  return () => {
    observer.disconnect();
  };
}

function initWorkImageFade(root, prefersReducedMotion) {
  const images = root.querySelectorAll(".work img");

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (image.dataset.fadeBound === "1") continue;
    image.dataset.fadeBound = "1";

    if (prefersReducedMotion) {
      image.classList.add("img-loaded");
      continue;
    }

    image.setAttribute("data-fade-ready", "1");
    const show = () => {
      image.removeAttribute("data-fade-ready");
      image.classList.add("img-loaded");
    };
    const failSafe = window.setTimeout(show, 2400);
    const done = () => {
      clearTimeout(failSafe);
      show();
    };

    if (image.complete && image.naturalWidth > 0) {
      requestAnimationFrame(done);
      continue;
    }

    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  }
}

function animateVisibleWorkCards(prefersReducedMotion) {
  if (prefersReducedMotion) return;

  const panels = document.querySelectorAll(".grid-panel");
  const budget = getMotionBudget();

  for (let panelIndex = 0; panelIndex < panels.length; panelIndex += 1) {
    const panel = panels[panelIndex];
    if (window.getComputedStyle(panel).display === "none") continue;

    const rect = panel.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight * 1.08) continue;

    const cards = panel.querySelectorAll(".work");
    if (!cards.length) continue;

    const panelLimit = panel.classList.contains("grid-panel--unsplash") ? budget.unsplash : budget.cards;
    const cardsToActivate = [];

    for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
      const card = cards[cardIndex];
      if (card.__workEnterTimer) clearTimeout(card.__workEnterTimer);

      if (cardIndex >= panelLimit) {
        card.classList.remove("work-enter", "work-enter-active");
        card.style.removeProperty("--work-enter-delay");
        continue;
      }

      const delay = Math.min(cardIndex, 8) * budget.cardDelay;
      card.classList.remove("work-enter-active");
      card.style.setProperty("--work-enter-delay", `${delay}ms`);
      card.classList.add("work-enter");
      cardsToActivate.push(card);

      card.__workEnterTimer = window.setTimeout(() => {
        card.classList.remove("work-enter", "work-enter-active");
        card.style.removeProperty("--work-enter-delay");
      }, budget.cardSettle + delay);
    }

    if (!cardsToActivate.length) continue;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardsToActivate.forEach((card) => {
          if (!card.isConnected) return;
          card.classList.add("work-enter-active");
        });
      });
    });
  }
}

function bindPortfolioEntrance(prefersReducedMotion, supportsIO) {
  const portfolio = document.getElementById("portfolio");
  if (!portfolio || prefersReducedMotion) return undefined;

  if (!supportsIO) {
    const onScroll = () => {
      const rect = portfolio.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight * 0.92) return;
      animateVisibleWorkCards(prefersReducedMotion);
      window.removeEventListener("scroll", onScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateVisibleWorkCards(prefersReducedMotion);
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.2,
    rootMargin: "0px 0px -10% 0px"
  });

  observer.observe(portfolio);
  return () => {
    observer.disconnect();
  };
}

function initMagneticButtons(prefersReducedMotion) {
  if (prefersReducedMotion) return undefined;

  const listeners = [];
  document.querySelectorAll(".magnetic").forEach((element) => {
    if (element.dataset.magnetBound === "1") return;
    element.dataset.magnetBound = "1";

    let rect = null;
    const onMove = (event) => {
      rect = rect || element.getBoundingClientRect();
      const x = event.clientX - (rect.left + (rect.width / 2));
      const y = event.clientY - (rect.top + (rect.height / 2));
      const tx = Math.max(-14, Math.min(14, x * 0.22));
      const ty = Math.max(-14, Math.min(14, y * 0.22));
      element.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    const onLeave = () => {
      rect = null;
      element.style.transform = "translate(0px, 0px)";
    };

    element.addEventListener("mousemove", onMove);
    element.addEventListener("mouseleave", onLeave);
    listeners.push(() => {
      element.removeEventListener("mousemove", onMove);
      element.removeEventListener("mouseleave", onLeave);
      delete element.dataset.magnetBound;
    });
  });

  return () => {
    listeners.forEach((cleanup) => cleanup());
  };
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function normalizeSrcKey(src) {
  if (!src) return "";
  let raw = String(src).trim();
  if (!raw) return "";

  try {
    const url = new URL(raw, window.location.origin);
    raw = safeDecodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch (_error) {
    raw = safeDecodeURIComponent(raw.replace(/^\//, ""));
  }

  return raw;
}

async function loadResponsiveManifest() {
  if (responsiveManifestData?.files) return responsiveManifestData;
  if (responsiveManifestRequest) return responsiveManifestRequest;

  responsiveManifestRequest = fetch("/assets/img/optimized/manifest.json", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`manifest_http_${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      responsiveManifestData = manifest?.files ? manifest : { files: {} };
      return responsiveManifestData;
    })
    .finally(() => {
      responsiveManifestRequest = null;
    });

  return responsiveManifestRequest;
}

async function applyResponsiveManifest() {
  if (responsiveManifestDisabled) return;

  try {
    const manifest = await loadResponsiveManifest();
    const files = manifest?.files || {};
    const images = document.querySelectorAll("img:not([data-optimized-image])");
    if (!images.length) return;

    images.forEach((image) => {
      const key = normalizeSrcKey(image.getAttribute("src") || "");
      const entry = files[key];
      if (!entry) {
        image.dataset.optimizedImage = "skip";
        return;
      }

      image.dataset.optimizedImage = "1";
      if (entry.sizes) image.setAttribute("sizes", entry.sizes);
      if (entry.jpg?.srcset) image.setAttribute("srcset", entry.jpg.srcset);
      if (entry.fallback) image.setAttribute("src", entry.fallback);
    });
  } catch (error) {
    responsiveManifestDisabled = true;
    if (responsiveManifestWarned) return;
    responsiveManifestWarned = true;
    console.warn("[images] responsive manifest skipped", error?.message || error);
  }
}

function registerServiceWorker() {
  if (serviceWorkerRegistered) return;
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;

  serviceWorkerRegistered = true;
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("[SW] register failed", error);
  });
}

export function useVisualRuntime({ activeTab, contentVersion, prefersReducedMotion }) {
  useEffect(() => {
    const supportsIO = "IntersectionObserver" in window;
    const progressCleanup = initProgressBar();
    const preloaderCleanup = initPreloader(prefersReducedMotion);
    const sectionCleanup = initSectionIntro(prefersReducedMotion, supportsIO);
    const revealObserver = supportsIO
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("io-in");
          revealObserver.unobserve(entry.target);
        });
      }, {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      })
      : null;
    const magneticCleanup = initMagneticButtons(prefersReducedMotion);
    const entranceCleanup = bindPortfolioEntrance(prefersReducedMotion, supportsIO);

    applyReveal(document, revealObserver, getMotionBudget().revealDelay, prefersReducedMotion, supportsIO);
    initWorkImageFade(document, prefersReducedMotion);
    animateVisibleWorkCards(prefersReducedMotion);
    applyResponsiveManifest();
    registerServiceWorker();

    return () => {
      if (progressCleanup) progressCleanup();
      if (preloaderCleanup) preloaderCleanup();
      if (sectionCleanup) sectionCleanup();
      if (magneticCleanup) magneticCleanup();
      if (entranceCleanup) entranceCleanup();
      if (revealObserver) revealObserver.disconnect();
    };
  }, [activeTab, contentVersion, prefersReducedMotion]);
}

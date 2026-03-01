(function(){
  if (window.__portfolioAppCore) return;
  window.__portfolioAppCore = true;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =============================
  // Analytics
  // =============================
  var ANALYTICS_FLUSH_DELAY_MS = 2200;
  var ANALYTICS_MAX_QUEUE = 120;
  var analyticsQueue = [];
  var analyticsFlushTimer = null;

  function flushAnalytics(){
    if (!analyticsQueue.length) return;
    var payload = analyticsQueue.splice(0, analyticsQueue.length);
    var body = JSON.stringify({
      events: payload,
      page: location.pathname,
      ts: Date.now()
    });

    if (navigator.sendBeacon) {
      try {
        var sent = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
        if (sent) return;
      } catch (e) {}
    }

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true
    }).catch(function(){ /* noop */ });
  }

  function scheduleAnalyticsFlush(){
    if (analyticsFlushTimer) return;
    analyticsFlushTimer = setTimeout(function(){
      analyticsFlushTimer = null;
      flushAnalytics();
    }, ANALYTICS_FLUSH_DELAY_MS);
  }

  function trackEvent(name, data){
    if (analyticsQueue.length >= ANALYTICS_MAX_QUEUE) {
      analyticsQueue.shift();
    }
    analyticsQueue.push({
      name: String(name || "unknown"),
      data: data || {},
      at: Date.now()
    });
    scheduleAnalyticsFlush();
  }

  window.__trackEvent = trackEvent;

  window.addEventListener("beforeunload", flushAnalytics);
  window.addEventListener("pagehide", flushAnalytics);
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "hidden") flushAnalytics();
  });

  // =============================
  // Generic UI utilities
  // =============================
  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 3400);
  }

  window.toast = toast;

  // Progress bar
  (function initProgress(){
    var bar = document.querySelector(".progress > span");
    if (!bar) return;

    var raf = null;
    function render(){
      raf = null;
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var p = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
      bar.style.width = (p * 100).toFixed(2) + "%";
    }

    function schedule(){
      if (raf) return;
      raf = requestAnimationFrame(render);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  })();

  // Smooth anchor scroll + analytics
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(e){
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      trackEvent("anchor_click", { href: id });
    });
  });

  // =============================
  // Responsive image manifest
  // =============================
  var responsiveManifestData = null;
  var responsiveManifestRequest = null;
  var responsiveManifestDisabled = false;
  var responsiveManifestWarned = false;

  function safeDecodeURIComponent(value){
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }

  function normalizeSrcKey(src){
    if (!src) return "";
    var raw = String(src).trim();
    if (!raw) return "";
    try {
      var url = new URL(raw, location.origin);
      raw = safeDecodeURIComponent(url.pathname.replace(/^\//, ""));
    } catch (e) {
      raw = safeDecodeURIComponent(raw.replace(/^\//, ""));
    }
    return raw;
  }

  function loadResponsiveManifest(){
    if (responsiveManifestData && responsiveManifestData.files) {
      return Promise.resolve(responsiveManifestData);
    }
    if (responsiveManifestRequest) return responsiveManifestRequest;

    responsiveManifestRequest = fetch("/assets/img/optimized/manifest.json", { cache: "force-cache" })
      .then(function(res){
        if (!res.ok) throw new Error("manifest_http_" + res.status);
        return res.json();
      })
      .then(function(manifest){
        responsiveManifestData = (manifest && manifest.files) ? manifest : { files: {} };
        return responsiveManifestData;
      })
      .finally(function(){
        responsiveManifestRequest = null;
      });

    return responsiveManifestRequest;
  }

  function applyResponsiveManifest(){
    if (responsiveManifestDisabled) return Promise.resolve();

    return loadResponsiveManifest()
      .then(function(manifest){
        var files = manifest && manifest.files ? manifest.files : {};
        var imgs = document.querySelectorAll("img:not([data-optimized-image])");
        if (!imgs.length) return;

        imgs.forEach(function(img){
          var key = normalizeSrcKey(img.getAttribute("src") || "");
          var entry = files[key];
          if (!entry) {
            img.dataset.optimizedImage = "skip";
            return;
          }

          img.dataset.optimizedImage = "1";
          if (entry.sizes) img.setAttribute("sizes", entry.sizes);
          if (entry.jpg && entry.jpg.srcset) img.setAttribute("srcset", entry.jpg.srcset);
          if (entry.fallback) img.setAttribute("src", entry.fallback);

          if (!entry.avif && !entry.webp) return;
          if (!img.parentNode) return;

          var picture = document.createElement("picture");
          picture.className = "optimized-picture";

          if (entry.avif && entry.avif.srcset){
            var avif = document.createElement("source");
            avif.type = "image/avif";
            avif.srcset = entry.avif.srcset;
            if (entry.sizes) avif.sizes = entry.sizes;
            picture.appendChild(avif);
          }
          if (entry.webp && entry.webp.srcset){
            var webp = document.createElement("source");
            webp.type = "image/webp";
            webp.srcset = entry.webp.srcset;
            if (entry.sizes) webp.sizes = entry.sizes;
            picture.appendChild(webp);
          }

          img.parentNode.insertBefore(picture, img);
          picture.appendChild(img);
        });
      })
      .catch(function(err){
        responsiveManifestDisabled = true;
        if (responsiveManifestWarned) return;
        responsiveManifestWarned = true;
        console.warn("[images] responsive manifest skipped", err && err.message ? err.message : err);
      });
  }

  function watchForImageMutations(){
    if (!(window.MutationObserver && document.body)) return;
    var root = document.getElementById("grid") || document.body;
    var timer = null;
    var observer = new MutationObserver(function(mutations){
      var hasImages = false;
      for (var i = 0; i < mutations.length; i++){
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++){
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === "IMG") {
            hasImages = true;
            break;
          }
          if (node.querySelector && node.querySelector("img")) {
            hasImages = true;
            break;
          }
        }
        if (hasImages) break;
      }
      if (!hasImages) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        timer = null;
        applyResponsiveManifest();
      }, 160);
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  // =============================
  // Nav dropdown + drawer
  // =============================
  var servicesDrop = document.getElementById("servicesDrop");
  var servicesBtn = document.getElementById("servicesBtn");
  var drawer = document.getElementById("drawer");
  var backdrop = document.getElementById("backdrop");
  var openDrawer = document.getElementById("openDrawer");
  var closeDrawer = document.getElementById("closeDrawer");

  function closeDropdown(){
    if (!servicesDrop) return;
    servicesDrop.classList.remove("open");
    if (servicesBtn) servicesBtn.setAttribute("aria-expanded", "false");
  }

  function setDrawer(open){
    if (!drawer || !backdrop) return;
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
    trackEvent("drawer_toggle", { open: !!open });
  }

  if (servicesDrop && servicesBtn){
    servicesBtn.addEventListener("click", function(e){
      e.preventDefault();
      var open = servicesDrop.classList.toggle("open");
      servicesBtn.setAttribute("aria-expanded", open ? "true" : "false");
      trackEvent("services_dropdown", { open: open });
    });
  }

  if (openDrawer) openDrawer.addEventListener("click", function(){ setDrawer(true); });
  if (closeDrawer) closeDrawer.addEventListener("click", function(){ setDrawer(false); });
  if (backdrop) backdrop.addEventListener("click", function(){ setDrawer(false); });

  document.addEventListener("click", function(e){
    var t = e.target;
    if (servicesDrop && servicesDrop.classList.contains("open") && !servicesDrop.contains(t)) {
      closeDropdown();
    }
  });

  // =============================
  // Focus trap (modal/lightbox)
  // =============================
  var lastActiveEl = null;
  var trapRoot = null;

  function focusables(root){
    return Array.prototype.slice.call(
      root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
    ).filter(function(el){ return el.offsetParent !== null; });
  }

  function onTrapKeydown(e){
    if (!trapRoot || e.key !== "Tab") return;
    var items = focusables(trapRoot);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }

  function trapFocus(root){
    lastActiveEl = document.activeElement;
    trapRoot = root;
    document.addEventListener("keydown", onTrapKeydown);
  }

  function releaseFocusTrap(){
    document.removeEventListener("keydown", onTrapKeydown);
    trapRoot = null;
    if (lastActiveEl && typeof lastActiveEl.focus === "function") lastActiveEl.focus();
    lastActiveEl = null;
  }

  function setOverlayState(root, open){
    if (!root) return;
    root.classList.toggle("open", !!open);
    root.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) trapFocus(root);
    else releaseFocusTrap();
  }

  // =============================
  // Booking modal
  // =============================
  var bookingModal = document.getElementById("bookingModal");
  var bookingClose = document.getElementById("bookingClose");
  var bookingCancel = document.getElementById("bookingCancel");
  var bookingApply = document.getElementById("bookingApply");
  var openBooking = document.getElementById("openBooking");
  var openBooking2 = document.getElementById("openBooking2");

  var bDate = document.getElementById("bDate");
  var bTime = document.getElementById("bTime");
  var bType = document.getElementById("bType");

  function openModal(){
    if (!bookingModal) return;
    setOverlayState(bookingModal, true);
    setTimeout(function(){ if (bDate) bDate.focus(); }, 0);
    trackEvent("booking_modal_open", {});
  }

  function closeModal(){
    if (!bookingModal) return;
    setOverlayState(bookingModal, false);
  }

  if (openBooking) openBooking.addEventListener("click", function(e){ e.preventDefault(); openModal(); });
  if (openBooking2) openBooking2.addEventListener("click", function(e){ e.preventDefault(); setDrawer(false); openModal(); });
  if (bookingClose) bookingClose.addEventListener("click", closeModal);
  if (bookingCancel) bookingCancel.addEventListener("click", closeModal);
  if (bookingModal) bookingModal.addEventListener("click", function(e){ if (e.target === bookingModal) closeModal(); });

  if (bookingApply){
    bookingApply.addEventListener("click", function(){
      var d = (bDate && bDate.value) ? bDate.value : "без даты";
      var t = (bTime && bTime.value) ? bTime.value : "не важно";
      var type = (bType && bType.value) ? bType.value : "съёмка";
      var comment = document.getElementById("comment");

      if (comment){
        var chunk = "Хочу: " + type + ". Дата: " + d + ". Время: " + t + ".";
        comment.value = comment.value ? (chunk + "\n" + comment.value) : chunk;
      }

      closeModal();
      var contactSection = document.querySelector("#contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }
      toast("Готово: дата добавлена в форму ниже.");
      trackEvent("booking_modal_apply", { type: type, date: d, time: t });
    });
  }

  // =============================
  // Lightbox
  // =============================
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbTitle = document.getElementById("lbTitle");
  var lbClose = document.getElementById("lbClose");
  var lbDesc = document.getElementById("lbDesc");

  function openLb(src, title, desc, category){
    if (!lb || !lbImg || !lbTitle) return;
    setOverlayState(lb, true);
    lbImg.src = src;
    lbTitle.textContent = category ? ((title || "Preview") + " • " + category) : (title || "Preview");
    if (lbDesc) lbDesc.textContent = desc || "";
    trackEvent("lightbox_open", { category: category || "unknown" });
  }

  function closeLb(){
    if (!lb || !lbImg) return;
    setOverlayState(lb, false);
    lbImg.src = "";
    if (lbDesc) lbDesc.textContent = "";
  }

  window.openLb = openLb;

  if (lbClose) lbClose.addEventListener("click", closeLb);
  if (lb) lb.addEventListener("click", function(e){ if (e.target === lb) closeLb(); });

  window.addEventListener("keydown", function(e){
    if (e.key === "Escape") {
      if (bookingModal && bookingModal.classList.contains("open")) closeModal();
      if (lb && lb.classList.contains("open")) closeLb();
      closeDropdown();
      if (drawer && drawer.classList.contains("open")) setDrawer(false);
    }
  });

  // =============================
  // Reviews slider
  // =============================
  var tTrack = document.getElementById("tTrack");
  var tDots = document.getElementById("tDots");
  var tIndex = 0;

  function setReview(i){
    if (!tTrack) return;
    var count = tTrack.children.length;
    if (!count) return;
    tIndex = (i + count) % count;
    tTrack.style.transform = "translateX(-" + (tIndex * 100) + "%)";
    if (tDots) {
      Array.prototype.slice.call(tDots.querySelectorAll("button")).forEach(function(b, bi){
        b.classList.toggle("active", bi === tIndex);
      });
    }
  }

  function initReviews(){
    if (!tTrack || !tDots) return;
    tDots.innerHTML = "";
    var count = tTrack.children.length;
    if (!count) return;

    for (var i = 0; i < count; i++){
      (function(index){
        var b = document.createElement("button");
        b.type = "button";
        b.className = "dot" + (index === 0 ? " active" : "");
        b.setAttribute("aria-label", "Показать отзыв " + (index + 1));
        b.addEventListener("click", function(){
          setReview(index);
          trackEvent("review_dot_click", { index: index });
        });
        tDots.appendChild(b);
      })(i);
    }

    if (!reduceMotion) {
      setInterval(function(){ setReview(tIndex + 1); }, 5200);
    }
  }

  // =============================
  // Pricing / FAQ enhancements
  // =============================
  function initPricingExpand(){
    var cards = document.querySelectorAll('.price-card[data-expand="price"]');
    if (!cards.length) return;
    var hasHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    cards.forEach(function(card){
      if (card.__priceBound) return;
      card.__priceBound = true;

      var toggle = function(){
        card.classList.toggle("expanded");
      };

      card.addEventListener("click", function(e){
        if (e.target && e.target.closest && e.target.closest("a,button,input,select,textarea,label")) return;
        if (hasHover) return;
        toggle();
        trackEvent("pricing_expand", { expanded: card.classList.contains("expanded") });
      });
    });
  }

  function initFaq(){
    document.querySelectorAll(".qa").forEach(function(el){
      if (el.__qaBound) return;
      el.__qaBound = true;
      if (el.tagName && el.tagName.toLowerCase() === "details") {
        var sync = function(){
          el.classList.toggle("open", el.open);
          trackEvent("faq_toggle", { question: (el.querySelector(".q-title") || {}).textContent || "", open: !!el.open });
        };
        sync();
        el.addEventListener("toggle", sync);
      }
    });
  }

  // =============================
  // Lightweight motion
  // =============================
  function initMagnetic(){
    if (reduceMotion) return;
    var magnets = document.querySelectorAll(".magnetic");

    magnets.forEach(function(el){
      if (el.__magnetBound) return;
      el.__magnetBound = true;
      var rect = null;

      function onMove(e){
        rect = rect || el.getBoundingClientRect();
        var x = e.clientX - (rect.left + rect.width / 2);
        var y = e.clientY - (rect.top + rect.height / 2);
        var tx = Math.max(-14, Math.min(14, x * 0.22));
        var ty = Math.max(-14, Math.min(14, y * 0.22));
        el.style.transform = "translate(" + tx + "px, " + ty + "px)";
      }

      function onLeave(){
        rect = null;
        el.style.transform = "translate(0px, 0px)";
      }

      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
    });
  }

  function initHeroDynamicText(){
    var dyn = document.getElementById("dyn");
    if (!dyn) return;
    if (reduceMotion) return;
    var phrases = ["портреты", "студия", "креатив", "сток", "природа"];
    var pi = 0;

    setInterval(function(){
      pi = (pi + 1) % phrases.length;
      dyn.style.opacity = "0";
      setTimeout(function(){
        dyn.textContent = phrases[pi];
        dyn.style.opacity = ".85";
      }, 180);
    }, 2400);
  }

  // =============================
  // Service worker
  // =============================
  function registerServiceWorker(){
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

    navigator.serviceWorker.register("/sw.js")
      .catch(function(err){
        console.warn("[SW] register failed", err);
      });
  }

  // =============================
  // Form submit -> backend API
  // =============================
  function setFormPending(btn, pending){
    if (!btn) return;
    btn.disabled = !!pending;
    btn.classList.toggle("is-loading", !!pending);
    btn.textContent = pending ? "Отправляю..." : "Отправить";
  }

  function submitLead(data){
    return fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function(res){
      if (!res.ok) {
        return res.json().catch(function(){ return { ok: false }; }).then(function(payload){
          throw new Error(payload.error || "lead_submit_failed");
        });
      }
      return res.json();
    });
  }

  function initLeadForm(){
    var submitBtn = document.getElementById("submitBtn");
    var nameEl = document.getElementById("name");
    var contactEl = document.getElementById("contactVal");
    var commentEl = document.getElementById("comment");
    var form = submitBtn ? submitBtn.closest("form") : null;

    if (!submitBtn || !nameEl || !contactEl || !commentEl) return;

    function handler(e){
      if (e) e.preventDefault();
      var name = String(nameEl.value || "").trim();
      var contact = String(contactEl.value || "").trim();
      var comment = String(commentEl.value || "").trim();

      if (!name || !contact){
        toast("Укажи имя и контакт (Telegram/телефон), пожалуйста.");
        return;
      }

      var payload = {
        name: name,
        contact: contact,
        comment: comment,
        source: "site_form",
        page: location.pathname,
        userAgent: navigator.userAgent
      };

      setFormPending(submitBtn, true);
      submitLead(payload)
        .then(function(resPayload){
          var tgSent = !resPayload || resPayload.telegram_sent !== false;
          var tgStatus = (resPayload && resPayload.telegram_status) ? String(resPayload.telegram_status) : "";

          if (tgSent) {
            toast("Заявка отправлена. Я свяжусь с вами в ближайшее время.");
            trackEvent("lead_submit_success", { source: "site_form" });
          } else {
            toast("Заявка сохранена, но Telegram недоступен. Напишите: @Mihmihfoto0312");
            trackEvent("lead_submit_partial", { source: "site_form", telegram_status: tgStatus || "unknown" });
            console.warn("[lead] telegram not sent", tgStatus || "unknown");
          }

          if (form) form.reset();
        })
        .catch(function(err){
          console.error("[lead] submit failed", err);
          toast("Не удалось отправить заявку. Напишите в Telegram: @Mihmihfoto0312");
          trackEvent("lead_submit_failed", { reason: String(err && err.message || "unknown") });
        })
        .finally(function(){
          setFormPending(submitBtn, false);
        });
    }

    if (form) {
      form.addEventListener("submit", handler);
    } else {
      submitBtn.addEventListener("click", handler);
    }
  }

  // =============================
  // Local CTA analytics hooks
  // =============================
  function bindAnalyticsHooks(){
    document.querySelectorAll("a.btn, button.btn, .hero-cta a, .floating-cta a").forEach(function(el){
      if (el.__trackBound) return;
      el.__trackBound = true;
      el.addEventListener("click", function(){
        trackEvent("cta_click", {
          text: (el.textContent || "").trim().slice(0, 64),
          href: el.getAttribute("href") || "",
          id: el.id || ""
        });
      });
    });
  }

  function boot(){
    applyResponsiveManifest();
    watchForImageMutations();
    initHeroDynamicText();
    initMagnetic();
    initReviews();
    initPricingExpand();
    initFaq();
    initLeadForm();
    bindAnalyticsHooks();
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

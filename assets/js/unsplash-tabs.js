(function(){
  if (window.__portfolioUnsplashTabs) return;
  window.__portfolioUnsplashTabs = true;

  var UNSPLASH_CATEGORY = "Недавние фотографии";
  var UNSPLASH_COUNT = 32;
  var UNSPLASH_LOCAL_MANIFEST = "/unsplash-local/manifest.json";
  var UNSPLASH_PROXY_BASE = "";
  var UNSPLASH_PROFILE_FALLBACK = "https://unsplash.com/@mihmihfoto";
  var UNSPLASH_MEMORY_TTL_MS = 5 * 60 * 1000;
  var unsplashMemoryList = [];
  var unsplashMemoryTs = 0;
  var unsplashLoadInFlight = false;

  function getUnsplashGrid(){
    return document.getElementById("unsplashGrid");
  }

  function hasFreshMemoryData(){
    if (!unsplashMemoryList.length) return false;
    return (Date.now() - unsplashMemoryTs) < UNSPLASH_MEMORY_TTL_MS;
  }

  function rememberUnsplashList(list){
    unsplashMemoryList = Array.isArray(list) ? list.slice(0, UNSPLASH_COUNT) : [];
    unsplashMemoryTs = Date.now();
  }

  function track(name, payload){
    if (typeof window.__trackEvent === "function") {
      window.__trackEvent(name, payload || {});
    }
  }

  function buildCreditEl(){
    var div = document.createElement("div");
    div.className = "unsplash-credit";
    div.innerHTML = 'Фото: <a href="https://unsplash.com/@mihmihfoto?utm_source=mellow_photos&utm_medium=referral" target="_blank" rel="noopener">@mihmihfoto</a> · <a href="https://unsplash.com?utm_source=mellow_photos&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>';
    return div;
  }

  function renderState(text){
    var grid = getUnsplashGrid();
    if (!grid) return;
    grid.innerHTML = "";
    grid.appendChild(buildCreditEl());
    var div = document.createElement("div");
    div.className = "empty";
    div.textContent = text;
    grid.appendChild(div);
  }

  function getCardCategory(card){
    if (!card || !card.closest) return UNSPLASH_CATEGORY;
    var panel = card.closest(".grid-panel");
    var panelCategory = panel ? String(panel.getAttribute("data-cat") || "").trim() : "";
    if (panelCategory) return panelCategory;
    return UNSPLASH_CATEGORY;
  }

  function bindStaticLightbox(root){
    var host = root || document;
    var cards = host.querySelectorAll(".grid-panel .work");
    for (var i = 0; i < cards.length; i++){
      var card = cards[i];
      if (card.__lbBound) continue;
      card.__lbBound = true;
      card.addEventListener("click", function(){
        var img = this.querySelector("img");
        var titleEl = this.querySelector(".title");
        var storyEl = this.querySelector(".story");
        var src = "";
        if (img) {
          src = img.getAttribute("data-lb-src") || "";
          if (!src) {
            src = img.currentSrc || img.getAttribute("src") || "";
            src = src.replace(/-(480|960)\.(avif|webp|jpe?g)$/i, "-1600.$2");
          }
        }
        var title = titleEl ? titleEl.textContent : "";
        var story = storyEl ? storyEl.textContent : "";
        var category = getCardCategory(this);
        if (typeof window.openLb === "function" && src) {
          window.openLb(src, title || "Preview", story || "", category);
        }
      });
    }
  }

  function renderList(list, source){
    var grid = getUnsplashGrid();
    if (!grid) return;
    grid.innerHTML = "";
    grid.appendChild(buildCreditEl());
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < list.length; i++){
      var p = list[i] || {};
      var card = document.createElement("article");
      card.className = "work";
      card.setAttribute("data-origin", p.origin || "unsplash");

      var scan = document.createElement("span");
      scan.className = "scan";
      card.appendChild(scan);

      var img = document.createElement("img");
      var imgW = parseInt(p.imgW, 10);
      var imgH = parseInt(p.imgH, 10);
      if (imgW > 0 && imgH > 0) {
        img.width = imgW;
        img.height = imgH;
      } else {
        img.style.aspectRatio = "9 / 16";
      }
      img.src = p.thumb || "";
      img.setAttribute("data-lb-src", p.full || p.thumb || "");
      img.alt = p.title || "";
      img.loading = "lazy";
      img.decoding = "async";
      card.appendChild(img);

      var label = document.createElement("div");
      label.className = "label label--unsplash";
      var info = document.createElement("div");
      info.className = "info";
      var title = document.createElement("div");
      title.className = "title";
      title.textContent = p.title || "";
      info.appendChild(title);
      label.appendChild(info);
      card.appendChild(label);
      fragment.appendChild(card);
    }
    grid.appendChild(fragment);

    animateUnsplashCards(grid);
    kickUnsplashGlow();
    bindStaticLightbox(grid);
    track("unsplash_loaded", { source: source || "unknown", count: list.length });
  }

  function animateUnsplashCards(grid){
    if (!grid) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var cards = grid.querySelectorAll(".work");
    if (!cards.length) return;
    var maxAnimated = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 6 : 12;

    for (var i = 0; i < cards.length; i++){
      var card = cards[i];
      if (i >= maxAnimated) {
        card.classList.remove("work-enter", "work-enter-active");
        card.style.removeProperty("--work-enter-delay");
        continue;
      }
      var delay = Math.min(i, 10) * 70;
      card.classList.remove("work-enter", "work-enter-active");
      card.style.removeProperty("--work-enter-delay");
      card.style.setProperty("--work-enter-delay", delay + "ms");
      card.classList.add("work-enter");

      if (card.__workEnterTimer) clearTimeout(card.__workEnterTimer);
      card.__workEnterTimer = setTimeout(function(el){
        return function(){
          el.classList.remove("work-enter", "work-enter-active");
          el.style.removeProperty("--work-enter-delay");
        };
      }(card), 920 + delay);
    }

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        for (var i = 0; i < cards.length; i++){
          cards[i].classList.add("work-enter-active");
        }
      });
    });
  }

  function parseUsername(){
    var link = document.querySelector('a[href*="unsplash.com/@"]');
    var profile = link ? link.getAttribute("href") : UNSPLASH_PROFILE_FALLBACK;
    var match = /@([A-Za-z0-9_-]+)/.exec(profile || "");
    if (match && match[1]) return match[1];
    var match2 = /unsplash\.com\/@?([^/?#]+)/i.exec(profile || "");
    if (match2 && match2[1]) return match2[1];
    return "mihmihfoto";
  }

  function formatRuDate(value){
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
    } catch (e) {
      return date.toLocaleDateString("ru-RU");
    }
  }

  function mapUnsplashData(data){
    if (!Array.isArray(data)) return [];
    var out = [];
    for (var i = 0; i < data.length; i++){
      var p = data[i] || {};
      var urls = p.urls || {};
      var thumb = String(urls.small || urls.regular || urls.full || p.thumb || "").trim();
      var full = String(urls.full || urls.regular || urls.small || p.full || thumb).trim();
      if (!thumb || !full) continue;

      var imgW = parseInt(p.width || p.imgW, 10);
      var imgH = parseInt(p.height || p.imgH, 10);
      if (!(imgW > 0 && imgH > 0)) {
        imgW = 0;
        imgH = 0;
      }
      var shotAt = p.created_at || p.updated_at || p.shotAt || "";
      var dateLabel = formatRuDate(shotAt) || p.dateLabel || "";
      out.push({
        id: String(p.id || ("unsplash_" + i)),
        title: dateLabel || "Дата не указана",
        category: UNSPLASH_CATEGORY,
        desc: String(p.desc || ""),
        shotAt: String(shotAt || ""),
        dateLabel: String(dateLabel || ""),
        thumb: thumb,
        full: full,
        imgW: imgW,
        imgH: imgH,
        origin: String(p.origin || "unsplash")
      });
    }
    return out;
  }

  function requestJson(url, headers, timeoutMs, done){
    if (!window.XMLHttpRequest) {
      done(null, "xhr_unsupported");
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = timeoutMs || 12000;
    var keys = Object.keys(headers || {});
    for (var i = 0; i < keys.length; i++){
      xhr.setRequestHeader(keys[i], headers[keys[i]]);
    }
    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300){
        try {
          done(JSON.parse(xhr.responseText || "null"), "");
        } catch (e) {
          done(null, "parse_error");
        }
      } else {
        done(null, "http_" + (xhr.status || 0));
      }
    };
    xhr.onerror = function(){ done(null, "network_error"); };
    xhr.ontimeout = function(){ done(null, "timeout"); };
    try {
      xhr.send();
    } catch (e) {
      done(null, "send_error");
    }
  }

  function fetchLocalManifest(done){
    requestJson(UNSPLASH_LOCAL_MANIFEST + "?v=" + Date.now(), {}, 2600, function(data, error){
      if (error || !data) {
        done([], error || "manifest_missing", "local");
        return;
      }
      var list = mapUnsplashData(data.photos || []);
      done(list, list.length ? "" : "manifest_empty", "local");
    });
  }

  function buildProxyUrl(path){
    var base = String(UNSPLASH_PROXY_BASE || "").trim().replace(/\/+$/, "");
    if (base) return base + path;
    return "/proxy/unsplash" + path;
  }

  function fetchViaProxy(username, done){
    var apiUrl = buildProxyUrl("/public/users/" + encodeURIComponent(username) + "/photos?per_page=" + UNSPLASH_COUNT + "&order_by=latest");
    if (!apiUrl) {
      done([], "proxy_disabled", "proxy");
      return;
    }
    requestJson(apiUrl, {}, 12000, function(data, error){
      if (error || !data) {
        done([], error || "proxy_error", "proxy");
        return;
      }
      done(mapUnsplashData(data), "", "proxy");
    });
  }

  function fetchViaJina(username, done){
    var url = "https://r.jina.ai/http://unsplash.com/napi/users/" + encodeURIComponent(username) + "/photos?per_page=" + UNSPLASH_COUNT + "&order_by=latest";
    if (!window.XMLHttpRequest) {
      done([], "xhr_unsupported", "jina");
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 14000;
    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300){
        var text = String(xhr.responseText || "").trim();
        var start = text.indexOf("[");
        var end = text.lastIndexOf("]");
        if (start !== -1 && end > start) {
          try {
            var arr = JSON.parse(text.slice(start, end + 1));
            done(mapUnsplashData(arr), "", "jina");
            return;
          } catch (e) {}
        }
        done([], "jina_parse_error", "jina");
      } else {
        done([], "jina_http_" + (xhr.status || 0), "jina");
      }
    };
    xhr.onerror = function(){ done([], "jina_network_error", "jina"); };
    xhr.ontimeout = function(){ done([], "jina_timeout", "jina"); };
    try {
      xhr.send();
    } catch (e) {
      done([], "jina_send_error", "jina");
    }
  }

  function kickUnsplashGlow(){
    var glow = document.getElementById("tabGlow");
    if (!glow) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    glow.classList.remove("run");
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        glow.classList.add("run");
      });
    });
    if (kickUnsplashGlow.__timer) clearTimeout(kickUnsplashGlow.__timer);
    kickUnsplashGlow.__timer = setTimeout(function(){
      glow.classList.remove("run");
    }, 3000);
  }

  function loadUnsplash(){
    if (unsplashLoadInFlight) return;
    if (hasFreshMemoryData()) {
      renderList(unsplashMemoryList, "memory_cache");
      return;
    }

    unsplashLoadInFlight = true;
    var username = parseUsername();
    renderState("Проверяю локальный кэш фото…");

    fetchLocalManifest(function(localList){
      if (localList && localList.length) {
        var topLocal = localList.slice(0, UNSPLASH_COUNT);
        rememberUnsplashList(topLocal);
        renderList(topLocal, "local_manifest");
        unsplashLoadInFlight = false;
        return;
      }

      fetchViaProxy(username, function(proxyList){
        if (proxyList && proxyList.length) {
          var topProxy = proxyList.slice(0, UNSPLASH_COUNT);
          rememberUnsplashList(topProxy);
          renderList(topProxy, "proxy_public");
          unsplashLoadInFlight = false;
          return;
        }

        fetchViaJina(username, function(jinaList){
          if (jinaList && jinaList.length) {
            var topJina = jinaList.slice(0, UNSPLASH_COUNT);
            rememberUnsplashList(topJina);
            renderList(topJina, "jina_fallback");
            unsplashLoadInFlight = false;
            return;
          }
          unsplashLoadInFlight = false;
          renderState("Не удалось загрузить фото из локального кэша и Unsplash. Запусти: python3 scripts/unsplash_sync.py");
        });
      });
    });
  }

  function bindTabState(){
    var body = document.body;
    var radios = document.querySelectorAll('.tab-input[name="workTabs"]');
    var map = {
      "tab-portraits": "tabs-portraits",
      "tab-creative": "tabs-creative",
      "tab-nature": "tabs-nature",
      "tab-stock": "tabs-stock",
      "tab-studio": "tabs-studio",
      "tab-unsplash": "tabs-unsplash"
    };

    function setState(id){
      body.classList.remove("tabs-portraits", "tabs-creative", "tabs-nature", "tabs-stock", "tabs-studio", "tabs-unsplash");
      if (map[id]) body.classList.add(map[id]);
    }

    for (var i = 0; i < radios.length; i++){
      (function(radio){
        radio.addEventListener("change", function(){
          if (!radio.checked) return;
          setState(radio.id);
          track("portfolio_tab_change", { tabId: radio.id });
        });
        if (radio.checked) setState(radio.id);
      })(radios[i]);
    }
  }

  function init(){
    bindStaticLightbox(document);
    bindTabState();

    var radio = document.getElementById("tab-unsplash");
    if (!radio) return;

    radio.addEventListener("change", function(){
      if (!radio.checked) return;
      kickUnsplashGlow();
      loadUnsplash();
    });

    var label = document.querySelector('.tabs label[for="tab-unsplash"]');
    if (label && !label.__unsplashGlowTap){
      label.__unsplashGlowTap = true;
      label.addEventListener("click", function(){
        requestAnimationFrame(function(){
          if (radio.checked) kickUnsplashGlow();
        });
      });
    }

    if (radio.checked) {
      kickUnsplashGlow();
      loadUnsplash();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

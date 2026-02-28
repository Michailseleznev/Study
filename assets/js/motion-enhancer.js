  (function(){
    if (window.__portfolioMotionEnhancer) return;
    window.__portfolioMotionEnhancer = true;

    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var supportsIO = "IntersectionObserver" in window;
    var hasGsapReveal = !!(window.gsap && window.ScrollTrigger);

    var sectionSelectors = [".hero", "#portfolio", "#services", "#reviews", "#pricing", "#contact"];
    var sections = sectionSelectors
      .map(function(sel){ return document.querySelector(sel); })
      .filter(Boolean);

    var revealTargets = [
      ".io-target",
      ".tabs .tab",
      ".price-card",
      ".qa",
      ".t-card",
      "#contact .field",
      "#contact .actions",
      "#contact .micro"
    ];

    if (!hasGsapReveal) {
      revealTargets.push(
        ".hero .chip",
        ".hero h1",
        ".hero .lead",
        ".hero .hero-cta",
        ".hero .hero-media",
        ".section-head > *"
      );
    }

    var revealSelector = revealTargets.join(",");
    var revealObserver = null;

    function initPreloader(){
      if (prefersReduced) return;
      if (document.querySelector(".page-preloader")) return;

      var loader = document.createElement("div");
      loader.className = "page-preloader";
      loader.setAttribute("aria-hidden", "true");
      loader.innerHTML = '<span class="page-preloader__ring"></span>';
      document.body.appendChild(loader);
      var hidden = false;
      var forceHideTimer = null;
      var domHideTimer = null;

      function hide(){
        if (hidden) return;
        hidden = true;
        if (forceHideTimer) {
          clearTimeout(forceHideTimer);
          forceHideTimer = null;
        }
        if (domHideTimer) {
          clearTimeout(domHideTimer);
          domHideTimer = null;
        }
        loader.classList.add("is-hidden");
        setTimeout(function(){ loader.remove(); }, 520);
      }

      function scheduleDomHide(){
        if (hidden) return;
        if (domHideTimer) return;
        domHideTimer = setTimeout(function(){
          domHideTimer = null;
          hide();
        }, 180);
      }

      // Fallback in case external resources keep window.load pending.
      forceHideTimer = setTimeout(hide, 2600);

      if (document.readyState === "complete") {
        requestAnimationFrame(hide);
      } else if (document.readyState === "interactive") {
        scheduleDomHide();
      } else {
        document.addEventListener("DOMContentLoaded", scheduleDomHide, { once: true });
        window.addEventListener("load", function(){ setTimeout(hide, 140); }, { once: true });
      }
    }

    function initSectionIntro(){
      document.body.classList.add("motion-enabled");

      for (var i = 0; i < sections.length; i++){
        sections[i].classList.add("section-animate");
        sections[i].style.setProperty("--section-delay", (i * 70) + "ms");
      }

      if (prefersReduced || !supportsIO) {
        for (var j = 0; j < sections.length; j++){
          sections[j].classList.add("section-in");
        }
        return;
      }

      var sectionObserver = new IntersectionObserver(function(entries, observer){
        for (var k = 0; k < entries.length; k++){
          var entry = entries[k];
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("section-in");
          observer.unobserve(entry.target);
        }
      }, {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px"
      });

      for (var s = 0; s < sections.length; s++){
        sectionObserver.observe(sections[s]);
      }
    }

    function applyReveal(root){
      var host = root || document;
      var nodes = host.querySelectorAll(revealSelector);
      var buckets = new Map();
      var fresh = [];

      for (var i = 0; i < nodes.length; i++){
        var el = nodes[i];
        if (el.dataset.ioBound === "1") continue;
        if (hasGsapReveal && el.classList.contains("reveal")) continue;

        el.dataset.ioBound = "1";
        el.classList.add("io-reveal");
        fresh.push(el);

        var scope = el.closest("section") || el.parentElement || document.body;
        if (!buckets.has(scope)) buckets.set(scope, []);
        buckets.get(scope).push(el);
      }

      buckets.forEach(function(items){
        for (var i = 0; i < items.length; i++){
          var delay = Math.min(i, 8) * 70;
          items[i].style.setProperty("--io-delay", delay + "ms");
        }
      });

      if (!fresh.length) return;

      if (prefersReduced || !supportsIO) {
        for (var i = 0; i < fresh.length; i++){
          fresh[i].classList.add("io-in");
        }
        return;
      }

      if (!revealObserver) {
        revealObserver = new IntersectionObserver(function(entries, observer){
          for (var i = 0; i < entries.length; i++){
            var entry = entries[i];
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("io-in");
            observer.unobserve(entry.target);
          }
        }, {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px"
        });
      }

      for (var i = 0; i < fresh.length; i++){
        revealObserver.observe(fresh[i]);
      }
    }

    function initWorkImageFade(root){
      var host = root || document;
      var imgs = host.querySelectorAll(".work img");

      for (var i = 0; i < imgs.length; i++){
        var img = imgs[i];
        if (img.dataset.fadeBound === "1") continue;
        img.dataset.fadeBound = "1";

        if (prefersReduced) {
          img.classList.add("img-loaded");
          continue;
        }

        if (img.closest(".grid-panel--unsplash")) {
          img.removeAttribute("data-fade-ready");
          img.classList.add("img-loaded");
          continue;
        }

        img.setAttribute("data-fade-ready", "1");
        (function(target){
          var show = function(){
            target.removeAttribute("data-fade-ready");
            target.classList.add("img-loaded");
          };
          var failSafe = setTimeout(show, 2400);
          var done = function(){
            clearTimeout(failSafe);
            show();
          };

          if (target.complete && target.naturalWidth > 0) {
            requestAnimationFrame(done);
            return;
          }
          target.addEventListener("load", done, { once: true });
          target.addEventListener("error", done, { once: true });
        })(img);
      }
    }

    function animateVisibleWorkCards(){
      if (prefersReduced) return;
      var panels = document.querySelectorAll(".grid-panel");

      for (var p = 0; p < panels.length; p++){
        var panel = panels[p];
        if (window.getComputedStyle(panel).display === "none") continue;
        var rect = panel.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight * 1.08) continue;

        var cards = panel.querySelectorAll(".work");
        if (!cards.length) continue;

        for (var i = 0; i < cards.length; i++){
          var card = cards[i];
          var delay = Math.min(i, 10) * 70;
          card.classList.remove("work-enter", "work-enter-active");
          card.style.removeProperty("--work-enter-delay");
          card.style.setProperty("--work-enter-delay", delay + "ms");
          card.classList.add("work-enter");
          void card.offsetWidth;
          card.classList.add("work-enter-active");

          if (card.__workEnterTimer) clearTimeout(card.__workEnterTimer);
          card.__workEnterTimer = setTimeout(function(el){
            return function(){
              el.classList.remove("work-enter", "work-enter-active");
              el.style.removeProperty("--work-enter-delay");
            };
          }(card), 900 + delay);
        }
      }
    }

    function bindPortfolioEntrance(){
      var portfolio = document.getElementById("portfolio");
      if (!portfolio || prefersReduced) return;

      if (!supportsIO) {
        var onScroll = function(){
          var r = portfolio.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight * 0.92) return;
          animateVisibleWorkCards();
          window.removeEventListener("scroll", onScroll);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return;
      }

      var onceObserver = new IntersectionObserver(function(entries, observer){
        for (var i = 0; i < entries.length; i++){
          if (!entries[i].isIntersecting) continue;
          animateVisibleWorkCards();
          observer.unobserve(entries[i].target);
        }
      }, {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px"
      });
      onceObserver.observe(portfolio);
    }

    function bindTabCardAnimation(){
      var radios = document.querySelectorAll('.tab-input[name="workTabs"]');
      for (var i = 0; i < radios.length; i++){
        var radio = radios[i];
        if (radio.__workAnimBound) continue;
        radio.__workAnimBound = true;
        radio.addEventListener("change", function(){
          setTimeout(function(){
            animateVisibleWorkCards();
            initWorkImageFade(document);
          }, 24);
        });
      }
    }

    function watchDynamicContent(){
      var roots = [document.getElementById("grid"), document.getElementById("unsplashGrid")].filter(Boolean);
      for (var i = 0; i < roots.length; i++){
        (function(root){
          var motionTick = null;
          var mo = new MutationObserver(function(){
            if (motionTick) clearTimeout(motionTick);
            motionTick = setTimeout(function(){
              applyReveal(root);
              initWorkImageFade(root);
              animateVisibleWorkCards();
            }, 28);
          });
          mo.observe(root, { childList: true, subtree: true });
        })(roots[i]);
      }
    }

    function initNavActive(){
      var navLinks = Array.from(
        document.querySelectorAll('.navlinks > a[href^="#"], .navlinks > .dropdown > .dropbtn[href^="#"]')
      );
      if (!navLinks.length) return;

      var map = new Map();
      for (var i = 0; i < navLinks.length; i++){
        var href = navLinks[i].getAttribute("href") || "";
        var id = href.replace("#", "").trim();
        if (!id) continue;
        map.set(id, navLinks[i]);
      }

      var sectionList = Array.from(map.keys())
        .map(function(id){ return document.getElementById(id); })
        .filter(Boolean);

      if (!sectionList.length) return;

      function setActive(id){
        for (var i = 0; i < navLinks.length; i++){
          var href = navLinks[i].getAttribute("href");
          navLinks[i].classList.toggle("nav-active", href === "#" + id);
        }
      }

      function pickByScroll(){
        var pivot = window.scrollY + window.innerHeight * 0.35;
        var current = sectionList[0].id;
        for (var i = 0; i < sectionList.length; i++){
          if (pivot >= sectionList[i].offsetTop) current = sectionList[i].id;
        }
        return current;
      }

      for (var i = 0; i < navLinks.length; i++){
        (function(link){
          link.addEventListener("click", function(){
            var id = (link.getAttribute("href") || "").replace("#", "").trim();
            if (id) setActive(id);
          });
        })(navLinks[i]);
      }

      if (!supportsIO) {
        var onScroll = function(){ setActive(pickByScroll()); };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return;
      }

      var visible = new Map();
      var navObserver = new IntersectionObserver(function(entries){
        for (var i = 0; i < entries.length; i++){
          var entry = entries[i];
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }

        if (!visible.size){
          setActive(pickByScroll());
          return;
        }

        var activeId = "";
        var bestRatio = -1;
        visible.forEach(function(ratio, id){
          if (ratio > bestRatio){
            bestRatio = ratio;
            activeId = id;
          }
        });

        if (activeId) setActive(activeId);
      }, {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-18% 0px -45% 0px"
      });

      for (var i = 0; i < sectionList.length; i++){
        navObserver.observe(sectionList[i]);
      }
      setActive(pickByScroll());
    }

    function init(){
      initPreloader();
      initSectionIntro();
      applyReveal(document);
      initWorkImageFade(document);
      bindPortfolioEntrance();
      bindTabCardAnimation();
      animateVisibleWorkCards();
      watchDynamicContent();
      initNavActive();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

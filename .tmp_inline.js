
  // ============================================================
  // 1) ПОРТФОЛИО (демо-картинки можно заменить на свои URL)
  // + пользователь может добавить свои фото через загрузчик (localStorage)
  // ============================================================

  // Маппинг категорий -> папка
  const CATEGORY_FOLDERS = [
    { category: "Студийные съёмки", folder: "Студийные съёмки" },
    { category: "Портреты",         folder: "Портреты" },
    { category: "Креативные съемки", folder: "Креативные съёмки" },
    { category: "Стоковые фотографии", folder: "Стоковые фотографии" },
    { category: "Природа",          folder: "Природа" },
  ];

  const UNSPLASH_CATEGORY = "Unsplash";
  const ALL_CATEGORY = "Все";
  const MAX_LOCAL_PER_CATEGORY = 4;
  const UNSPLASH_COUNT = 16;
  const MAX_ALL = MAX_LOCAL_PER_CATEGORY * CATEGORY_FOLDERS.length + UNSPLASH_COUNT;

  function getUnsplashProfileUrl(){
    const link = document.querySelector('a[href*="unsplash.com/@"]');
    return link ? link.href : "";
  }

  function getUnsplashUsername(value){
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const atMatch = raw.match(/@([A-Za-z0-9_-]+)/);
    if (atMatch) return atMatch[1];
    const urlMatch = raw.match(/unsplash\\.com\\/@?([^/?#]+)/i);
    if (urlMatch) return urlMatch[1];
    return raw.replace(/^@/, "");
  }

  function buildUnsplashPhotos(username, count){
    if (!username || !count) return [];
    const list = [];
    for (let i = 0; i < count; i++){
      const sig = i + 1;
      list.push({
        title: `Unsplash #${sig}`,
        category: UNSPLASH_CATEGORY,
        desc: "Подборка из моего профиля на Unsplash.",
        thumb: `https://source.unsplash.com/user/${username}/800x1000?sig=${sig}`,
        full: `https://source.unsplash.com/user/${username}/2000x2500?sig=${sig}`,
        wide: (sig % 6 === 0),
        origin: "unsplash"
      });
    }
    return list;
  }

  function loadUnsplashPhotos(){
    const profileUrl = getUnsplashProfileUrl();
    const username = getUnsplashUsername(profileUrl);
    return buildUnsplashPhotos(username, UNSPLASH_COUNT);
  }

  // Можно оставить описания одинаковыми/общими (или расширить позже)
  function defaultDescFor(category){
    switch (category){
      case "Студийные съёмки":
        return "Студийный свет, чистая геометрия, контроль настроения и детализация кадра.";
      case "Портреты":
        return "Портреты в естественной манере: позирование, темп, спокойный процесс и мягкая ретушь.";
      case "Креативные съемки":
        return "Идея → референсы → свет → кадр. Снимаю концептуально и без визуального шума.";
      case "Стоковые фотографии":
        return "Кадры с понятной идеей и универсальной подачей — для использования в проектах и публикациях.";
      case "Природа":
        return "Тёплые природные истории: воздух, свет и ощущение момента.";
      default:
        return "";
    }
  }

  // Проверка: существует ли картинка по URL (load/error)
  function isValidImage(src){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  // Подбираем реально существующий файл среди расширений
  async function findExistingImage(basePathNoExt){
    const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp"];
    for (const ext of PHOTO_EXTS){
      const url = `${basePathNoExt}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      const ok = await isValidImage(url);
      if (ok) return url;
    }
    return null;
  }

  // Главная функция: собираем портфолио из папок
  async function loadPhotosFromFolders(){
    const out = [];

    // Список всех известных файлов в каждой категории
    const knownFiles = {
      "Студийные съёмки": ["mikhail-seleznev-DKq.jpg", "mikhail-seleznev-E4d.jpg", "mikhail-seleznev-R7c.jpg", "mikhail-seleznev-unH.jpg"],
      "Портреты": ["IMG_1687.jpg", "IMG_6854.jpg", "_MG_2381.jpg", "mikhail-seleznev-3VO.jpg"],
      "Креативные съемки": ["IMG_4472_1.jpg", "IMG_6990_1.jpg", "mikhail-seleznev-bMp.jpg", "mikhail-seleznev-oAf.jpg"],
      "Стоковые фотографии": ["075D56A0-FCE1-4EE3-8.jpeg", "C6A656AE-E6AE-4411-9.jpg", "mikhail-seleznev-9hm.jpg", "mikhail-seleznev-jCb.jpg"],
      "Природа": ["IMG_0747.jpg", "IMG_0756_3.jpg", "_MG_6396.jpg", "_MG_7103.jpg"]
    };

    for (const cat of CATEGORY_FOLDERS){
      const categoryFiles = knownFiles[cat.category] || [];
      
      for (let i = 0; i < categoryFiles.length && i < MAX_LOCAL_PER_CATEGORY; i++){
        const fileName = categoryFiles[i];
        const url = `${cat.folder}/${fileName}`;
        // eslint-disable-next-line no-await-in-loop
        const ok = await isValidImage(url);
        
        if (!ok) continue;

        out.push({
          title: `${cat.category} #${i+1}`,
          category: cat.category,
          desc: defaultDescFor(cat.category),
          thumb: url,
          full: url,
          // для красоты: первое фото в некоторых категориях делаем wide
          wide: (i === 0),
          origin: "local"
        });
      }
    }

    return out;
  }

  // Это будет заполняться после автозагрузки из папок
  let DEFAULT_PHOTOS = [];
  let UNSPLASH_PHOTOS = [];

  // Загружаем фото при старте
  async function initializePhotos() {
    DEFAULT_PHOTOS = await loadPhotosFromFolders();
    UNSPLASH_PHOTOS = loadUnsplashPhotos();
    // После загрузки фото обновляем галерею
    setTimeout(() => {
      renderTabs();
      refreshCategorySelects();
      renderGrid();
      updateHeroImage();
    }, 100);
  }

  // Вызываем при загрузке
  document.addEventListener('DOMContentLoaded', initializePhotos);


  const STORAGE_KEY = "mellowPhotos.userPhotos.v1";

  function safeParse(json){
    try { return JSON.parse(json); } catch { return null; }
  }

  function loadUserPhotos(){
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeParse(raw);
    const list = Array.isArray(data) ? data : [];
    return list.map(p => ({ ...p, origin: p.origin || "user" }));
  }

  function saveUserPhotos(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch(e){
      toast("Не удалось сохранить: память браузера заполнена. Попробуй меньше/меньший размер фото.");
    }
  }

  function getAllPhotos(){
    return [...DEFAULT_PHOTOS, ...loadUserPhotos(), ...UNSPLASH_PHOTOS];
  }

  // hero image = first photo
  const heroImg = document.getElementById("heroImg");
  function updateHeroImage(){
    const allPhotosForHero = getAllPhotos();
    if (heroImg && allPhotosForHero[0]?.full) heroImg.src = allPhotosForHero[0].full;
  }

  // categories
  function buildCategories(){
    const all = getAllPhotos();
    const unique = Array.from(new Set(all.map(p => p.category)));
    const ordered = [];
    if (unique.length) ordered.push(ALL_CATEGORY);
    CATEGORY_FOLDERS.forEach(({ category }) => {
      if (unique.includes(category)) ordered.push(category);
    });
    if (unique.includes(UNSPLASH_CATEGORY)) ordered.push(UNSPLASH_CATEGORY);
    unique.forEach((c) => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }

  let categories = buildCategories();
  const tabsEl = document.getElementById("tabs");
  const gridEl = document.getElementById("grid");
  let active = categories.length > 0 ? categories[0] : "";

  function ensureActiveCategory(){
    if (!categories.length){
      active = "";
      return;
    }
    if (!active || !categories.includes(active)) active = categories[0];
  }

  function renderTabs(){
    tabsEl.innerHTML = "";
    categories = buildCategories();
    ensureActiveCategory();
    categories.forEach(cat => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab magnetic" + (cat === active ? " active" : "");
      b.textContent = cat;
      b.onclick = () => { active = cat; renderTabs(); renderGrid(); };
      tabsEl.appendChild(b);
    });

    const catSelect = document.getElementById("catSelect");
    if (catSelect) catSelect.value = active;
  }

  function renderGrid(){
    gridEl.innerHTML = "";
    ensureActiveCategory();
    if (!active){
      gridEl.innerHTML = `<div class="empty">Пока нет фото — можно загрузить свои или подключить Unsplash.</div>`;
      return;
    }

    const userPhotos = loadUserPhotos();
    const localPhotos = DEFAULT_PHOTOS;
    const unsplashPhotos = UNSPLASH_PHOTOS;

    let list = [];
    if (active === ALL_CATEGORY){
      const limitedLocal = [];
      CATEGORY_FOLDERS.forEach(({ category }) => {
        const subset = localPhotos.filter(p => p.category === category).slice(0, MAX_LOCAL_PER_CATEGORY);
        limitedLocal.push(...subset);
      });
      list = [...limitedLocal, ...userPhotos, ...unsplashPhotos.slice(0, UNSPLASH_COUNT)];
      list = list.slice(0, MAX_ALL);
    } else if (active === UNSPLASH_CATEGORY){
      list = unsplashPhotos.slice(0, UNSPLASH_COUNT);
    } else {
      const localSubset = localPhotos.filter(p => p.category === active).slice(0, MAX_LOCAL_PER_CATEGORY);
      const userSubset = userPhotos.filter(p => p.category === active);
      list = [...localSubset, ...userSubset];
    }

    if (!list.length){
      gridEl.innerHTML = `<div class="empty">В этой категории пока нет фото. Выбери другую или добавь свои.</div>`;
      return;
    }

    list.forEach((p) => {
      const card = document.createElement("article");
      card.className = "work reveal" + (p.wide ? " wide" : "");
      card.setAttribute("data-origin", p.origin || "local");
      const metaText = p.origin === "unsplash" ? "Unsplash" : "Смотреть";
      card.innerHTML = `
        <span class="scan"></span>
        <img src="${p.thumb}" alt="${p.title}" loading="lazy" decoding="async">
        <div class="label">
          <div class="info">
            <div class="title">${p.title}</div>
            <div class="meta">${metaText}</div>
          </div>
          <div class="cat">${p.category}</div>
        </div>
      `;
      card.addEventListener("click", () => openLb(p.full, p.title, p.desc, p.category));
      gridEl.appendChild(card);
    });

    animateGridIn();
    initMotion();
  }

  function animateGridIn(){
    if (reduceMotion || !window.gsap) return;
    const cards = gridEl.querySelectorAll(".work");
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.06, ease: "power2.out" });
    const labels = gridEl.querySelectorAll(".label");
    gsap.fromTo(labels, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: "power2.out" });
  }

  // motion
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  // progress
  const bar = document.querySelector(".progress > span");
  const updateProgress = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const p = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // cursor aura
  const aura = document.querySelector(".aura");
  let mx = window.innerWidth * 0.5, my = window.innerHeight * 0.5;
  let ax = mx, ay = my;
  if (!reduceMotion) {
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => {
      ax += (mx - ax) * 0.14;
      ay += (my - ay) * 0.14;
      aura.style.transform = `translate(${ax}px, ${ay}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } else {
    if (aura) aura.style.display = "none";
  }

  // magnetic
  function initMagnetic(){
    const magnets = document.querySelectorAll(".magnetic");
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    magnets.forEach(el => {
      if (el.__magnetBound) return;
      el.__magnetBound = true;
      let rect;
      const strength = 16;
      const onMove = (e) => {
        rect = rect || el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width/2);
        const y = e.clientY - (rect.top + rect.height/2);
        const tx = clamp(x * 0.22, -strength, strength);
        const ty = clamp(y * 0.22, -strength, strength);
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      };
      const onLeave = () => { rect = null; el.style.transform = "translate(0px, 0px)"; };
      if (!reduceMotion) { el.addEventListener("mousemove", onMove); el.addEventListener("mouseleave", onLeave); }
    });
  }

  // subtle 3D tilt
  function initTilt(){
    if (reduceMotion) return;
    const els = document.querySelectorAll('.work, .hero-media');
    els.forEach(el => {
      if (el.__tiltBound) return;
      el.__tiltBound = true;

      let rect = null;
      const max = 6; // degrees
      const onMove = (e) => {
        rect = rect || el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * -max;
        const ry = (px - 0.5) * max;
        el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      };
      const onLeave = () => { rect = null; el.style.transform = ''; };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  // lightbox
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbTitle = document.getElementById("lbTitle");
  const lbClose = document.getElementById("lbClose");
  const lbDesc = document.getElementById("lbDesc");

  function openLb(src, title, desc, category){
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    lbImg.src = src;
    lbTitle.textContent = category ? `${title || "Preview"} • ${category}` : (title || "Preview");
    if (lbDesc) lbDesc.textContent = desc || "";
    document.body.style.overflow = "hidden";
    trapFocus(lb);
    if (!reduceMotion && window.gsap) gsap.fromTo(".lb-panel", { y: 18, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" });
  }
  function closeLb(){
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    releaseFocusTrap();
    lbImg.src = "";
    if (lbDesc) lbDesc.textContent = "";
  }
  lbClose.addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("open")) closeLb(); });

  // GSAP reveals + parallax
  let motionInited = false;
  function initMotion(){
    initMagnetic();
    initTilt();

    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      document.querySelectorAll(".reveal").forEach(el => { el.style.opacity="1"; el.style.transform="none"; el.style.filter="none"; });
      initReviews();
      initFaq();
      return;
    }
    if (!motionInited){
      motionInited = true;
      gsap.registerPlugin(ScrollTrigger);
      gsap.to("#heroImg", { yPercent: -6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
      gsap.to(".glow", {
        rotation: 6,
        scale: 1.04,
        ease: "none",
        scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 }
      });
    }
    gsap.utils.toArray(".reveal").forEach((el) => {
      if (el.__revealBound) return;
      el.__revealBound = true;
      gsap.to(el, {
        opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
      });
    });
    document.querySelectorAll(".work").forEach(card => {
      if (card.__hoverBound) return;
      card.__hoverBound = true;
      card.addEventListener("mouseenter", () => gsap.to(card, { y: -3, duration: 0.35, ease: "power2.out" }));
      card.addEventListener("mouseleave", () => gsap.to(card, { y: 0, duration: 0.5, ease: "power2.out" }));
    });
  }

  // ============================================================
  // 2) ДИНАМИЧЕСКИЙ ТЕКСТ В HERO
  // ============================================================
  const dyn = document.getElementById("dyn");
  const phrases = ["портреты", "студия", "креатив", "сток", "природа"];
  let pi = 0;
  if (dyn){
    setInterval(() => {
      if (reduceMotion) return;
      pi = (pi + 1) % phrases.length;
      dyn.style.opacity = "0";
      setTimeout(() => { dyn.textContent = phrases[pi]; dyn.style.opacity = ".85"; }, 180);
    }, 2400);
  }

  // ============================================================
  // 3) DROPDOWN + DRAWER (клики и клавиатура)
  // ============================================================
  const servicesDrop = document.getElementById("servicesDrop");
  const servicesBtn = document.getElementById("servicesBtn");

  function closeDropdown(){
    if (!servicesDrop) return;
    servicesDrop.classList.remove("open");
    if (servicesBtn) servicesBtn.setAttribute("aria-expanded", "false");
  }

  if (servicesDrop && servicesBtn){
    servicesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const open = servicesDrop.classList.toggle("open");
      servicesBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // drawer
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const openDrawer = document.getElementById("openDrawer");
  const closeDrawer = document.getElementById("closeDrawer");

  function setDrawer(open){
    if (!drawer || !backdrop) return;
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (openDrawer) openDrawer.addEventListener("click", () => setDrawer(true));
  if (closeDrawer) closeDrawer.addEventListener("click", () => setDrawer(false));
  if (backdrop) backdrop.addEventListener("click", () => setDrawer(false));

  // close dropdown on outside click
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (servicesDrop && servicesDrop.classList.contains("open")){
      if (!servicesDrop.contains(t)) closeDropdown();
    }
  });

  // ============================================================
  // 4) TOAST
  // ============================================================
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  // ============================================================
  // 5) ЗАГРУЗКА СВОИХ ФОТО (file input + drag&drop)
  // ============================================================
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const clearBtn = document.getElementById("clearUserPhotos");
  const uTitle = document.getElementById("uTitle");
  const uCategory = document.getElementById("uCategory");
  const uNewCategory = document.getElementById("uNewCategory");
  const uWide = document.getElementById("uWide");

  function refreshCategorySelects(){
    const cats = buildCategories().filter(c => c !== ALL_CATEGORY);
    if (uCategory){
      uCategory.innerHTML = "";
      cats.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        uCategory.appendChild(opt);
      });
    }

    const catSelect = document.getElementById("catSelect");
    if (catSelect){
      catSelect.innerHTML = "";
      buildCategories().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
      });
      catSelect.value = active;
    }
  }

  function readAsDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(fileList){
    const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith("image/"));
    if (!files.length) return;

    const chosenCategory = (uNewCategory && uNewCategory.value.trim()) || (uCategory && uCategory.value) || "Портфолио";
    const baseTitle = (uTitle && uTitle.value.trim()) || "Моя работа";
    const wide = !!(uWide && uWide.checked);

    const existing = loadUserPhotos();
    const added = [];

    for (let i = 0; i < files.length; i++){
      const f = files[i];
      const dataUrl = await readAsDataURL(f);
      const title = files.length > 1 ? `${baseTitle} #${i+1}` : baseTitle;
      added.push({ title, category: chosenCategory, thumb: dataUrl, full: dataUrl, wide, origin: "user" });
    }

    const merged = [...added, ...existing];
    saveUserPhotos(merged);
    toast(`Добавлено: ${added.length} фото (сохранено в браузере).`);

    renderTabs();
    refreshCategorySelects();
    renderGrid();

    if (uTitle) uTitle.value = "";
    if (uNewCategory) uNewCategory.value = "";
    if (uWide) uWide.checked = false;
  }

  if (fileInput) fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  if (dropzone){
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    ["dragenter","dragover","dragleave","drop"].forEach(evt => dropzone.addEventListener(evt, prevent));
    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files) addFiles(dt.files);
    });
  }

  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      toast("Добавленные фото удалены.");
      renderTabs();
      refreshCategorySelects();
      renderGrid();
    });
  }

  // mobile filter
  const catSelect = document.getElementById("catSelect");
  if (catSelect){
    catSelect.addEventListener("change", () => {
      active = catSelect.value;
      renderTabs();
      renderGrid();
    });
  }

  // ============================================================
  // 6) BOOKING MODAL (дата → автозаполнение формы)
  // ============================================================
  const bookingModal = document.getElementById("bookingModal");
  const bookingClose = document.getElementById("bookingClose");
  const bookingCancel = document.getElementById("bookingCancel");
  const bookingApply = document.getElementById("bookingApply");
  const openBooking = document.getElementById("openBooking");
  const openBooking2 = document.getElementById("openBooking2");

  const bDate = document.getElementById("bDate");
  const bTime = document.getElementById("bTime");
  const bType = document.getElementById("bType");

  function openModal(){
    if (!bookingModal) return;
    bookingModal.classList.add("open");
    bookingModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    trapFocus(bookingModal);
    setTimeout(() => { if (bDate) bDate.focus(); }, 0);
  }

  function closeModal(){
    if (!bookingModal) return;
    bookingModal.classList.remove("open");
    bookingModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    releaseFocusTrap();
  }

  if (openBooking) openBooking.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
  if (openBooking2) openBooking2.addEventListener("click", (e) => { e.preventDefault(); setDrawer(false); openModal(); });
  if (bookingClose) bookingClose.addEventListener("click", closeModal);
  if (bookingCancel) bookingCancel.addEventListener("click", closeModal);
  if (bookingModal) bookingModal.addEventListener("click", (e) => { if (e.target === bookingModal) closeModal(); });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      if (bookingModal && bookingModal.classList.contains("open")) closeModal();
      closeDropdown();
      if (drawer && drawer.classList.contains("open")) setDrawer(false);
    }
  });

  if (bookingApply){
    bookingApply.addEventListener("click", () => {
      const d = (bDate && bDate.value) ? bDate.value : "без даты";
      const t = (bTime && bTime.value) ? bTime.value : "не важно";
      const type = (bType && bType.value) ? bType.value : "съёмка";

      const comment = document.getElementById("comment");
      if (comment){
        const chunk = `Хочу: ${type}. Дата: ${d}. Время: ${t}.`;
        comment.value = comment.value ? (chunk + "\n" + comment.value) : chunk;
      }
      closeModal();
      document.querySelector("#contact")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      toast("Готово: дата добавлена в форму ниже.");
    });
  }

  // ============================================================
  // 7) ОТЗЫВЫ (dots)
  // ============================================================
  const tTrack = document.getElementById("tTrack");
  const tDots = document.getElementById("tDots");
  let tIndex = 0;

  function setReview(i){
    if (!tTrack) return;
    const count = tTrack.children.length;
    tIndex = (i + count) % count;
    tTrack.style.transform = `translateX(-${tIndex * 100}%)`;
    if (tDots){
      [...tDots.querySelectorAll("button")].forEach((b, bi) => b.classList.toggle("active", bi === tIndex));
    }
  }

  function initReviews(){
    if (!tTrack || !tDots) return;
    tDots.innerHTML = "";
    const count = tTrack.children.length;
    for (let i = 0; i < count; i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dot" + (i === 0 ? " active" : "");
      b.setAttribute("aria-label", `Показать отзыв ${i+1}`);
      b.addEventListener("click", () => setReview(i));
      tDots.appendChild(b);
    }
    if (!reduceMotion){
      setInterval(() => setReview(tIndex + 1), 5200);
    }
  }

  // ============================================================
  // 7.5) PRICING EXPAND ON HOVER / TAP
  // ============================================================
  function initPricingExpand(){
    const cards = document.querySelectorAll('.price-card[data-expand="price"]');
    if (!cards.length) return;

    const hasHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    cards.forEach(card => {
      if (card.__priceBound) return;
      card.__priceBound = true;

      const toggle = () => card.classList.toggle('expanded');

      card.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('a,button,input,select,textarea,label')) return;
        if (hasHover) return; // desktop hover handles it
        toggle();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // ============================================================
  // 8) FAQ ACCORDION
  // ============================================================
  function initFaq(){
    document.querySelectorAll(".qa").forEach(el => {
      if (el.__qaBound) return;
      el.__qaBound = true;
      const toggle = () => {
        const open = el.classList.toggle("open");
        el.setAttribute("aria-expanded", open ? "true" : "false");
      };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  // ============================================================
  // 9) FOCUS TRAP (для модалок)
  // ============================================================
  let lastActiveEl = null;
  let trapRoot = null;

  function focusables(root){
    return [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
  }

  function onTrapKeydown(e){
    if (!trapRoot || e.key !== "Tab") return;
    const items = focusables(trapRoot);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

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

  // ============================================================
  // 10) SUBMIT: mailto (как «реальная» заявка без сервера)
  // ============================================================
  document.getElementById("submitBtn").addEventListener("click", (e) => {
    if (!reduceMotion && window.gsap) gsap.fromTo(e.currentTarget, { scale: 1 }, { scale: 0.98, yoyo: true, repeat: 1, duration: 0.12, ease: "power2.out" });

    const name = (document.getElementById("name")?.value || "").trim();
    const contact = (document.getElementById("contactVal")?.value || "").trim();
    const comment = (document.getElementById("comment")?.value || "").trim();

    if (!name || !contact){
      toast("Укажи имя и контакт (Telegram/телефон), пожалуйста.");
      return;
    }

    const to = "mihmihfotobu@gmail.com";
    const subject = encodeURIComponent("Заказать фотосессию");
    const body = encodeURIComponent(
      `Имя: ${name}
Контакт: ${contact}

Комментарий/детали:
${comment || "—"}`
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    toast("Открылось письмо — просто нажми «Отправить».");
  });

  // init
  initReviews();
  initPricingExpand();
  initFaq();
  initMotion();

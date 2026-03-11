import { test, expect } from "@playwright/test";

async function openUnsplashTab(page) {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#portfolio");
  await page.locator("#portfolio").scrollIntoViewIfNeeded();
  await page.waitForSelector("#tabGlow");
  await page.locator('.tabs label[for="tab-unsplash"]').click();
  await page.waitForSelector("#unsplashGrid .work");
  await page.waitForFunction(() => {
    const glow = document.getElementById("tabGlow");
    return Boolean(glow && glow.classList.contains("run"));
  });
}

test.describe("recent photos glow", function(){
  test("desktop tab keeps the dedicated glow lane and starts the animation", async function({ page }, testInfo){
    await page.setViewportSize({ width: 1440, height: 1200 });
    await openUnsplashTab(page);

    const metrics = await page.evaluate(() => {
      const glow = document.getElementById("tabGlow");
      const panel = document.getElementById("unsplashGrid");
      const firstPath = glow?.querySelector(".glow-path.a");

      if (!glow || !panel || !firstPath) return null;

      const glowRect = glow.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(firstPath);

      return {
        top: parseFloat(glow.style.top || "0"),
        width: parseFloat(glow.style.width || "0"),
        height: parseFloat(glow.style.height || "0"),
        run: glow.classList.contains("run"),
        pathAnimationName: style.animationName,
        glowTopInViewport: glowRect.top,
        glowBottomInViewport: glowRect.bottom,
        panelTopInViewport: panelRect.top,
        panelBottomInViewport: panelRect.bottom
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.run).toBeTruthy();
    expect(metrics.top).toBeGreaterThanOrEqual(150);
    expect(metrics.top).toBeLessThanOrEqual(280);
    expect(metrics.width).toBeGreaterThan(900);
    expect(metrics.height).toBeGreaterThan(500);
    expect(metrics.pathAnimationName).toContain("lineSweep");
    expect(metrics.glowBottomInViewport).toBeGreaterThan(metrics.panelTopInViewport);
    expect(metrics.glowTopInViewport).toBeLessThan(metrics.panelBottomInViewport);

    await page.screenshot({
      path: testInfo.outputPath("unsplash-glow-desktop.png"),
      fullPage: true
    });
  });

  test.describe("mobile", function(){
    test.use({ viewport: { width: 390, height: 844 } });

    test("tab keeps the vertical glow sweep after switching to recent photos", async function({ page }, testInfo){
      await openUnsplashTab(page);

      const metrics = await page.evaluate(() => {
        const glow = document.getElementById("tabGlow");
        const firstPath = glow?.querySelector(".glow-path.a");
        if (!glow || !firstPath) return null;

        return {
          top: parseFloat(glow.style.top || "0"),
          width: parseFloat(glow.style.width || "0"),
          height: parseFloat(glow.style.height || "0"),
          transform: glow.style.transform || "",
          run: glow.classList.contains("run"),
          pathAnimationName: window.getComputedStyle(firstPath).animationName
        };
      });

      expect(metrics).not.toBeNull();
      expect(metrics.run).toBeTruthy();
      expect(metrics.top).toBeGreaterThan(0);
      expect(metrics.width).toBeGreaterThan(600);
      expect(metrics.height).toBeGreaterThan(500);
      expect(metrics.transform).toContain("rotate(-90deg)");
      expect(metrics.pathAnimationName).toContain("lineSweep");

      await page.screenshot({
        path: testInfo.outputPath("unsplash-glow-mobile.png"),
        fullPage: true
      });
    });
  });

  test("recent photos keep the same fade states as the rest of the gallery", async function({ page }){
    await openUnsplashTab(page);

    await page.evaluate(() => {
      const img = document.querySelector("#unsplashGrid .work img");
      if (!img) return;
      img.classList.remove("img-loaded");
      img.setAttribute("data-fade-ready", "1");
    });

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const img = document.querySelector("#unsplashGrid .work img");
        if (!img) return false;
        return Number.parseFloat(window.getComputedStyle(img).opacity || "1") < 0.2;
      });
    }, {
      timeout: 2000
    }).toBe(true);

    await page.evaluate(() => {
      const img = document.querySelector("#unsplashGrid .work img");
      if (!img) return;
      img.removeAttribute("data-fade-ready");
      img.classList.add("img-loaded");
    });

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const img = document.querySelector("#unsplashGrid .work img");
        if (!img) return false;
        return Number.parseFloat(window.getComputedStyle(img).opacity || "0") > 0.95;
      });
    }, {
      timeout: 2000
    }).toBe(true);
  });
});

import { test, expect } from "@playwright/test";

test.describe("mobile glow coverage", function(){
  test.use({ viewport: { width: 390, height: 844 } });

  test("covers vertical span from hero image bottom to site bottom", async function({ page }, testInfo){
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero-media");
    await page.waitForSelector("#tabGlow");
    await page.waitForFunction(function(){
      var glow = document.getElementById("tabGlow");
      if (!glow) return false;
      return glow.style.top.endsWith("px") && glow.style.width.endsWith("px");
    });
    await page.waitForTimeout(700);

    var coverage = await page.evaluate(function(){
      var hero = document.querySelector(".hero-media");
      var glow = document.getElementById("tabGlow");
      var grid = document.getElementById("grid");
      if (!hero || !glow || !grid) return null;

      var docEl = document.documentElement;
      var body = document.body;
      var scrollTop = window.scrollY || window.pageYOffset || 0;
      var heroBottomDoc = hero.getBoundingClientRect().bottom + scrollTop;
      var gridTopDoc = grid.getBoundingClientRect().top + scrollTop;
      var siteBottomDoc = Math.max(
        (docEl && docEl.scrollHeight) || 0,
        (docEl && docEl.offsetHeight) || 0,
        (docEl && docEl.clientHeight) || 0,
        (body && body.scrollHeight) || 0,
        (body && body.offsetHeight) || 0,
        (body && body.clientHeight) || 0
      );
      var glowTop = parseFloat(glow.style.top || "0");
      var glowWidth = parseFloat(glow.style.width || "0");
      var glowHeight = parseFloat(glow.style.height || "0");
      var glowCenterDoc = gridTopDoc + glowTop;

      return {
        isMobile: window.matchMedia("(max-width: 980px)").matches,
        gridTopDoc: gridTopDoc,
        glowTop: glowTop,
        glowWidth: glowWidth,
        glowHeight: glowHeight,
        glowStartDoc: glowCenterDoc - (glowWidth / 2),
        glowEndDoc: glowCenterDoc + (glowWidth / 2),
        heroBottomDoc: heroBottomDoc,
        siteBottomDoc: siteBottomDoc
      };
    });

    expect(coverage).not.toBeNull();
    expect(coverage.isMobile).toBeTruthy();
    expect(coverage.glowWidth).toBeGreaterThan(0);
    expect(coverage.glowHeight).toBeGreaterThan(0);

    var tolerancePx = 48;
    expect(coverage.glowStartDoc).toBeLessThanOrEqual(coverage.heroBottomDoc + tolerancePx);
    expect(coverage.glowEndDoc).toBeGreaterThanOrEqual(coverage.siteBottomDoc - tolerancePx);

    await page.screenshot({
      path: testInfo.outputPath("mobile-glow-coverage.png"),
      fullPage: true
    });
  });
});

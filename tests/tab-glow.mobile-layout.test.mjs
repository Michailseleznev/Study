import test from "node:test";
import assert from "node:assert/strict";

import { computeMobileGlowLayoutMetrics } from "../tab-glow.js";

test("mobile layout spans from hero bottom to page bottom", function(){
  var metrics = computeMobileGlowLayoutMetrics({
    panelHeight: 1400,
    gridWidth: 360,
    viewportHeight: 780,
    viewportWidth: 390,
    gridTopDoc: 1100,
    heroBottomDoc: 760,
    siteBottomDoc: 4860
  });

  assert.equal(metrics.top, 1710);
  assert.equal(metrics.width, 4182);
  assert.equal(metrics.height, 684);

  var startY = 760 - 1100;
  var endY = 4860 - 1100;
  assert.ok(metrics.top - (metrics.width / 2) <= startY);
  assert.ok(metrics.top + (metrics.width / 2) >= endY);
});

test("mobile layout falls back to panel-driven geometry without hero span", function(){
  var metrics = computeMobileGlowLayoutMetrics({
    panelHeight: 1200,
    gridWidth: 320,
    viewportHeight: 700,
    viewportWidth: 375
  });

  assert.equal(metrics.top, 600);
  assert.equal(metrics.width, 1344);
  assert.equal(metrics.height, 638);
});

test("falls back when page bottom is not below hero bottom", function(){
  var metrics = computeMobileGlowLayoutMetrics({
    panelHeight: 1000,
    gridWidth: 300,
    viewportHeight: 700,
    viewportWidth: 375,
    gridTopDoc: 1200,
    heroBottomDoc: 5000,
    siteBottomDoc: 4800
  });

  assert.equal(metrics.top, 500);
  assert.equal(metrics.width, 1330);
  assert.equal(metrics.height, 638);
});

test("caps hero-span sweep on very long pages", function(){
  var metrics = computeMobileGlowLayoutMetrics({
    panelHeight: 1400,
    gridWidth: 360,
    viewportHeight: 780,
    viewportWidth: 390,
    gridTopDoc: 0,
    heroBottomDoc: 1000,
    siteBottomDoc: 60000
  });

  assert.equal(metrics.width, 20000);
  assert.equal(metrics.top, 30500);
  assert.equal(metrics.height, 684);
});

test("falls back when hero bounds are unavailable", function(){
  var metrics = computeMobileGlowLayoutMetrics({
    panelHeight: 800,
    gridWidth: 320,
    viewportHeight: 650,
    viewportWidth: 360,
    gridTopDoc: 1000,
    heroBottomDoc: NaN,
    siteBottomDoc: 5000
  });

  assert.equal(metrics.top, 400);
  assert.equal(metrics.width, 1235);
  assert.equal(metrics.height, 612);
});

test("recalculates geometry for orientation change", function(){
  var portrait = computeMobileGlowLayoutMetrics({
    panelHeight: 900,
    gridWidth: 340,
    viewportHeight: 844,
    viewportWidth: 390
  });
  var landscape = computeMobileGlowLayoutMetrics({
    panelHeight: 900,
    gridWidth: 340,
    viewportHeight: 390,
    viewportWidth: 844
  });

  assert.equal(portrait.width, 1604);
  assert.equal(landscape.width, 1008);
  assert.equal(portrait.height, 663);
  assert.equal(landscape.height, 1435);
  assert.ok(landscape.width < portrait.width);
  assert.ok(landscape.height > portrait.height);
});

/**
 * farm-core.js
 * -----------------------------------------------------------------------
 * Pure, framework-free game logic for the Vocabulary Farm (Phase 1).
 *
 * This file has ZERO dependency on the DOM or Firebase on purpose:
 *  - farm.html loads it with a plain <script src="farm-core.js"></script>
 *    (defines everything on `window`, no bundler needed — matches the
 *    rest of this static, build-tool-free site).
 *  - A Node test script can `require('./farm-core.js')` directly to unit
 *    test the crop-growth / offline-progression math without a browser
 *    or a real Firebase project.
 *
 * Nothing in here does I/O. Every function takes plain data in and
 * returns plain data out, so it's safe to reason about offline
 * progression (the "student closes the tab for 8 hours" case) with
 * simple assertions.
 * -----------------------------------------------------------------------
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------
  // Economy / content configuration.
  // Nothing about prices, durations or plot counts is hard-coded into
  // UI markup — it all flows from this object (spec §17 / §40).
  // ------------------------------------------------------------------
  var CONFIG = {
    startingCoins: 2000,
    totalPlots: 12,
    xpPerLevel: 100,
    // Ratio of a crop's growth duration spent in each visual stage.
    // (0.10 -> first 10% of growth time the plot shows a bare seed, etc.)
    stageThresholds: {
      seed: 0.10,
      sprout: 0.35,
      growing: 0.65,
      budding: 0.90
      // >= 0.90 => "mature" (ready, pending water check)
    },
    crops: {
      carrot: {
        id: "carrot", name: "Cà rốt", seedName: "Hạt cà rốt", productName: "Cà rốt",
        growthDurationSec: 30 * 60,     // 30 minutes — fast starter crop
        seedCost: 30, sellPrice: 55, xpReward: 5,
        themeColor: "#f97316", leafColor: "#16a34a", fruitShape: "triangle", fruitCount: 3, fruitScale: 0.8
      },
      rose: {
        id: "rose", name: "Hoa hồng", seedName: "Hạt hoa hồng", productName: "Hoa hồng",
        growthDurationSec: 2 * 3600,    // 2 hours
        seedCost: 60, sellPrice: 140, xpReward: 9,
        themeColor: "#ec4899", leafColor: "#15803d", fruitShape: "flower", fruitCount: 1, fruitScale: 1.0
      },
      tomato: {
        id: "tomato", name: "Cà chua", seedName: "Hạt cà chua", productName: "Cà chua",
        growthDurationSec: 3 * 3600,    // 3 hours
        seedCost: 80, sellPrice: 190, xpReward: 12,
        themeColor: "#ef4444", leafColor: "#16a34a", fruitShape: "circle", fruitCount: 4, fruitScale: 0.9
      },
      rice: {
        id: "rice", name: "Lúa", seedName: "Hạt lúa giống", productName: "Lúa",
        growthDurationSec: 4 * 3600,    // 4 hours
        seedCost: 100, sellPrice: 260, xpReward: 16,
        themeColor: "#eab308", leafColor: "#65a30d", fruitShape: "oval", fruitCount: 5, fruitScale: 0.6
      },
      lotus: {
        id: "lotus", name: "Hoa sen", seedName: "Củ sen giống", productName: "Hoa sen",
        growthDurationSec: 6 * 3600,    // 6 hours
        seedCost: 150, sellPrice: 420, xpReward: 24,
        themeColor: "#c084fc", leafColor: "#0d9488", fruitShape: "flower", fruitCount: 1, fruitScale: 1.3
      }
    }
  };

  // ------------------------------------------------------------------
  // Growth math — the heart of "offline progression" (spec §29/§30).
  // These are pure functions of (plantedAt, growthDurationSec, now).
  // No frontend interval is ever trusted for the actual reward; a tick
  // just re-renders whatever this function currently returns.
  // ------------------------------------------------------------------

  /** 0..~1.15, clamped. >=1 means fully grown (a little headroom kept so
   *  "very overdue" doesn't behave differently from "just matured"). */
  function growthRatio(plantedAtMs, growthDurationSec, nowMs) {
    if (plantedAtMs == null || !growthDurationSec) return 0;
    var elapsedSec = (nowMs - plantedAtMs) / 1000;
    if (elapsedSec < 0) elapsedSec = 0; // clock skew guard
    var ratio = elapsedSec / growthDurationSec;
    if (ratio > 1.15) ratio = 1.15;
    return ratio;
  }

  /** "seed" | "sprout" | "growing" | "budding" | "mature" */
  function stageFromRatio(ratio) {
    var t = CONFIG.stageThresholds;
    if (ratio < t.seed) return "seed";
    if (ratio < t.sprout) return "sprout";
    if (ratio < t.growing) return "growing";
    if (ratio < t.budding) return "budding";
    return "mature";
  }

  /**
   * Full derived view of one plot at a point in time. This is what both
   * the renderer and the "can I harvest this?" gate consult — a plot's
   * stored doc only ever has {cropId, plantedAt, growthDurationSec,
   * watered}; everything else is recomputed, never trusted from a stale
   * client cache.
   */
  function deriveCropView(plot, nowMs) {
    if (!plot || !plot.cropId) {
      return { stage: "empty", ratio: 0, readyToHarvest: false, needsWater: false };
    }
    var ratio = growthRatio(plot.plantedAt, plot.growthDurationSec, nowMs);
    var stage = stageFromRatio(ratio);
    var mature = stage === "mature";
    return {
      stage: stage,
      ratio: ratio,
      // Harvest is gated on watering at least once during the crop's
      // life (spec §18) — deterministic from stored data + now, no
      // separate "paused growth" bookkeeping needed for Phase 1.
      readyToHarvest: mature && !!plot.watered,
      needsWater: !plot.watered && ratio >= CONFIG.stageThresholds.sprout
    };
  }

  /** Rounded-down whole seconds until the next stage boundary, or 0. Used
   *  purely for the little countdown label — never for reward logic. */
  function secondsToNextStage(plot, nowMs) {
    if (!plot || !plot.cropId) return 0;
    var ratio = growthRatio(plot.plantedAt, plot.growthDurationSec, nowMs);
    if (ratio >= 1) return 0;
    var thresholds = [
      CONFIG.stageThresholds.seed,
      CONFIG.stageThresholds.sprout,
      CONFIG.stageThresholds.growing,
      CONFIG.stageThresholds.budding,
      1
    ];
    var nextT = thresholds.find(function (t) { return t > ratio; });
    if (nextT === undefined) return 0;
    var remainingRatio = nextT - ratio;
    return Math.max(0, Math.round(remainingRatio * plot.growthDurationSec));
  }

  function levelFromXp(xp) {
    return Math.floor((xp || 0) / CONFIG.xpPerLevel) + 1;
  }

  // ------------------------------------------------------------------
  // Exports — plain `window` globals in the browser, CommonJS in Node.
  // ------------------------------------------------------------------
  var api = {
    CONFIG: CONFIG,
    growthRatio: growthRatio,
    stageFromRatio: stageFromRatio,
    deriveCropView: deriveCropView,
    secondsToNextStage: secondsToNextStage,
    levelFromXp: levelFromXp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.FarmCore = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

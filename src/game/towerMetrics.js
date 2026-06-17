(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OrbitTowerMetrics = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const BEACON_RANGES = [140, 155, 170];
  const BEACON_DAMAGE = [0.1, 0.2, 0.3];
  const BEACON_COOLDOWN = [0.1, 0.15, 0.2];

  function levelIndex(level) {
    return Math.max(0, Math.min(2, Number(level || 1) - 1));
  }

  function towerBaseRange(type, baseRange, level, branch) {
    if (type === "beacon") {
      return branch === "amplify" ? 250 : BEACON_RANGES[levelIndex(level)];
    }
    return baseRange * (1 + levelIndex(level) * 0.08);
  }

  function auraDamageBoost(level, branch) {
    return branch === "overclock" ? 0.4 : BEACON_DAMAGE[levelIndex(level)];
  }

  function auraCooldownBoost(level, branch) {
    return branch === "overclock" ? 0.3 : BEACON_COOLDOWN[levelIndex(level)];
  }

  function sellValue(spent, recycleLevel) {
    const sellRate = Math.min(0.82, 0.62 + (Number(recycleLevel) || 0) * 0.05);
    return Math.floor((Number(spent) || 0) * sellRate);
  }

  function estimateOutput(type, stats, laserMaxMultiplier = 2) {
    const damage = Number(stats.damage) || 0;
    const cooldown = Number(stats.cooldown) || 0;
    if (!damage) return { dps: 0, maxDps: 0, throughput: 0 };
    if (type === "laser") {
      return {
        dps: damage,
        maxDps: damage * laserMaxMultiplier,
        throughput: damage * laserMaxMultiplier,
      };
    }
    const dps = cooldown > 0 ? damage / cooldown : damage;
    const targets = Math.max(1, Number(stats.pierce) || Number(stats.chain) || 1);
    return { dps, maxDps: dps, throughput: dps * targets };
  }

  return {
    auraCooldownBoost,
    auraDamageBoost,
    estimateOutput,
    sellValue,
    towerBaseRange,
  };
});

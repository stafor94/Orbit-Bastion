"use strict";

const assert = require("node:assert/strict");
const metrics = require("../src/game/towerMetrics.js");

assert.deepEqual(
  [1, 2, 3].map((level) => metrics.towerBaseRange("beacon", 160, level, null)),
  [140, 155, 170],
);
assert.equal(metrics.towerBaseRange("beacon", 160, 3, "amplify"), 250);
assert.deepEqual(
  [1, 2, 3].map((level) => metrics.auraDamageBoost(level, null)),
  [0.1, 0.2, 0.3],
);
assert.deepEqual(
  [1, 2, 3].map((level) => metrics.auraCooldownBoost(level, null)),
  [0.1, 0.15, 0.2],
);
assert.equal(metrics.auraDamageBoost(3, "overclock"), 0.4);
assert.equal(metrics.auraCooldownBoost(3, "overclock"), 0.3);
assert.equal(metrics.sellValue(65, 0), 40);
assert.equal(metrics.sellValue(100, 4), 82);
assert.deepEqual(
  metrics.estimateOutput("pulse", { damage: 20, cooldown: 0.5, pierce: 2 }),
  { dps: 40, maxDps: 40, throughput: 80 },
);
assert.deepEqual(
  metrics.estimateOutput("laser", { damage: 20, cooldown: 1.5 }, 2),
  { dps: 13.333333333333334, maxDps: 26.666666666666668, throughput: 26.666666666666668 },
);

console.log("towerMetrics: all tests passed");

"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const tests = [
  ["node", ["scripts/towerMetrics.test.js"]],
  ["node", ["scripts/gameData.validation.test.js"]],
  ["node", ["scripts/htmlStructure.test.js"]],
  ["node", ["scripts/sync_readme_content.js", "--check"]],
];

let failed = false;

for (const [command, args] of tests) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`Test failed: ${label}`);
  }
}

if (failed) process.exit(1);

console.log("\nall test scripts passed");

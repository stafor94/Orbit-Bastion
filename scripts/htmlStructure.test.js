"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const ids = [...indexHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const seen = new Set();
const duplicates = new Set();

for (const id of ids) {
  if (seen.has(id)) duplicates.add(id);
  seen.add(id);
}

assert.deepEqual([...duplicates].sort(), [], `index.html contains duplicate id attributes: ${[...duplicates].sort().join(", ")}`);

console.log("html structure: all checks passed");

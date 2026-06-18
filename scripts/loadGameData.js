"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const dataScripts = [
  "src/data/difficulties.js",
  "src/data/gameData.js",
  "src/data/towerExpansion.js",
];

function loadGameData() {
  const context = {
    console,
    window: {},
  };
  context.globalThis = context;
  vm.createContext(context);

  for (const file of dataScripts) {
    const fullPath = path.join(rootDir, file);
    vm.runInContext(fs.readFileSync(fullPath, "utf8"), context, { filename: file });
  }

  return context.window.OrbitGameData;
}

module.exports = {
  loadGameData,
  rootDir,
};

"use strict";

const assert = require("node:assert/strict");
const { loadGameData } = require("./loadGameData.js");

const {
  BRANCH_DEFS,
  DIFFICULTY_DEFS,
  ENEMY_DEFS,
  RESEARCH_DEFS,
  RESEARCH_LAYOUT,
  SLOT_KINDS,
  STAGES,
  STAGE_RULES,
  TOWER_DEFS,
} = loadGameData();

const enemyTypes = new Set(Object.keys(ENEMY_DEFS));
const towerTypes = new Set(Object.keys(TOWER_DEFS));
const researchIds = new Set(RESEARCH_DEFS.map((def) => def.id));
const slotKinds = new Set(SLOT_KINDS.map((kind) => kind.id));

function assertCoordinatePair(pair, label, min, max) {
  assert.equal(Array.isArray(pair), true, `${label} must be a coordinate pair`);
  assert.equal(pair.length, 2, `${label} must include x/y coordinates`);
  for (const value of pair) {
    assert.equal(Number.isFinite(value), true, `${label} coordinate must be finite`);
    assert.ok(value >= min && value <= max, `${label} coordinate ${value} must be between ${min} and ${max}`);
  }
}

assert.ok(STAGES.length > 0, "campaign must include at least one stage");
assert.equal(STAGE_RULES.length, STAGES.length, "each stage must have a matching rule entry");
assert.ok(Object.keys(DIFFICULTY_DEFS).length > 0, "difficulty data must include at least one difficulty");
assert.ok(towerTypes.size > 0, "tower data must include at least one tower");

STAGES.forEach((stage, index) => {
  assert.equal(typeof stage.name, "string", `stage ${index + 1} must have a name`);
  assert.ok(stage.core > 0, `${stage.name} must have positive core health`);
  assert.ok(stage.alloy > 0, `${stage.name} must have positive starting alloy`);
  assert.ok(stage.waves > 0, `${stage.name} must have a positive wave count`);
  assert.ok(stage.path.length >= 2, `${stage.name} must have at least two path points`);
  assert.ok(stage.slots.length >= 8, `${stage.name} must have enough tower slots`);

  stage.path.forEach((point, pointIndex) => {
    assertCoordinatePair(point, `${stage.name} path ${pointIndex + 1}`, -0.1, 1.1);
  });
  stage.slots.forEach((slot, slotIndex) => {
    assertCoordinatePair(slot, `${stage.name} slot ${slotIndex + 1}`, 0, 1);
  });
});

STAGE_RULES.forEach((rule, index) => {
  const label = `${STAGES[index].name} rule`;
  assert.equal(typeof rule.summary, "string", `${label} must include a summary`);
  assert.equal(typeof rule.rule, "string", `${label} must include a rule label`);

  for (const type of Object.keys(rule.group || {})) {
    assert.ok(enemyTypes.has(type), `${label} group references unknown enemy type: ${type}`);
    assert.ok(rule.group[type] > 0, `${label} group multiplier for ${type} must be positive`);
  }
  for (const type of Object.keys(rule.hp || {})) {
    assert.ok(enemyTypes.has(type), `${label} hp references unknown enemy type: ${type}`);
    assert.ok(rule.hp[type] > 0, `${label} hp multiplier for ${type} must be positive`);
  }
  for (const extra of rule.extraGroups || []) {
    assert.ok(enemyTypes.has(extra.type), `${label} extra group references unknown enemy type: ${extra.type}`);
    assert.ok(extra.wave >= 1 && extra.wave <= STAGES[index].waves, `${label} extra group wave must be in stage range`);
    assert.ok(extra.count > 0, `${label} extra group count must be positive`);
    assert.ok(extra.gap > 0, `${label} extra group gap must be positive`);
  }
  if (rule.bossCooldown !== undefined) {
    assert.ok(rule.bossCooldown > 0 && rule.bossCooldown <= 1, `${label} boss cooldown scale must be 0 < value <= 1`);
  }
});

for (const [type, tower] of Object.entries(TOWER_DEFS)) {
  assert.equal(typeof tower.name, "string", `${type} tower must have a display name`);
  assert.ok(tower.cost > 0, `${tower.name} must have a positive cost`);
  assert.ok(tower.range > 0, `${tower.name} must have a positive range`);
  assert.ok(tower.upgrade > 0, `${tower.name} must have a positive upgrade cost`);
  assert.ok(Array.isArray(BRANCH_DEFS[type]), `${tower.name} must have branch definitions`);
  assert.equal(BRANCH_DEFS[type].length, 2, `${tower.name} must have two final branch choices`);
}

for (const enemy of Object.values(ENEMY_DEFS)) {
  assert.equal(typeof enemy.name, "string", "enemy must have a display name");
  assert.ok(enemy.hp > 0, `${enemy.name} must have positive hp`);
  assert.ok(enemy.speed >= 0, `${enemy.name} must have non-negative speed`);
  assert.ok(enemy.reward >= 0, `${enemy.name} must have non-negative reward`);
}

for (const def of RESEARCH_DEFS) {
  assert.ok(RESEARCH_LAYOUT[def.id], `${def.name} must have a research map position`);
  for (const parent of def.requires?.parents || []) {
    assert.ok(researchIds.has(parent.id), `${def.name} requires unknown research id: ${parent.id}`);
    assert.ok(parent.level > 0, `${def.name} requires a positive parent level`);
  }
  if (towerTypes.has(def.id)) continue;
  assert.ok(def.max > 0, `${def.name} must have a positive max level`);
}

assert.ok(slotKinds.has("standard"), "slot kinds must include the standard slot");

console.log("gameData validation: all checks passed");

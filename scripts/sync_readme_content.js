"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadGameData, rootDir } = require("./loadGameData.js");

const readmePath = path.join(rootDir, "README.md");
const startMarker = "<!-- orbit-content:start -->";
const endMarker = "<!-- orbit-content:end -->";

function names(items) {
  return items.map((item) => item.name || item.label).join(", ");
}

function buildContentBlock() {
  const {
    DIFFICULTY_DEFS,
    ENEMY_DEFS,
    STAGES,
    STAGE_RULES,
    TOWER_DEFS,
  } = loadGameData();

  const towers = Object.values(TOWER_DEFS);
  const enemies = Object.values(ENEMY_DEFS).filter((enemy) => !enemy.boss);
  const bosses = Object.values(ENEMY_DEFS).filter((enemy) => enemy.boss);
  const difficulties = Object.values(DIFFICULTY_DEFS);
  const stageRuleCount = STAGE_RULES.filter((rule) => rule.rule && rule.rule !== "기본 규칙").length;

  return [
    startMarker,
    "- 모바일 세로형 레이아웃",
    "- Canvas 2D 절차적 전장 렌더링",
    "- WebGL 스캔라인 및 경고 펄스 오버레이",
    "- 반고정 타워 배치 슬롯",
    `- 타워 ${towers.length}종: ${names(towers)}`,
    `- 일반/특수 적 ${enemies.length}종: ${names(enemies)}`,
    `- 보스 ${bosses.length}종: ${names(bosses)}`,
    "- 웨이브 스폰, 타워 조준, 투사체, 범위 피해, 감속 효과",
    "- 강화 및 판매 조작",
    "- 스테이지 진행 데이터와 localStorage 해금/연구 보상",
    "- 기지 작전실 스테이지 선택 화면",
    "- 전술 연구소와 영구 성장 효과",
    "- 승리/패배 결과 화면",
    `- 스테이지 ${STAGES.length}종과 특수 규칙 ${stageRuleCount}종`,
    `- 난이도 ${difficulties.length}종: ${names(difficulties)}`,
    endMarker,
  ].join("\n");
}

function replaceGeneratedBlock(readme, block) {
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md must include ${startMarker} and ${endMarker} around the generated content list`);
  }
  return `${readme.slice(0, start)}${block}${readme.slice(end + endMarker.length)}`;
}

function main() {
  const current = fs.readFileSync(readmePath, "utf8");
  const next = replaceGeneratedBlock(current, buildContentBlock());
  const checkOnly = process.argv.includes("--check");

  if (current === next) {
    console.log("README content summary is in sync");
    return;
  }

  if (checkOnly) {
    console.error("README content summary is out of sync. Run `node scripts/sync_readme_content.js`.");
    process.exit(1);
  }

  fs.writeFileSync(readmePath, next);
  console.log("README content summary updated");
}

main();

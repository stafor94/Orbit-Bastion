(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const canvas = $("gameCanvas");
  const fxCanvas = $("fxCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    core: $("coreValue"),
    coreShield: $("coreShieldValue"),
    difficulty: $("difficultyValue"),
    alloy: $("alloyValue"),
    wave: $("waveValue"),
    stage: $("stageName"),
    stageInfo: $("stageInfoButton"),
    banner: $("banner"),
    towerBar: $("towerBar"),
    selectedCard: $("selectedCard"),
    selectedLabel: $("selectedLabel"),
    selectedName: $("selectedName"),
    selectedStats: $("selectedStats"),
    selectedDetails: $("selectedDetails"),
    upgrade: $("upgradeButton"),
    sell: $("sellButton"),
    start: $("startWaveButton"),
    speed: $("speedButton"),
    autoWave: $("autoWaveButton"),
    waveSummary: $("waveSummary"),
    waveGroups: $("waveGroups"),
    threatSummary: $("threatSummary"),
    threatTags: $("threatTags"),
    sound: $("soundButton"),
    base: $("baseButton"),
    reset: $("resetButton"),
    floatLayer: $("floatingTextLayer"),
    overlay: $("screenOverlay"),
    bossHud: $("bossHud"),
    bossName: $("bossName"),
    bossPhase: $("bossPhase"),
    bossBarFill: $("bossBarFill"),
    bossTelemetry: $("bossTelemetry"),
    bossWarning: $("bossWarning"),
    bossWarningTitle: $("bossWarningTitle"),
    bossWarningDetail: $("bossWarningDetail"),
    a11yStatus: $("a11yStatus"),
  };

  const {
    TOWER_DEFS,
    ENEMY_DEFS,
    STAGES,
    STAGE_RULES,
    RESEARCH_DEFS,
    DEFAULT_RESEARCH,
    RESEARCH_LAYOUT,
    RESEARCH_LINKS,
    DIFFICULTY_DEFS,
    BRANCH_DEFS,
    SLOT_KINDS,
  } = window.OrbitGameData;
  const towerMetrics = window.OrbitTowerMetrics;
  const researchPresentation = window.OrbitResearchPresentation || { categories: [{ id: "all", name: "전체" }], defs: {} };
  const RESEARCH_CATEGORIES = researchPresentation.categories || [{ id: "all", name: "전체" }];

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    stageIndex: 0,
    core: 20,
    maxCore: 20,
    coreShield: 0,
    coreShieldMax: 0,
    coreShieldTimer: 0,
    alloy: 0,
    waveIndex: 0,
    waveActive: false,
    autoWave: localStorage.getItem("orbit.autoWave") === "1",
    autoWaveDueAt: 0,
    waveQueue: [],
    waves: [],
    spawnTimer: 0,
    currentGroup: null,
    selectedTowerType: null,
    selectedSlot: -1,
    speed: 1,
    path: [],
    pathLength: 1,
    slotKinds: [],
    slots: [],
    towers: [],
    enemies: [],
    enemyProgressOrder: [],
    enemyRenderOrder: [],
    currentBoss: null,
    projectiles: [],
    particles: [],
    acidPools: [],
    beams: [],
    railAfterimages: [],
    shock: 0,
    gameOver: false,
    victory: false,
    screen: "base",
    runKills: 0,
    runEarned: 0,
    runResearchReward: 0,
    muted: localStorage.getItem("orbit.muted") === "1",
    difficulty: localStorage.getItem("orbit.difficulty") || "easy",
    difficultyLocked: false,
    selectedResearch: null,
    selectedResearchFilter: "all",
    researchFocusTarget: "node",
    lastResearchPurchased: null,
    lastResearchPulseUntil: 0,
    researchLevels: null,
    audio: null,
    soundCooldowns: {},
    towerBarUnlockAt: 0,
    lastTappedSlot: -1,
    lastTapAt: 0,
    selectedTowerInfoVisible: false,
    lastA11yMessage: "",
  };

  const researchLogic = window.OrbitResearchLogic.create({
    state,
    STAGES,
    DIFFICULTY_DEFS,
    RESEARCH_DEFS,
    RESEARCH_CATEGORIES,
    TOWER_DEFS,
    ENEMY_DEFS,
    researchPresentation,
    getResearchLevels,
    researchPoints,
    towerStats,
    towerBuildCost,
  });
  const {
    formatPreviewNumber,
    isResearchUnlocked,
    recommendedResearch,
    researchAppliesToText,
    researchCategoryName,
    researchCost,
    researchDef,
    researchEffectText,
    researchLockReason,
    researchMeta,
    researchResetSummary,
    researchResetTargets,
    researchSpentForLevel,
    researchVisibleDefs,
  } = researchLogic;
  const waveLogic = window.OrbitWaveLogic.create({
    state,
    STAGES,
    STAGE_RULES,
    ENEMY_DEFS,
    DIFFICULTY_DEFS,
    formatPreviewNumber,
    enemyArmorValue,
  });
  const targeting = window.OrbitTargeting.create({
    state,
    dist,
    dist2,
    lerp,
  });
  const enemyRenderer = window.OrbitEnemyRenderer.create({
    ctx,
    state,
    ENEMY_DEFS,
    enemyArmorValue,
  });
  const battleEffectsRenderer = window.OrbitBattleEffectsRenderer.create({
    ctx,
    state,
  });
  const {
    applyStageRulesToWaves,
    buildFallbackWaves,
    currentWaveEnemyRoster,
    liveThreatOverview,
    stageEnemySummary,
    stageEnemyHpScale,
    stageRule,
    waveOverview,
  } = waveLogic;
  const {
    chainTargets,
    enemiesAlongBeam,
    findNearestTarget,
    findTarget,
    nearbyEnemies,
    placeOnPath,
  } = targeting;
  const { drawEnemies, renderEnemyThumbnail } = enemyRenderer;
  const {
    drawAcidPools,
    drawBeams,
    drawParticles,
    drawProjectiles,
    drawRailAfterimages,
  } = battleEffectsRenderer;

  Object.assign(DIFFICULTY_DEFS, window.OrbitDifficulties?.defs || {});
  const difficultyOrder = window.OrbitDifficulties?.order || Object.keys(DIFFICULTY_DEFS);
  const DEFAULT_UNLOCKED_DIFFICULTY_INDEX = Math.min(difficultyOrder.length - 1, 2);
  const BOSS_MINION_BASE_COOLDOWN = 15;
  const DIFFICULTY_RESEARCH_REWARD = {
    easy: 1,
    normal: 2,
    hard: 3,
    hell: 4,
    nightmare: 5,
  };

  function difficultyProgressKey(kind, difficulty = state.difficulty) {
    return `orbit.${kind}.${difficulty}`;
  }

  function stageResearchRewardForDifficulty(difficulty = state.difficulty) {
    return DIFFICULTY_RESEARCH_REWARD[difficulty] || 0;
  }

  const battleOverlays = window.OrbitBattleOverlays.create({
    state,
    ui,
    STAGES,
    TOWER_DEFS,
    BRANCH_DEFS,
    RESEARCH_DEFS,
    RESEARCH_LAYOUT,
    RESEARCH_LINKS,
    difficultyOrder,
    waveOverview,
    currentWaveEnemyRoster,
    stageEnemySummary,
    getResearchLevels,
    researchPoints,
    setResearchPoints,
    saveResearchLevels,
    researchVisibleDefs,
    researchResetSummary,
    researchResetTargets,
    researchCategoryName,
    isResearchUnlocked,
    researchCost,
    researchLockReason,
    researchMeta,
    researchEffectText,
    researchAppliesToText,
    researchIconSvg,
    getOpenBaseScreen: () => openBaseScreen,
    resetStage,
    playSound,
    difficultyProgressKey,
    applyTowerUpgrade,
    branchDetailText,
    consumePendingDifficultyUnlock,
  });
  const {
    closeOverlay,
    closeStageInfoModal: legacyCloseStageInfoModal,
    confirmProgressReset,
    openBranchScreen,
    openResearchScreen,
    openResultScreen,
  } = battleOverlays;

  function clampDifficultyStageIndex(value) {
    return Math.max(0, Math.min(STAGES.length - 1, Number(value) || 0));
  }

  function getClearedStages(difficulty = state.difficulty) {
    return Math.max(0, Math.min(STAGES.length, Number(localStorage.getItem(difficultyProgressKey("cleared", difficulty)) || 0)));
  }

  function setClearedStages(value, difficulty = state.difficulty) {
    localStorage.setItem(difficultyProgressKey("cleared", difficulty), String(Math.max(0, Math.min(STAGES.length, Math.floor(value)))));
  }

  function getSavedStageIndex(difficulty = state.difficulty) {
    return clampDifficultyStageIndex(localStorage.getItem(difficultyProgressKey("stage", difficulty)) || 0);
  }

  function setSavedStageIndex(value, difficulty = state.difficulty) {
    localStorage.setItem(difficultyProgressKey("stage", difficulty), String(clampDifficultyStageIndex(value)));
  }

  function getHighestUnlockedDifficultyIndex() {
    return Math.max(
      DEFAULT_UNLOCKED_DIFFICULTY_INDEX,
      Math.min(difficultyOrder.length - 1, Number(localStorage.getItem("orbit.unlockedDifficultyIndex") || DEFAULT_UNLOCKED_DIFFICULTY_INDEX)),
    );
  }

  function setHighestUnlockedDifficultyIndex(value) {
    localStorage.setItem("orbit.unlockedDifficultyIndex", String(Math.max(0, Math.min(difficultyOrder.length - 1, Math.floor(value)))));
  }

  function isDifficultyUnlocked(difficultyId) {
    const difficultyIndex = difficultyOrder.indexOf(difficultyId);
    return difficultyIndex >= 0 && difficultyIndex <= getHighestUnlockedDifficultyIndex();
  }

  function nextDifficultyId(difficultyId = state.difficulty) {
    const difficultyIndex = difficultyOrder.indexOf(difficultyId);
    if (difficultyIndex < 0 || difficultyIndex >= difficultyOrder.length - 1) return null;
    return difficultyOrder[difficultyIndex + 1];
  }

  function migrateLegacyProgress() {
    if (localStorage.getItem("orbit.progressMigrated") === "1") return;
    const currentDifficulty = localStorage.getItem("orbit.difficulty") || "easy";
    const legacyCleared = localStorage.getItem("orbit.cleared");
    const legacyStage = localStorage.getItem("orbit.stage");
    if (legacyCleared !== null && localStorage.getItem(difficultyProgressKey("cleared", currentDifficulty)) === null) {
      localStorage.setItem(difficultyProgressKey("cleared", currentDifficulty), legacyCleared);
    }
    if (legacyStage !== null && localStorage.getItem(difficultyProgressKey("stage", currentDifficulty)) === null) {
      localStorage.setItem(difficultyProgressKey("stage", currentDifficulty), legacyStage);
    }
    const currentDifficultyIndex = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
    if (localStorage.getItem("orbit.unlockedDifficultyIndex") === null) {
      setHighestUnlockedDifficultyIndex(Math.max(DEFAULT_UNLOCKED_DIFFICULTY_INDEX, currentDifficultyIndex));
    } else if (getHighestUnlockedDifficultyIndex() < DEFAULT_UNLOCKED_DIFFICULTY_INDEX) {
      setHighestUnlockedDifficultyIndex(DEFAULT_UNLOCKED_DIFFICULTY_INDEX);
    }
    localStorage.setItem("orbit.progressMigrated", "1");
  }

  function loadDifficultyProgress(difficulty = state.difficulty) {
    state.stageIndex = getSavedStageIndex(difficulty);
  }

  function buildSaveBackupPayload() {
    return {
      version: SAVE_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data: {
        difficulty: state.difficulty,
        unlockedDifficultyIndex: getHighestUnlockedDifficultyIndex(),
        pendingDifficultyUnlock: localStorage.getItem("orbit.pendingDifficultyUnlock") || "",
        research: researchPoints(),
        researchLevels: getResearchLevels(),
        autoWave: localStorage.getItem("orbit.autoWave") === "1",
        muted: localStorage.getItem("orbit.muted") === "1",
        progress: Object.fromEntries(
          difficultyOrder.map((difficultyId) => [
            difficultyId,
            {
              cleared: getClearedStages(difficultyId),
              stage: getSavedStageIndex(difficultyId),
            },
          ]),
        ),
      },
    };
  }

  async function exportSaveBackup() {
    const payload = buildSaveBackupPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const stamp = payload.createdAt.replace(/[:.]/g, "-");
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `orbit-bastion-save-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    window.alert("백업 파일을 다운로드했습니다.");
    return true;
  }

  function applySaveBackup(payload) {
    const data = payload?.data;
    if (!data || typeof data !== "object") throw new Error("invalid backup");
    if (!data.progress || typeof data.progress !== "object") throw new Error("missing progress");

    difficultyOrder.forEach((difficultyId) => {
      const progress = data.progress[difficultyId] || {};
      setClearedStages(progress.cleared || 0, difficultyId);
      setSavedStageIndex(progress.stage || 0, difficultyId);
    });

    setResearchPoints(data.research || 0);
    saveResearchLevels({ ...DEFAULT_RESEARCH, ...(data.researchLevels || {}) });
    setHighestUnlockedDifficultyIndex(
      Math.max(
        DEFAULT_UNLOCKED_DIFFICULTY_INDEX,
        Math.min(difficultyOrder.length - 1, Number(data.unlockedDifficultyIndex) || DEFAULT_UNLOCKED_DIFFICULTY_INDEX),
      ),
    );
    localStorage.setItem("orbit.progressMigrated", "1");
    localStorage.setItem("orbit.autoWave", data.autoWave ? "1" : "0");
    localStorage.setItem("orbit.muted", data.muted ? "1" : "0");
    if (data.pendingDifficultyUnlock) localStorage.setItem("orbit.pendingDifficultyUnlock", String(data.pendingDifficultyUnlock));
    else localStorage.removeItem("orbit.pendingDifficultyUnlock");

    const importedDifficulty = difficultyOrder.includes(data.difficulty) ? data.difficulty : state.difficulty;
    state.difficulty = isDifficultyUnlocked(importedDifficulty)
      ? importedDifficulty
      : (difficultyOrder[getHighestUnlockedDifficultyIndex()] || "easy");
    localStorage.setItem("orbit.difficulty", state.difficulty);
    state.researchLevels = null;
    state.autoWave = localStorage.getItem("orbit.autoWave") === "1";
    state.muted = localStorage.getItem("orbit.muted") === "1";
    loadDifficultyProgress(state.difficulty);
  }

  async function importSaveBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    const file = await new Promise((resolve) => {
      input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
      input.click();
    });
    if (!file) return false;
    try {
      const payload = JSON.parse(await file.text());
      applySaveBackup(payload);
      resetStage(state.stageIndex);
      window.alert("백업 파일을 불러왔습니다.");
      return true;
    } catch (error) {
      window.alert("백업 파일을 읽지 못했습니다. JSON 파일이 맞는지 확인하세요.");
      return false;
    }
  }

  function applyDifficultyChoice(difficultyId) {
    if (!isDifficultyUnlocked(difficultyId)) return;
    state.difficulty = difficultyId;
    localStorage.setItem("orbit.difficulty", state.difficulty);
    loadDifficultyProgress(difficultyId);
    resetStage(state.stageIndex);
    openBaseScreen();
  }

  function consumePendingDifficultyUnlock() {
    const unlockedId = localStorage.getItem("orbit.pendingDifficultyUnlock");
    if (!unlockedId || !window.OrbitDialogs?.showDifficultyUnlock) return;
    localStorage.removeItem("orbit.pendingDifficultyUnlock");
    window.OrbitDialogs.showDifficultyUnlock({
      root: ui.overlay,
      label: DIFFICULTY_DEFS[unlockedId]?.label || unlockedId,
    });
  }

  function stageIntelWaveText(enemy) {
    return enemy.firstWave === enemy.lastWave
      ? `${enemy.firstWave}웨이브 등장`
      : `${enemy.firstWave}-${enemy.lastWave}웨이브 등장`;
  }

  function closeStageInfoModal() {
    legacyCloseStageInfoModal();
    if (state.screen === "stage-info") state.screen = "battle";
  }

  function openStageInfoModal() {
    if (state.screen !== "battle") return;
    closeStageInfoModal();
    state.screen = "stage-info";
    const stage = STAGES[state.stageIndex];
    const roster = currentWaveEnemyRoster();
    const summary = stageEnemySummary();
    const difficulty = DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy;
    const modal = document.createElement("div");
    modal.className = "modal-backdrop stage-intel-backdrop";
    modal.innerHTML = `
      <div class="modal-panel stage-intel-panel" role="dialog" aria-modal="true" aria-label="스테이지 적 정보">
        <div class="screen-header">
          <div class="screen-title">
            <span>${state.stageIndex + 1}. ${stage.name}</span>
            <h2>스테이지 적 정보</h2>
          </div>
          <button id="closeStageIntelButton" class="screen-close" type="button">닫기</button>
        </div>
        <div class="stage-intel-summary">
          <p>${summary.summary}</p>
          <p>현재 난이도 ${difficulty.label}: HP와 장갑은 난이도 보정 적용 최종값입니다.</p>
          <div class="stage-intel-tags">
            ${summary.tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("")}
          </div>
        </div>
        <div class="stage-enemy-list">
          ${roster.map((enemy) => `
            <div class="stage-enemy-card">
              <div class="stage-enemy-head">
                <div class="stage-enemy-identity">
                  <div class="stage-enemy-avatar">
                    <canvas class="stage-enemy-avatar-canvas" width="48" height="48" data-enemy-avatar="${enemy.type}"></canvas>
                  </div>
                  <div>
                    <strong>${enemy.name}</strong>
                    <span>${stageIntelWaveText(enemy)}</span>
                  </div>
                </div>
                <span>총 ${enemy.count}기</span>
              </div>
              <div class="stage-enemy-badges">
                ${enemy.tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("")}
              </div>
              <div class="stage-enemy-grid">
                <span>최종 HP ${enemy.hp}</span>
                <span>속도 ${enemy.speed}</span>
                <span>최종 장갑 ${enemy.armor}</span>
                <span>처치 보상 ${enemy.reward}</span>
                ${enemy.special ? `<span>${enemy.special}</span>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeStageInfoModal();
    });
    modal.querySelector("#closeStageIntelButton")?.addEventListener("click", closeStageInfoModal);
    document.body.appendChild(modal);
    modal.querySelectorAll(".stage-enemy-avatar-canvas").forEach((canvas) => {
      renderEnemyThumbnail(canvas, canvas.dataset.enemyAvatar);
    });
  }

  migrateLegacyProgress();
  if (!isDifficultyUnlocked(state.difficulty)) {
    state.difficulty = difficultyOrder[getHighestUnlockedDifficultyIndex()] || "easy";
    localStorage.setItem("orbit.difficulty", state.difficulty);
  }
  loadDifficultyProgress(state.difficulty);

  const fx = new WebGLEffectsLayer(fxCanvas);
  const MAP_TOP_PADDING = 44;
  const PATH_SAFE_MARGIN_X = 28;
  const PATH_SAFE_MARGIN_TOP = 28;
  const PATH_SAFE_MARGIN_BOTTOM = 44;
  const SLOT_SAFE_MARGIN = 30;
  const PATH_ENTRY_EXTENSION = 36;
  const SIMULATION_STEP = 1 / 120;
  const LASER_FOCUS_PER_HIT = 0.1;
  const LASER_BASE_MAX_DAMAGE_MULTIPLIER = 2;
  const SAVE_BACKUP_VERSION = 1;
  let layoutResizeObserver = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.width = rect.width;
    state.height = rect.height;
    for (const c of [canvas, fxCanvas]) {
      c.width = Math.floor(rect.width * state.dpr);
      c.height = Math.floor(rect.height * state.dpr);
      c.style.width = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
    }
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    fx.resize();
    buildStageGeometry();
  }

  function buildStageGeometry() {
    const stage = STAGES[state.stageIndex];
    const mapLeft = PATH_SAFE_MARGIN_X;
    const mapRight = Math.max(mapLeft + 1, state.width - PATH_SAFE_MARGIN_X);
    const mapTop = MAP_TOP_PADDING + PATH_SAFE_MARGIN_TOP;
    const mapBottom = Math.max(mapTop + 1, state.height - PATH_SAFE_MARGIN_BOTTOM);
    let fitPathX;
    let fitPathY;

    if (stage.grid?.cols && stage.grid?.rows) {
      const spanX = Math.max(1, stage.grid.cols - 1);
      const spanY = Math.max(1, stage.grid.rows - 1);
      const availableWidth = mapRight - mapLeft;
      const availableHeight = mapBottom - mapTop;
      const scale = Math.min(availableWidth / spanX, availableHeight / spanY);
      const gridWidth = spanX * scale;
      const gridHeight = spanY * scale;
      const offsetX = mapLeft + (availableWidth - gridWidth) * 0.5;
      const offsetY = mapTop + (availableHeight - gridHeight) * 0.5;
      fitPathX = (x) => offsetX + x * scale;
      fitPathY = (y) => offsetY + y * scale;
    } else {
      const pathXs = stage.path.map(([x]) => x);
      const pathYs = stage.path.map(([, y]) => y);
      const minPathX = Math.min(...pathXs);
      const maxPathX = Math.max(...pathXs);
      const minPathY = Math.min(...pathYs);
      const maxPathY = Math.max(...pathYs);
      const pathSpanX = Math.max(0.001, maxPathX - minPathX);
      const pathSpanY = Math.max(0.001, maxPathY - minPathY);
      fitPathX = (x) => mapLeft + ((x - minPathX) / pathSpanX) * (mapRight - mapLeft);
      fitPathY = (y) => mapTop + ((y - minPathY) / pathSpanY) * (mapBottom - mapTop);
    }
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    state.path = stage.path.map(([x, y]) => ({ x: fitPathX(x), y: fitPathY(y) }));
    if (state.path.length >= 2) {
      const start = state.path[0];
      const next = state.path[1];
      const dx = next.x - start.x;
      const dy = next.y - start.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        start.x = dx >= 0 ? -PATH_ENTRY_EXTENSION : state.width + PATH_ENTRY_EXTENSION;
      } else {
        start.y = dy >= 0 ? mapTop - PATH_ENTRY_EXTENSION : state.height + PATH_ENTRY_EXTENSION;
      }
    }
    state.slots = stage.slots.map(([x, y], i) => {
      const existing = state.slots[i] || {};
      return {
        x: clamp(fitPathX(x), SLOT_SAFE_MARGIN, state.width - SLOT_SAFE_MARGIN),
        y: clamp(fitPathY(y), MAP_TOP_PADDING + SLOT_SAFE_MARGIN, state.height - SLOT_SAFE_MARGIN),
        kind: state.slotKinds[i] || slotKindFor(state.stageIndex, i),
        tower: existing.tower || null,
        pulse: 0,
      };
    });
    state.pathLength = 0;
    for (let i = 0; i < state.path.length - 1; i++) {
      state.pathLength += dist(state.path[i], state.path[i + 1]);
    }
    for (const enemy of state.enemies) placeOnPath(enemy);
  }

  function slotKindFor(stageIndex, slotIndex) {
    const pattern = ["standard", "high", "standard", "coolant", "reactor", "standard", "mineral", "standard", "high", "coolant", "reactor", "mineral"];
    return pattern[(slotIndex + stageIndex * 2) % pattern.length];
  }

  function randomizeSlotKinds(slotCount) {
    const specialKinds = SLOT_KINDS.filter((item) => item.id !== "standard").map((item) => item.id);
    return Array.from({ length: slotCount }, () => {
      if (!specialKinds.length || Math.random() >= 0.5) return "standard";
      return specialKinds[Math.floor(Math.random() * specialKinds.length)];
    });
  }

  function slotKindDef(kind) {
    return SLOT_KINDS.find((item) => item.id === kind) || SLOT_KINDS[0];
  }

  function slotBonuses(slot) {
    const kind = slot?.kind || "standard";
    return {
      range: kind === "high" ? 1.12 : 1,
      cooldown: kind === "coolant" ? 0.9 : 1,
      damage: kind === "reactor" ? 1.1 : 1,
      reward: kind === "mineral" ? 1.25 : 1,
    };
  }

  function towerBaseRange(type, def, level, branch) {
    const baseRange = towerMetrics.towerBaseRange(type, def.range, level, branch);
    if (type === "cryo" && branch === "fracture") return Math.round(baseRange * 1.3);
    return baseRange;
  }

  function towerSupportBonuses(tower, towerSlot, research) {
    let damage = 1;
    let cooldown = 1;
    for (const support of state.towers) {
      if (support === tower || support.type !== "beacon") continue;
      const supportSlot = state.slots[support.slotIndex];
      const supportDef = TOWER_DEFS[support.type];
      if (!supportSlot || !supportDef) continue;
      const supportRange = towerBaseRange(support.type, supportDef, support.level, support.branch)
        * slotBonuses(supportSlot).range
        * (1 + (research.ballistics || 0) * 0.02 + (research.range || 0) * 0.04);
      if (dist(towerSlot, supportSlot) > supportRange) continue;
      damage += auraDamageBoost(supportDef, support.level, support.branch);
      cooldown -= auraCooldownBoost(supportDef, support.level, support.branch);
    }
    return {
      damage: Math.min(1.4, damage),
      cooldown: Math.max(0.7, cooldown),
    };
  }

  function getResearchLevels() {
    try {
      return { ...DEFAULT_RESEARCH, ...JSON.parse(localStorage.getItem("orbit.researchLevels") || "{}") };
    } catch (error) {
      return { ...DEFAULT_RESEARCH };
    }
  }

  function saveResearchLevels(levels) {
    localStorage.setItem("orbit.researchLevels", JSON.stringify(levels));
  }

  function currentResearchLevels() {
    return state.researchLevels || (state.researchLevels = getResearchLevels());
  }

  function researchPoints() {
    return Number(localStorage.getItem("orbit.research") || 0);
  }

  function setResearchPoints(value) {
    localStorage.setItem("orbit.research", String(Math.max(0, Math.floor(value))));
  }

  function researchIconSvg(id) {
    const icons = {
      core: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 25 8v7c0 6-4 10-9 13-5-3-9-7-9-13V8l9-4Z"/><path d="M16 9v13M11 14h10"/></svg>',
      alloy: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 20h16l3 6H5l3-6Z"/><path d="M12 10h8l3 10H9l3-10Z"/><path d="M14 5h4l2 5h-8l2-5Z"/></svg>',
      pulse: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M24.5 7.5 21 11M11 21l-3.5 3.5"/></svg>',
      laser: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 18 20 5l-4 10h11L12 28l4-10H5Z"/></svg>',
      targeting: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="3"/><path d="M16 3v6M16 23v6M3 16h6M23 16h6"/></svg>',
      capacitors: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 6v20M22 6v20M6 12h6M20 12h6M6 20h6M20 20h6"/><path d="M13 16h6"/></svg>',
      plasma: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="5"/><path d="M16 3c4 5 4 9 0 13M16 29c-4-5-4-9 0-13M3 16c5-4 9-4 13 0M29 16c-5 4-9 4-13 0"/></svg>',
      cryo: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v24M6 10l20 12M26 10 6 22"/><path d="m16 4-3 4h6l-3-4ZM16 28l3-4h-6l3 4ZM6 10l5 1-3 5-2-6ZM26 22l-5-1 3-5 2 6ZM26 10l-2 6-3-5 5-1ZM6 22l2-6 3 5-5 1Z"/></svg>',
      ballistics: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23c7-10 14-14 22-15"/><path d="m22 5 5 3-4 5"/><circle cx="10" cy="22" r="2"/><circle cx="16" cy="16" r="1.5"/></svg>',
      allDamage: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 14l-5 1 3 10-9-5-9 5 3-10-5-1L16 3Z"/><path d="M16 8v9"/></svg>',
      arc: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 7h14v6H9z"/><path d="M12 13 8 21h6l-2 8 8-11h-6l2-5"/></svg>',
      rail: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 16h17"/><path d="m19 9 7 7-7 7"/><path d="M9 8v16M14 8v16"/></svg>',
      gravity: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="3"/><path d="M16 4c-5 0-9 5-9 12M16 28c5 0 9-5 9-12M7 16c0 5 4 9 9 9M25 16c0-5-4-9-9-9"/></svg>',
      beacon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v17"/><path d="M10 10h12"/><path d="m12 21 4-4 4 4"/><path d="M9 27h14"/></svg>',
      range: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6"/></svg>',
      cooldown: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M24 10a10 10 0 1 0 1 11"/><path d="M24 4v6h-6"/><path d="M16 9v8l5 3"/></svg>',
      armorPierce: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 16h17"/><path d="m19 9 7 7-7 7"/><path d="M10 7 7 16l3 9M15 7l-3 9 3 9"/></svg>',
      salvage: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 9a9 9 0 0 1 14 3l3-1-4 8-5-7 3-1a6 6 0 0 0-10 0"/><path d="M22 23a9 9 0 0 1-14-3l-3 1 4-8 5 7-3 1a6 6 0 0 0 10 0"/></svg>',
      recycle: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 10h15l-2 16H10L8 10Z"/><path d="M12 10V7h8v3M13 15v7M19 15v7"/><path d="M6 10h20"/></svg>',
      repair: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M14 5h4v9h9v4h-9v9h-4v-9H5v-4h9V5Z"/><path d="M8 8 5 5M24 8l3-3M8 24l-3 3M24 24l3 3"/></svg>',
      overdrive: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v7M16 21v7M7 16h7M18 16h7"/><path d="M11 11 7 7M21 11l4-4M11 21l-4 4M21 21l4 4"/><circle cx="16" cy="16" r="4"/></svg>',
      bossBreaker: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5 26 11v10l-10 6-10-6V11l10-6Z"/><path d="M10 10 22 22M22 10 10 22"/></svg>',
      waveBonus: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 21c4-5 7-5 11 0s7 5 11 0"/><path d="M5 13c4-5 7-5 11 0s7 5 11 0"/><path d="M16 6v20"/></svg>',
      fortress: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 27V10l4-3 5 3 5-3 4 3v17"/><path d="M5 27h22M12 27v-8h8v8M10 14h3M19 14h3"/></svg>',
    };
    return icons[id] || icons.core;
  }

  function ensureAudio() {
    if (state.muted) return null;
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      state.audio = new AudioContext();
      state.audioMaster = state.audio.createDynamicsCompressor();
      state.audioMaster.threshold.setValueAtTime(-18, state.audio.currentTime);
      state.audioMaster.knee.setValueAtTime(18, state.audio.currentTime);
      state.audioMaster.ratio.setValueAtTime(8, state.audio.currentTime);
      state.audioMaster.attack.setValueAtTime(0.004, state.audio.currentTime);
      state.audioMaster.release.setValueAtTime(0.18, state.audio.currentTime);
      state.audioMaster.connect(state.audio.destination);
    }
    if (state.audio.state === "suspended") state.audio.resume();
    return state.audio;
  }

  function playSound(name) {
    if (state.muted) return;
    const now = performance.now();
    const gate = {
      pulse: 55,
      laser: 80,
      plasma: 180,
      cryo: 520,
      arc: 220,
      rail: 520,
      gravity: 620,
      beacon: 620,
      shoot: 55,
      hit: 90,
      click: 45,
      deploy: 90,
      boom: 150,
      boss: 900,
      bossIntro: 2600,
      victory: 2600,
      defeat: 2600,
      upgrade: 140,
      error: 140,
    }[name] || 80;
    if ((state.soundCooldowns[name] || 0) > now) return;
    state.soundCooldowns[name] = now + gate;
    const audio = ensureAudio();
    if (!audio) return;
    const t = audio.currentTime;
    const presets = {
      click: { layers: [{ f: 880, to: 520, d: 0.045, v: 0.014, type: "triangle", filter: 3200 }] },
      deploy: {
        layers: [
          { f: 180, to: 280, d: 0.12, v: 0.03, type: "triangle", filter: 1600 },
          { f: 720, to: 1120, d: 0.08, v: 0.012, type: "sine", filter: 4200, delay: 0.035 },
        ],
        noise: 0.012,
      },
      shoot: {
        layers: [
          { f: 980, to: 520, d: 0.055, v: 0.016, type: "triangle", filter: 3000 },
          { f: 150, to: 90, d: 0.08, v: 0.012, type: "sine", filter: 900 },
        ],
      },
      pulse: {
        layers: [
          { f: 880, to: 430, d: 0.075, v: 0.018, type: "triangle", filter: 2800 },
          { f: 1320, to: 760, d: 0.045, v: 0.008, type: "sine", filter: 5200, delay: 0.018 },
        ],
      },
      laser: {
        layers: [
          { f: 1800, to: 1180, d: 0.08, v: 0.013, type: "sawtooth", filter: 5200, q: 8 },
          { f: 920, to: 860, d: 0.12, v: 0.008, type: "sine", filter: 3600, delay: 0.012 },
        ],
        noise: 0.006,
        noiseFilterType: "bandpass",
      },
      plasma: {
        layers: [
          { f: 110, to: 54, d: 0.32, v: 0.04, type: "sine", filter: 620 },
          { f: 260, to: 140, d: 0.22, v: 0.02, type: "sawtooth", filter: 920, delay: 0.025 },
        ],
        noise: 0.03,
      },
      cryo: {
        layers: [
          { f: 520, to: 860, d: 0.18, v: 0.016, type: "sine", filter: 3400 },
          { f: 1760, to: 2400, d: 0.11, v: 0.006, type: "triangle", filter: 6200, delay: 0.04 },
        ],
        noise: 0.01,
        noiseFilterType: "highpass",
      },
      arc: {
        layers: [
          { f: 1240, to: 280, d: 0.09, v: 0.018, type: "square", filter: 4600, q: 10 },
          { f: 1840, to: 520, d: 0.055, v: 0.012, type: "sawtooth", filter: 7000, delay: 0.025 },
        ],
        noise: 0.02,
        noiseFilterType: "bandpass",
      },
      rail: {
        layers: [
          { f: 90, to: 52, d: 0.18, v: 0.042, type: "sine", filter: 700 },
          { f: 2200, to: 340, d: 0.12, v: 0.02, type: "triangle", filter: 3400, delay: 0.018 },
        ],
        noise: 0.035,
      },
      gravity: {
        layers: [
          { f: 72, to: 36, d: 0.5, v: 0.04, type: "sine", filter: 440 },
          { f: 144, to: 72, d: 0.42, v: 0.018, type: "triangle", filter: 620, delay: 0.08 },
        ],
        noise: 0.012,
      },
      beacon: {
        sequence: [430, 645, 860],
        step: 0.07,
        d: 0.15,
        v: 0.018,
        type: "triangle",
        filter: 2600,
        harmony: 1.5,
      },
      boom: {
        layers: [
          { f: 118, to: 42, d: 0.3, v: 0.06, type: "sine", filter: 620 },
          { f: 64, to: 38, d: 0.44, v: 0.035, type: "triangle", filter: 360 },
        ],
        noise: 0.05,
      },
      boss: { f: 82, to: 36, d: 0.55, v: 0.1, type: "sine", filter: 520, noise: 0.055 },
      bossIntro: {
        sequence: [110, 82, 73, 55, 82, 55],
        step: 0.2,
        d: 0.28,
        v: 0.044,
        type: "sawtooth",
        filter: 820,
        harmony: 0.5,
        noise: 0.032,
      },
      victory: {
        sequence: [392, 523, 659, 784, 1047],
        step: 0.12,
        d: 0.28,
        v: 0.032,
        type: "triangle",
        filter: 3200,
        harmony: 1.25,
      },
      defeat: {
        sequence: [220, 185, 147, 110, 82],
        step: 0.18,
        d: 0.36,
        v: 0.044,
        type: "sine",
        filter: 900,
        harmony: 0.5,
        noise: 0.026,
      },
      upgrade: {
        sequence: [360, 540, 720],
        step: 0.075,
        d: 0.16,
        v: 0.027,
        type: "triangle",
        filter: 2800,
        harmony: 1.5,
      },
      error: {
        layers: [
          { f: 150, to: 95, d: 0.16, v: 0.028, type: "sawtooth", filter: 900 },
          { f: 75, to: 55, d: 0.18, v: 0.018, type: "sine", filter: 420, delay: 0.04 },
        ],
      },
    };
    const s = presets[name] || presets.click;
    if (s.sequence) playSequence(audio, t, s);
    else if (s.layers) playLayers(audio, t, s.layers);
    else playTone(audio, t, s);
    if (s.noise) playNoise(audio, t, (s.d || 0.18) * 0.8, s.noise, s.filter || 1800, s.noiseFilterType);
  }

  function playSequence(audio, startTime, s) {
    s.sequence.forEach((frequency, index) => {
      const t = startTime + index * s.step;
      playTone(audio, t, { ...s, f: frequency, to: frequency * 0.72 });
      if (s.harmony) playTone(audio, t + 0.012, { ...s, f: frequency * s.harmony, to: frequency * s.harmony * 0.72, v: s.v * 0.45 });
    });
  }

  function playLayers(audio, startTime, layers) {
    layers.forEach((layer) => playTone(audio, startTime + (layer.delay || 0), layer));
  }

  function playSequence(audio, startTime, s) {
    s.sequence.forEach((frequency, index) => {
      const t = startTime + index * s.step;
      playTone(audio, t, { ...s, f: frequency, to: frequency * 0.72 });
    });
  }

  function playSequence(audio, startTime, s) {
    s.sequence.forEach((frequency, index) => {
      const t = startTime + index * s.step;
      playTone(audio, t, { ...s, f: frequency, to: frequency * 0.72 });
    });
  }

  function playTone(audio, t, s) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.f, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, s.to), t + s.d);
    filter.type = s.filterType || "lowpass";
    filter.frequency.setValueAtTime(s.filter, t);
    filter.Q.setValueAtTime(s.q || 1, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(s.v, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + s.d);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioMaster || audio.destination);
    osc.start(t);
    osc.stop(t + s.d + 0.03);
  }

  function playNoise(audio, t, duration, volume, filterFreq, filterType = "lowpass") {
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioMaster || audio.destination);
    source.start(t);
    source.stop(t + duration);
  }

  function resetStage(nextStage) {
    if (typeof nextStage === "number") state.stageIndex = nextStage % STAGES.length;
    window.clearTimeout(scheduleAutoWave.timer);
    setSavedStageIndex(state.stageIndex);
    const stage = STAGES[state.stageIndex];
    const research = getResearchLevels();
    state.researchLevels = research;
    state.core = stage.core + research.core * 2;
    state.maxCore = state.core;
    state.coreShieldMax = research.fortress || 0;
    state.coreShield = state.coreShieldMax;
    state.coreShieldTimer = 0;
    state.alloy = stage.alloy + research.alloy * 25;
    state.waveIndex = 0;
    state.waveActive = false;
    state.autoWaveDueAt = 0;
    state.waveQueue = [];
    state.currentGroup = null;
    state.spawnTimer = 0;
    state.selectedTowerType = null;
    state.selectedSlot = -1;
    state.towers = [];
    state.enemies = [];
    state.enemyProgressOrder = [];
    state.enemyRenderOrder = [];
    state.currentBoss = null;
    state.projectiles = [];
    state.particles = [];
    state.acidPools = [];
    state.beams = [];
    state.railAfterimages = [];
    state.gameOver = false;
    state.victory = false;
    state.runKills = 0;
    state.runEarned = 0;
    state.runResearchReward = 0;
    state.slotKinds = randomizeSlotKinds(stage.slots.length);
    state.slots.forEach((s) => { s.tower = null; s.pulse = 0; });
    buildStageGeometry();
    buildFallbackWaves();
    updateUI();
    updateBossHud();
    updateSoundButton();
    updateAutoWaveButton();
    showBanner("방어망 가동", "빈 슬롯을 선택한 뒤 타워를 골라 배치하세요.", 3000);
  }

  function makeTower(type, slotIndex) {
    const def = TOWER_DEFS[type];
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      type,
      slotIndex,
      level: 1,
      cooldown: 0,
      recoil: 0,
      angle: -Math.PI / 2,
      kills: 0,
      spent: towerBuildCost(type),
      branch: null,
      laserTarget: null,
      laserFocus: 0,
    };
  }

  function towerBuildCost(type) {
    const def = TOWER_DEFS[type];
    const research = currentResearchLevels();
    const discount = Math.min(0.25, (research.capacitors || 0) * 0.03);
    return Math.max(1, Math.floor(def.cost * (1 - discount)));
  }

  function towerUpgradeCost(tower) {
    const research = currentResearchLevels();
    const discount = Math.min(0.2, (research.capacitors || 0) * 0.02);
    const buildCost = TOWER_DEFS[tower.type].cost;
    const multiplier = [1.5, 2, 3][Math.max(0, Math.min(2, tower.level - 1))] || 1;
    return Math.max(1, Math.floor(buildCost * multiplier * (1 - discount)));
  }

  function difficultyArmorBonus(difficultyId = state.difficulty) {
    const bonuses = {
      normal: 1,
      hard: 3,
      hell: 5,
      nightmare: 10,
    };
    return bonuses[difficultyId] || 0;
  }

  function enemyArmorValue(typeOrDef, difficultyId = state.difficulty) {
    const def = typeof typeOrDef === "string" ? ENEMY_DEFS[typeOrDef] : typeOrDef;
    const baseArmor = def?.armor || 0;
    return baseArmor + difficultyArmorBonus(difficultyId);
  }

  function spawnEnemy(type, options = {}) {
    const def = ENEMY_DEFS[type];
    const difficulty = DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy;
    const hpScale = difficulty.hp * stageEnemyHpScale(type);
    const enemy = {
      type,
      hp: options.hp ?? def.hp * hpScale,
      maxHp: options.maxHp ?? options.hp ?? def.hp * hpScale,
      speed: options.speed ?? def.speed,
      progress: options.progress ?? -Math.random() * 6,
      x: state.path[0].x,
      y: state.path[0].y,
      radius: def.radius,
      slowTimer: 0,
      slowFactor: 1,
      stunTimer: 0,
      pullTimer: 0,
      pullX: state.path[0].x,
      pullY: state.path[0].y,
      pullStrength: 0,
      pullOffsetX: 0,
      pullOffsetY: 0,
      fracturedTimer: 0,
      markedTimer: 0,
      spawnCooldown: def.boss ? BOSS_MINION_BASE_COOLDOWN : 0,
      shieldRegenTimer: def.shieldRegen?.interval || 0,
      bossPhase: 0,
      bossAnnounced: false,
      phase: Math.random() * 10,
      hatchTimer: options.hatchTimer ?? 0,
      sourceType: options.sourceType || null,
      guardedTimer: 0,
      guardArmor: 0,
      enraged: false,
      dead: false,
    };
    placeOnPath(enemy);
    state.enemies.push(enemy);
    if (def.boss) {
      enemy.bossAnnounced = true;
      state.shock = Math.max(state.shock, 0.7);
      playSound("bossIntro");
      showBossWarning("거대 개체 감지", "보스 웨이브입니다. 장갑 대응과 순간 화력을 준비하세요.");
      floatingText(enemy.x, enemy.y - 54, `${def.name} 출현`, "#ffb3ba");
    }
    return enemy;
  }

  function createBroodCocoon(enemy) {
    const def = ENEMY_DEFS.broodcarrier;
    const cocoonDef = ENEMY_DEFS.broodcocoon;
    if (!def?.cocoon || !cocoonDef) return;
    const cocoonHp = def.cocoon.hp * ((DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy).hp || 1) * stageEnemyHpScale("broodcarrier");
    const cocoon = spawnEnemy("broodcocoon", {
      hp: cocoonHp,
      maxHp: cocoonHp,
      progress: enemy.progress,
      speed: 0,
      hatchTimer: def.cocoon.hatchTime,
      sourceType: enemy.type,
    });
    cocoon.phase = enemy.phase;
    burst(enemy.x, enemy.y, cocoonDef.color, 16, 90);
    floatingText(enemy.x, enemy.y - 18, "고치 형성", "#ffd7a0");
  }

  function hatchBroodCocoon(cocoon) {
    const sourceDef = ENEMY_DEFS[cocoon.sourceType] || ENEMY_DEFS.broodcarrier;
    const hatchGroups = sourceDef?.cocoon?.hatchGroups || [];
    const total = hatchGroups.reduce((sum, group) => sum + group.count, 0);
    let spawned = 0;
    for (const group of hatchGroups) {
      for (let i = 0; i < group.count; i++) {
        const hatchling = spawnEnemy(group.type, {
          progress: Math.max(0, cocoon.progress - 8 - spawned * 3),
        });
        hatchling.phase = cocoon.phase + i * 0.4;
        spawned += 1;
      }
    }
    cocoon.dead = true;
    burst(cocoon.x, cocoon.y, sourceDef.color || cocoon.color, 28 + total * 3, 150);
    floatingText(cocoon.x, cocoon.y - 24, "고치 부화", "#ffcf8a");
  }

  function startWave() {
    if (state.waveActive || state.gameOver || state.victory) return;
    const wave = state.waves[state.waveIndex];
    if (!wave) return;
    window.clearTimeout(scheduleAutoWave.timer);
    state.autoWaveDueAt = 0;
    console.log("[wave-debug] startWave", {
      stageIndex: state.stageIndex,
      waveIndex: state.waveIndex,
      groups: wave.groups.map((group) => ({ type: group.type, count: group.count, gap: group.gap })),
    });
    playSound("click");
    state.waveQueue = wave.groups.map((g) => ({ ...g, remaining: g.count }));
    state.currentGroup = null;
    state.spawnTimer = 0.25;
    state.waveActive = true;
    hideBanner();
    updateUI();
  }

  function deployTower(slotIndex, towerType = state.selectedTowerType) {
    const slot = state.slots[slotIndex];
    const type = towerType;
    if (!type || !slot || slot.tower) return;
    const def = TOWER_DEFS[type];
    const cost = towerBuildCost(type);
    if (state.alloy < cost) {
      slot.pulse = 1;
      state.selectedTowerType = null;
      playSound("error");
      floatingText(slot.x, slot.y - 18, "합금 부족", "#ff5e6c");
      updateUI();
      return;
    }
    state.alloy -= cost;
    const tower = makeTower(type, slotIndex);
    slot.tower = tower;
    state.towers.push(tower);
    state.selectedSlot = slotIndex;
    state.selectedTowerType = null;
    state.selectedTowerInfoVisible = false;
    burst(slot.x, slot.y, def.color, 18, 110);
    playSound("deploy");
    updateUI();
  }

  function buildSelectedTower() {
    const slot = state.slots[state.selectedSlot];
    if (!slot || slot.tower || !state.selectedTowerType) return;
    deployTower(state.selectedSlot, state.selectedTowerType);
  }

  function upgradeSelected() {
    const tower = selectedTower();
    if (!tower || tower.level >= 4) return;
    const cost = towerUpgradeCost(tower);
    if (state.alloy < cost) {
      playSound("error");
      floatingText(state.slots[tower.slotIndex].x, state.slots[tower.slotIndex].y - 22, "합금 부족", "#ff5e6c");
      return;
    }
    if (tower.level === 3 && !tower.branch) {
      openBranchScreen(tower, cost);
      return;
    }
    applyTowerUpgrade(tower, cost, null);
  }

  function applyTowerUpgrade(tower, cost, branch) {
    state.alloy -= cost;
    tower.level += 1;
    if (branch) tower.branch = branch;
    tower.spent += cost;
    const slot = state.slots[tower.slotIndex];
    burst(slot.x, slot.y, TOWER_DEFS[tower.type].color, 32, 160);
    playSound("upgrade");
    updateUI();
  }

  function towerSellValue(tower) {
    const research = currentResearchLevels();
    return towerMetrics.sellValue(tower.spent, research.recycle);
  }

  function sellSelected() {
    const tower = selectedTower();
    if (!tower) return;
    const slot = state.slots[tower.slotIndex];
    state.alloy += towerSellValue(tower);
    state.towers = state.towers.filter((t) => t !== tower);
    slot.tower = null;
    state.selectedSlot = -1;
    burst(slot.x, slot.y, "#8f9db3", 12, 80);
    updateUI();
  }

  function selectedTower() {
    if (state.selectedSlot < 0) return null;
    return state.slots[state.selectedSlot]?.tower || null;
  }

  function branchName(type, branch) {
    return (BRANCH_DEFS[type] || []).find((item) => item.id === branch)?.name || "";
  }

  function towerStats(type, level = 1, slot = null, branch = null, researchOverride = null) {
    const def = TOWER_DEFS[type];
    const research = researchOverride || getResearchLevels();
    const bonuses = slotBonuses(slot);
    const levelScale = 1 + (level - 1) * 0.42;
    const damageScale = (1 + (research[type] || 0) * 0.08) * (1 + (research.targeting || 0) * 0.02) * (1 + (research.allDamage || 0) * 0.04);
    const rangeScale = 1 + (research.ballistics || 0) * 0.02 + (research.range || 0) * 0.04;
    const cooldownScale = Math.max(0.7, 1 - (research.cooldown || 0) * 0.03);
    const range = Math.round(towerBaseRange(type, def, level, branch) * bonuses.range * rangeScale);
    const baseDamage = def.damage * levelScale;
    const damage = Math.floor(baseDamage * damageScale * bonuses.damage);
    const cooldownBase = type === "laser"
      ? def.cooldown
      : def.cooldown * (1 - (level - 1) * 0.08) * bonuses.cooldown * cooldownScale;
    const cooldown = def.cooldown ? Math.round(cooldownBase * 100) / 100 : 0;
    const splash = def.splash
      ? Math.round(def.splash * (1 + (level - 1) * 0.16 + research.plasma * 0.06 + (type === "plasma" && branch === "wide" ? 0.5 : 0)))
      : 0;
    const chain = def.chain ? def.chain + (level - 1) + (branch === "storm" ? 4 : 0) : 0;
    const pierce = def.pierce ? def.pierce + (branch === "breach" ? 2 : 0) : 0;
    const slow = type === "cryo" && def.slow ? Math.round((1 - slowFactorForTower(type, def, level, branch, research)) * 100) : 0;
    const stun = type === "arc"
      ? Math.round(((branch === "surge" ? 0.2 : def.stun || 0.1) * 100)) / 100
      : type === "cryo" && def.stun
        ? Math.round((def.stun || 0) * 100) / 100
        : 0;
    const pullRadius = type === "gravity" ? gravityPullRadiusForTower(def, level, branch, research) : 0;
    const controlDuration = type === "gravity" ? gravityPullDurationForTower(def, level, branch, research) : 0;
    const auraDamage = def.auraDamage ? Math.round(auraDamageBoost(def, level, branch, research) * 100) : 0;
    const auraCooldown = def.auraCooldown ? Math.round(auraCooldownBoost(def, level, branch, research) * 100) : 0;
    return { damage, range, cooldown, splash, slow, chain, pierce, stun, pullRadius, controlDuration, auraDamage, auraCooldown };
  }

  function towerStatsText(type, level = 1, slot = null, branch = null) {
    const stats = towerStats(type, level, slot, branch);
    const parts = [];
    if (stats.damage > 0) parts.push(`피해 ${stats.damage}`);
    parts.push(`사거리 ${stats.range}`);
    if (stats.cooldown) parts.push(`주기 ${stats.cooldown}s`);
    if (stats.splash) parts.push(`폭발 ${stats.splash}`);
    if (stats.slow) parts.push(`감속 ${stats.slow}%`);
    if (stats.stun) parts.push(`기절 ${stats.stun}s`);
    if (stats.pullRadius) parts.push(`흡인 ${stats.pullRadius}`);
    if (stats.controlDuration) parts.push(`제어 ${stats.controlDuration}s`);
    if (stats.chain) parts.push(`연쇄 ${stats.chain}`);
    if (stats.pierce) parts.push(`관통 ${stats.pierce}`);
    if (stats.auraDamage) parts.push(`피해 보정 +${stats.auraDamage}%`);
    if (stats.auraCooldown) parts.push(`주기 보정 -${stats.auraCooldown}%`);
    if (type === "laser") parts.push(`집중 공격마다 피해 +${LASER_FOCUS_PER_HIT.toFixed(1)}배, 최대 x${laserMaxDamageMultiplier(branch)}`);
    if (branch) {
      const detail = branchDetailText(type, branch);
      parts.push(detail ? `${branchName(type, branch)} (${detail})` : branchName(type, branch));
    }
    return parts.join(" / ");
  }

  function roundedMetric(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function laserMaxDamageMultiplier(branch) {
    return branch === "overheat" ? 3 : LASER_BASE_MAX_DAMAGE_MULTIPLIER;
  }

  function laserMaxFocusBonus(branch) {
    return laserMaxDamageMultiplier(branch) - 1;
  }

  function laserMaxFocusHits(branch) {
    return Math.round(laserMaxFocusBonus(branch) / LASER_FOCUS_PER_HIT);
  }

  function laserFocusHits(focusBonus, branch = null) {
    return Math.min(laserMaxFocusHits(branch), Math.round(Math.max(0, focusBonus) / LASER_FOCUS_PER_HIT));
  }

  function laserFocusMultiplier(focusBonus, branch = null) {
    const bonus = Math.min(laserMaxFocusBonus(branch), Math.max(0, focusBonus));
    return Math.min(laserMaxDamageMultiplier(branch), 1 + bonus);
  }

  function laserFocusRatio(focusBonus, branch = null) {
    const maxBonus = laserMaxFocusBonus(branch);
    if (maxBonus <= 0) return 1;
    return Math.max(0, Math.min(1, focusBonus / maxBonus));
  }

  function effectiveTowerStats(tower, slot) {
    const stats = towerStats(tower.type, tower.level, slot, tower.branch);
    if (tower.type === "beacon") return stats;
    const support = towerSupportBonuses(tower, slot, currentResearchLevels());
    return {
      ...stats,
      damage: Math.floor(stats.damage * support.damage),
      cooldown: stats.cooldown ? Math.round(stats.cooldown * support.cooldown * 100) / 100 : 0,
    };
  }

  function beaconAffectedTowers(tower) {
    if (!tower || tower.type !== "beacon") return [];
    const slot = state.slots[tower.slotIndex];
    const def = TOWER_DEFS.beacon;
    const research = currentResearchLevels();
    const range = towerBaseRange("beacon", def, tower.level, tower.branch)
      * slotBonuses(slot).range
      * (1 + (research.ballistics || 0) * 0.02 + (research.range || 0) * 0.04);
    return state.towers.filter((ally) => {
      if (ally === tower || ally.type === "beacon") return false;
      const allySlot = state.slots[ally.slotIndex];
      return allySlot && dist(slot, allySlot) <= range;
    });
  }

  function nextUpgradeSummary(type, level, slot, branch) {
    if (level >= 4) return "";
    const current = towerStats(type, level, slot, branch);
    const next = towerStats(type, level + 1, slot, branch);
    const changes = [];
    const fields = [
      ["damage", "피해", false],
      ["range", "사거리", false],
      ["cooldown", "주기", true],
      ["splash", "폭발", false],
      ["slow", "감속", false],
      ["stun", "기절", false],
      ["pullRadius", "흡인", false],
      ["controlDuration", "제어", false],
      ["chain", "연쇄", false],
      ["pierce", "관통", false],
      ["auraDamage", "피해 보정", false],
      ["auraCooldown", "주기 보정", false],
    ];
    for (const [key, label, lowerIsBetter] of fields) {
      if (!next[key] || next[key] === current[key]) continue;
      const suffix = key === "slow" || key.startsWith("aura") ? "%" : key === "cooldown" || key === "stun" || key === "controlDuration" ? "s" : "";
      changes.push(`${label} ${roundedMetric(next[key])}${suffix}`);
    }
    return changes.slice(0, 3).join(" / ");
  }

  function towerDetailHtml(type, level, slot, branch, tower = null) {
    const stats = tower ? effectiveTowerStats(tower, slot) : towerStats(type, level, slot, branch);
    const output = towerMetrics.estimateOutput(type, stats, laserMaxDamageMultiplier(branch));
    const chips = [];
    if (type === "laser") {
      chips.push(`<span class="detail-chip">DPS ${roundedMetric(output.dps)} / 최대 ${roundedMetric(output.maxDps)}</span>`);
    } else if (output.dps > 0) {
      chips.push(`<span class="detail-chip">DPS ${roundedMetric(output.dps)}</span>`);
      if (output.throughput > output.dps) {
        chips.push(`<span class="detail-chip">최대 처리 ${roundedMetric(output.throughput)}/초</span>`);
      }
    }
    if (type === "cryo") {
      chips.push(`<span class="detail-chip">범위 내 적을 지속 감속합니다.</span>`);
    } else if (type === "gravity") {
      chips.push(`<span class="detail-chip">흡인 유지 ${roundedMetric(stats.controlDuration)}s</span>`);
    } else if (stats.splash) {
      chips.push(`<span class="detail-chip">범위 반경 ${stats.splash}</span>`);
    }
    if (tower?.type === "beacon") {
      chips.push(`<span class="detail-chip live">지원 중 ${beaconAffectedTowers(tower).length}기</span>`);
    }
    if (tower?.type === "laser") {
      chips.push(`<span id="selectedLiveMetric" class="detail-chip live"></span>`);
    }
    if (tower) {
      const next = nextUpgradeSummary(type, level, slot, branch);
      if (next) chips.push(`<span class="detail-chip next">다음: ${next}</span>`);
    }
    return chips.join("");
  }

  function slotEffectDetailHtml(slot) {
    if (!slot) return "";
    const kind = slotKindDef(slot.kind);
    return `<span class="detail-chip">${kind.name} / ${kind.desc}</span>`;
  }

  function selectedStatsHtml(primary, secondary = "") {
    return secondary
      ? `<span class="selected-stats-line">${primary}</span><span class="selected-stats-line selected-stats-spec">${secondary}</span>`
      : `<span class="selected-stats-line">${primary}</span>`;
  }

  function slowFactorForTower(type, def, level, branch, research) {
    if (type === "cryo") {
      const branchBonus = branch === "freeze" ? 0.1 : 0;
      return Math.max(0.05, def.slow - (level - 1) * 0.07 - research.cryo * 0.03 - branchBonus);
    }
    return def.slow;
  }

  function gravityPullRadiusForTower(def, level, branch, research = currentResearchLevels()) {
    return Math.round(((def.pullRadius || 0) + (level - 1) * 5) * (branch === "snare" ? 1.5 : 1) * (1 + (research.gravity || 0) * 0.06));
  }

  function gravityPullDurationForTower(def, level, branch) {
    return Math.round(((def.pullDuration || 0) + (level - 1) * 0.04 + (branch === "singularity" ? 1 : 0)) * 100) / 100;
  }

  function gravityPullStrengthForTower(def, level, branch, research = currentResearchLevels()) {
    return (def.pullStrength || 0) * (1 + (level - 1) * 0.12) * (1 + (research.gravity || 0) * 0.06);
  }

  function auraDamageBoost(def, level, branch, research = currentResearchLevels()) {
    return towerMetrics.auraDamageBoost(level, branch) + (research.beacon || 0) * 0.03;
  }

  function auraCooldownBoost(def, level, branch, research = currentResearchLevels()) {
    return towerMetrics.auraCooldownBoost(level, branch) + (research.beacon || 0) * 0.03;
  }

  function update(dt) {
    if (state.screen !== "battle") {
      updateParticles(dt);
      return;
    }
    if (state.gameOver || state.victory) {
      updateParticles(dt);
      return;
    }
    state.time += dt;
    state.shock = Math.max(0, state.shock - dt * 1.8);
    updateCoreShield(dt);
    spawnTick(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateAcidPools(dt);
    for (const afterimage of state.railAfterimages) afterimage.life -= dt;
    state.railAfterimages = state.railAfterimages.filter((afterimage) => afterimage.life > 0);
    pruneDeadEnemies();
    updateParticles(dt);
    for (const slot of state.slots) slot.pulse = Math.max(0, slot.pulse - dt * 2.4);

    if (state.waveActive && state.waveQueue.length === 0 && !state.currentGroup && state.enemies.length === 0) {
      completeWave();
    }
    if (
      state.autoWave &&
      state.autoWaveDueAt > 0 &&
      performance.now() >= state.autoWaveDueAt &&
      state.screen === "battle" &&
      !state.waveActive &&
      !state.gameOver &&
      !state.victory
    ) {
      startWave();
    }
  }

  function pruneDeadEnemies() {
    if (!state.enemies.some((enemy) => enemy.dead)) return;
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    refreshEnemyCaches();
  }

  function spawnTick(dt) {
    if (!state.waveActive) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;
    if (!state.currentGroup) {
      state.currentGroup = state.waveQueue.shift() || null;
      if (!state.currentGroup) return;
    }
    spawnEnemy(state.currentGroup.type);
    state.currentGroup.remaining -= 1;
    state.spawnTimer = state.currentGroup.gap;
    if (state.currentGroup.remaining <= 0) state.currentGroup = null;
  }

  function updateEnemyGuardAuras() {
    for (const enemy of state.enemies) {
      enemy.guardedTimer = 0;
      enemy.guardArmor = 0;
    }
    const guards = state.enemies.filter((enemy) => !enemy.dead && ENEMY_DEFS[enemy.type]?.guardAura);
    for (const guard of guards) {
      const aura = ENEMY_DEFS[guard.type].guardAura;
      const radius2 = aura.radius * aura.radius;
      for (const ally of state.enemies) {
        if (ally.dead || ally === guard || ENEMY_DEFS[ally.type]?.boss) continue;
        const dx = ally.x - guard.x;
        const dy = ally.y - guard.y;
        if (dx * dx + dy * dy <= radius2) {
          ally.guardedTimer = 0.2;
          ally.guardArmor = Math.max(ally.guardArmor || 0, aura.armor);
        }
      }
    }
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      const def = ENEMY_DEFS[enemy.type];
      enemy.phase += dt;
      enemy.slowTimer -= dt;
      enemy.stunTimer = Math.max(0, (enemy.stunTimer || 0) - dt);
      enemy.pullTimer = Math.max(0, (enemy.pullTimer || 0) - dt);
      enemy.fracturedTimer = Math.max(0, (enemy.fracturedTimer || 0) - dt);
      enemy.markedTimer = Math.max(0, (enemy.markedTimer || 0) - dt);
      if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
      const enrageActive = Boolean(def.enrage && enemy.hp / enemy.maxHp <= def.enrage.threshold);
      if (enrageActive && !enemy.enraged) {
        enemy.enraged = true;
        burst(enemy.x, enemy.y, def.color, 14, 110);
        floatingText(enemy.x, enemy.y - 20, "광폭 질주", "#dfff62");
      }
      const enrageSpeed = enrageActive ? def.enrage.speed : 1;
      const bossPhaseSpeed = def.phaseSpeed?.[enemy.bossPhase || 0] || 1;
      const motionFactor = enemy.stunTimer > 0 ? 0 : enemy.slowFactor * enrageSpeed * bossPhaseSpeed;
      if (def.cocoonBody) {
        enemy.hatchTimer = Math.max(0, (enemy.hatchTimer || 0) - dt);
        if (enemy.hatchTimer <= 0 && !enemy.dead) {
          hatchBroodCocoon(enemy);
          continue;
        }
      } else {
        enemy.progress += enemy.speed * motionFactor * dt;
        placeOnPath(enemy);
        if (enemy.pullTimer > 0) {
          const currentX = enemy.x + (enemy.pullOffsetX || 0);
          const currentY = enemy.y + (enemy.pullOffsetY || 0);
          const dx = (enemy.pullX || enemy.x) - currentX;
          const dy = (enemy.pullY || enemy.y) - currentY;
          const distanceToPull = Math.hypot(dx, dy);
          if (distanceToPull > 0.001) {
            const step = Math.min(distanceToPull, (enemy.pullStrength || 0) * dt);
            enemy.pullOffsetX = (enemy.pullOffsetX || 0) + (dx / distanceToPull) * step;
            enemy.pullOffsetY = (enemy.pullOffsetY || 0) + (dy / distanceToPull) * step;
          }
        } else {
          enemy.pullStrength = 0;
        }
        const settle = Math.max(0, 1 - dt * 8);
        enemy.pullOffsetX = (enemy.pullOffsetX || 0) * settle;
        enemy.pullOffsetY = (enemy.pullOffsetY || 0) * settle;
        enemy.x += enemy.pullOffsetX || 0;
        enemy.y += enemy.pullOffsetY || 0;
      }

      if (def.boss) {
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        const nextPhase = hpRatio <= 0.15 ? 3 : hpRatio <= 0.4 ? 2 : hpRatio <= 0.7 ? 1 : 0;
        if (nextPhase > enemy.bossPhase) {
          enemy.bossPhase = nextPhase;
          triggerBossPhase(enemy, nextPhase);
        }
        if (def.shieldRegen) {
          enemy.shieldRegenTimer = Math.max(0, (enemy.shieldRegenTimer || def.shieldRegen.interval) - dt);
          const shieldCap = enemy.maxHp * def.shieldRegen.cap;
          if (enemy.shieldRegenTimer <= 0) {
            enemy.shieldRegenTimer = Math.max(1, def.shieldRegen.interval - enemy.bossPhase * 0.45);
            if (enemy.hp < shieldCap) {
              const before = enemy.hp;
              enemy.hp = Math.min(shieldCap, enemy.hp + def.shieldRegen.amount * (1 + enemy.bossPhase * 0.25));
              burst(enemy.x, enemy.y, def.color, 28 + enemy.bossPhase * 8, 130);
              floatingText(enemy.x, enemy.y - 46, `보호막 +${Math.ceil(enemy.hp - before)}`, "#baf4ff");
            }
          }
        }
        enemy.spawnCooldown -= dt;
        if (enemy.spawnCooldown <= 0) {
          enemy.spawnCooldown = Math.max(7.5, BOSS_MINION_BASE_COOLDOWN - state.waveIndex * 0.2 - enemy.bossPhase * 0.55) * (stageRule().bossCooldown || 1);
          spawnBossMinions(enemy, 5 + enemy.bossPhase * 2);
          burst(enemy.x, enemy.y, def.color || "#ff5e6c", 36, 150);
          floatingText(enemy.x, enemy.y - 42, def.shieldRegen ? "호위 소환" : def.phaseSpeed ? "균열 증원" : "무리 소환", "#ff9aa3");
        }
      }

      if (enemy.progress >= state.pathLength) {
        const leakDamage = def.boss ? 8 : 1;
        enemy.dead = true;
        if (state.coreShield > 0) {
          state.coreShield -= 1;
          state.coreShieldTimer = 0;
          state.shock = 0.45;
          const corePoint = state.path[state.path.length - 1];
          floatingText(corePoint.x, corePoint.y - 36, "Block!", "#72f7ff");
        } else {
          state.core -= leakDamage;
          state.shock = 1;
          floatingText(state.width - 28, state.height - 32, `코어 -${leakDamage}`, "#ff5e6c");
          if (state.core <= 0) {
            state.core = 0;
            state.gameOver = true;
            showBanner("방어선 붕괴", "코어가 파괴되었습니다. 타워 배치를 재정비하세요.");
            openResultScreen(false);
          }
        }
        updateUI();
      }
    }
    updateEnemyGuardAuras();
    state.enemies = state.enemies.filter((e) => !e.dead);
    refreshEnemyCaches();
    updateBossHud();
  }

  function triggerBossPhase(enemy, phase) {
    const labels = ["", "증원 개시", "압박 증대", "최후 공세"];
    const def = ENEMY_DEFS[enemy.type] || {};
    const details = [
      "",
      def.shieldRegen ? "보스의 보호막 재생과 호위 호출이 강화됩니다." : "보스가 지원 병력을 더 자주 소환합니다.",
      def.phaseSpeed ? "균열 에너지로 이동 속도가 빨라집니다." : "전장의 압박이 강해지고 돌파 속도가 빨라집니다.",
      def.shieldRegen ? "매트론이 마지막 보호막 공세를 시작합니다." : def.phaseSpeed ? "베히모스가 최종 돌진 태세에 들어갑니다." : "콜로서스가 마지막 물량 공세를 시작합니다.",
    ];
    state.shock = Math.max(state.shock, 0.85);
    enemy.spawnCooldown = Math.min(enemy.spawnCooldown, 1.2);
    burst(enemy.x, enemy.y, def.color || "#ff5e6c", 70 + phase * 18, 250);
    floatingText(enemy.x, enemy.y - 58, labels[phase], "#ffc85a");
    showBossWarning(labels[phase], details[phase]);
    spawnBossMinions(enemy, 3 + phase * 3);
  }

  function spawnBossMinions(boss, count) {
    let trailingOffset = 42;
    for (let i = 0; i < count; i++) {
      const bossDef = ENEMY_DEFS[boss.type] || {};
      const minionPool = bossDef.minions || ["swarming", "lurker", "skitter", "brute"];
      let type = minionPool[0] || "swarming";
      if (boss.bossPhase >= 1 && i % 3 === 0) type = minionPool[1] || "lurker";
      if (boss.bossPhase >= 2 && i % 5 === 0) type = minionPool[2] || "skitter";
      if (boss.bossPhase >= 3 && i % 7 === 0) type = minionPool[3] || "brute";
      const minion = spawnEnemy(type, {
        progress: boss.progress - trailingOffset,
      });
      minion.phase = boss.phase + i * 0.35;
      trailingOffset += minion.radius * 2 + 12;
    }
  }

  function updateBossHud() {
    const boss = state.currentBoss;
    if (!boss) {
      ui.bossHud.classList.remove("active");
      return;
    }
    const def = ENEMY_DEFS[boss.type];
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    const phaseNames = ["1단계", "2단계", "3단계", "최종 단계"];
    const telemetry = [];
    if (boss.bossPhase >= 1) telemetry.push(def.shieldRegen ? "보호막 강화" : "추가 소환 강화");
    if (boss.bossPhase >= 2) telemetry.push(def.phaseSpeed ? "균열 가속" : "압박 증가");
    if (boss.bossPhase >= 3) telemetry.push("최후 공세");
    const armor = enemyArmorValue(def);
    if (armor > 0) telemetry.push(`장갑 ${armor}`);
    ui.bossHud.classList.add("active");
    ui.bossName.textContent = def.name;
    ui.bossPhase.textContent = `${phaseNames[boss.bossPhase]} / ${Math.ceil(boss.hp)} HP`;
    ui.bossBarFill.style.width = `${Math.max(0, Math.min(100, hpRatio * 100))}%`;
    if (ui.bossTelemetry) ui.bossTelemetry.textContent = telemetry.length ? telemetry.join(" · ") : "패턴 분석 중";
  }

  function showBossWarning(title, detail = "보스 패턴 변화에 대비해 방어선을 정비하세요.") {
    if (ui.bossWarningTitle) ui.bossWarningTitle.textContent = title;
    if (ui.bossWarningDetail) ui.bossWarningDetail.textContent = detail;
    else ui.bossWarning.textContent = title;
    ui.bossWarning.classList.remove("active");
    void ui.bossWarning.offsetWidth;
    ui.bossWarning.classList.add("active");
    window.clearTimeout(showBossWarning.timer);
    showBossWarning.timer = window.setTimeout(() => {
      ui.bossWarning.classList.remove("active");
    }, 1250);
  }

  function updateTowers(dt) {
    const research = currentResearchLevels();
    for (const tower of state.towers) {
      const slot = state.slots[tower.slotIndex];
      const def = TOWER_DEFS[tower.type];
      const bonuses = slotBonuses(slot);
      const support = tower.type === "beacon" ? { damage: 1, cooldown: 1 } : towerSupportBonuses(tower, slot, research);
      const levelScale = 1 + (tower.level - 1) * 0.42;
      const overdriveScale = state.waveActive ? 1 + (research.overdrive || 0) * 0.03 : 1;
      const damageResearch = (1 + (research[tower.type] || 0) * 0.08) * (1 + (research.targeting || 0) * 0.02) * (1 + (research.allDamage || 0) * 0.04) * overdriveScale * bonuses.damage * support.damage;
      const rangeScale = 1 + (research.ballistics || 0) * 0.02 + (research.range || 0) * 0.04;
      const cooldownScale = Math.max(0.7, 1 - (research.cooldown || 0) * 0.03) * support.cooldown;
      const range = towerBaseRange(tower.type, def, tower.level, tower.branch) * bonuses.range * rangeScale;
      const priorityBossTarget = tower.type === "laser" && tower.branch === "overheat"
        ? state.enemyProgressOrder.find((enemy) => ENEMY_DEFS[enemy.type]?.boss && !enemy.dead && dist(slot, enemy) <= range)
        : null;
      const lockedLaserTarget = tower.type === "laser"
        && tower.laserTarget
        && !tower.laserTarget.dead
        && dist(slot, tower.laserTarget) <= range
        ? tower.laserTarget
        : null;
      const target = tower.type === "laser"
        ? priorityBossTarget || lockedLaserTarget || findNearestTarget(slot.x, slot.y, range)
        : findTarget(slot.x, slot.y, range);
      tower.cooldown -= dt;
      tower.recoil = Math.max(0, tower.recoil - dt * 5);
      if (target) tower.angle = Math.atan2(target.y - slot.y, target.x - slot.x);

      if (tower.type === "laser") {
        if (!target) {
          tower.laserTarget = null;
          tower.laserFocus = 0;
          continue;
        }
        if (tower.laserTarget !== target) {
          tower.laserTarget = target;
          tower.laserFocus = 0;
        }
        const laserTarget = tower.laserTarget;
        if (!laserTarget || laserTarget.dead || dist(slot, laserTarget) > range) continue;
        tower.angle = Math.atan2(laserTarget.y - slot.y, laserTarget.x - slot.x);
        const focusRatio = laserFocusRatio(tower.laserFocus, tower.branch);
        const focusMultiplier = laserFocusMultiplier(tower.laserFocus, tower.branch);
        const laserCooldown = def.cooldown;
        if (tower.cooldown <= 0) {
          tower.cooldown = laserCooldown;
          const damage = def.damage * levelScale * damageResearch * focusMultiplier;
          dealDamage(laserTarget, damage, tower);
          playSound("laser");
          tower.laserFocus = Math.min(laserMaxFocusBonus(tower.branch), tower.laserFocus + LASER_FOCUS_PER_HIT);
          if (tower.branch === "prism") {
            for (const enemy of nearbyEnemies(laserTarget, 82, 3)) {
              if (enemy !== laserTarget) {
                dealDamage(enemy, damage * 0.3, tower);
                state.beams.push({ x1: laserTarget.x, y1: laserTarget.y, x2: enemy.x, y2: enemy.y, color: "#ffc85a", width: 0.8 + focusRatio * 0.4 });
              }
            }
          }
        }
        state.beams.push({
          x1: slot.x,
          y1: slot.y,
          x2: laserTarget.x,
          y2: laserTarget.y,
          color: def.color,
          width: (1.2 + tower.level * 0.65) * (0.85 + focusRatio * 0.35),
        });
        tower.recoil = 0.25;
      } else if (tower.type === "cryo") {
        let chilled = false;
        for (const enemy of state.enemies) {
          if (dist(slot, enemy) <= range) {
            const branchBonus = tower.branch === "freeze" ? 0.1 : 0;
            enemy.slowFactor = Math.max(0.05, def.slow - (tower.level - 1) * 0.07 - research.cryo * 0.03 - branchBonus);
            enemy.slowTimer = 0.5;
            chilled = true;
          }
        }
        if (chilled) playSound("cryo");
        tower.recoil = 0.2;
      } else if (tower.type === "beacon") {
        if (tower.cooldown <= 0) {
          tower.cooldown = def.cooldown * bonuses.cooldown * Math.max(0.78, 1 - (tower.level - 1) * 0.05);
          tower.recoil = 0.55;
          playSound("beacon");
          for (const ally of state.towers) {
            if (ally === tower || ally.type === "beacon") continue;
            const allySlot = state.slots[ally.slotIndex];
            if (allySlot && dist(slot, allySlot) <= range) {
              state.beams.push({ x1: slot.x, y1: slot.y, x2: allySlot.x, y2: allySlot.y, color: def.color, width: 0.75 });
            }
          }
        }
      } else if (tower.type === "arc" && target && tower.cooldown <= 0) {
        tower.cooldown = def.cooldown * (1 - (tower.level - 1) * 0.08) * bonuses.cooldown * cooldownScale;
        tower.recoil = 0.45;
        const hits = chainTargets(target, (def.chain || 0) + (tower.level - 1) + (tower.branch === "storm" ? 4 : 0), def.chainRange * (tower.branch === "storm" ? 1.18 : 1));
        let source = slot;
        for (const [index, enemy] of hits.entries()) {
          const falloff = tower.branch === "surge" ? 1 : Math.max(0.48, 1 - index * 0.16);
          dealDamage(enemy, def.damage * levelScale * damageResearch * falloff, tower);
          enemy.stunTimer = Math.max(enemy.stunTimer || 0, tower.branch === "surge" ? 0.2 : 0.1);
          state.beams.push({
            x1: source.x,
            y1: source.y,
            x2: enemy.x,
            y2: enemy.y,
            color: index === 0 ? def.color : "#fff1a3",
            width: Math.max(0.85, 1.8 - index * 0.18),
          });
          source = enemy;
        }
        burst(slot.x, slot.y, def.color, 7, 90);
        playSound("arc");
      } else if (tower.type === "rail" && target && tower.cooldown <= 0) {
        tower.cooldown = def.cooldown * (1 - (tower.level - 1) * 0.08) * bonuses.cooldown * cooldownScale;
        tower.recoil = 1.25;
        const lineHits = enemiesAlongBeam(slot, target, range, 30, def.pierce + (tower.branch === "breach" ? 2 : 0));
        const targetDx = target.x - slot.x;
        const targetDy = target.y - slot.y;
        const targetLength = Math.hypot(targetDx, targetDy) || 1;
        const beamEnd = {
          x: slot.x + (targetDx / targetLength) * range,
          y: slot.y + (targetDy / targetLength) * range,
        };
        for (const [index, enemy] of lineHits.entries()) {
          const hitScale = Math.max(0.72, 1 - index * 0.12);
          dealDamage(enemy, def.damage * levelScale * damageResearch * hitScale, tower);
          if (tower.branch === "lock") enemy.markedTimer = Math.max(enemy.markedTimer || 0, 5);
        }
        state.beams.push({ x1: slot.x, y1: slot.y, x2: beamEnd.x, y2: beamEnd.y, color: def.color, width: tower.branch === "breach" ? 6 : 5 });
        state.railAfterimages.push({
          x1: slot.x,
          y1: slot.y,
          x2: beamEnd.x,
          y2: beamEnd.y,
          color: def.color,
          width: tower.branch === "breach" ? 5.6 : 4.6,
          life: 1,
          maxLife: 1,
        });
        burst(slot.x, slot.y, def.color, 6, 110);
        playSound("rail");
      } else if (target && tower.cooldown <= 0) {
        tower.cooldown = def.cooldown * (1 - (tower.level - 1) * 0.08) * bonuses.cooldown * cooldownScale;
        tower.recoil = 1;
        const projectileCount = tower.type === "pulse" && tower.branch === "shock" ? 2 : 1;
        for (let i = 0; i < projectileCount; i++) {
          const offset = projectileCount > 1 ? (i - 0.5) * 5 : 0;
          state.projectiles.push({
            type: tower.type,
            x: slot.x + Math.cos(tower.angle) * 15 - Math.sin(tower.angle) * offset,
            y: slot.y + Math.sin(tower.angle) * 15 + Math.cos(tower.angle) * offset,
            target,
            damage: def.damage * levelScale * damageResearch,
            speed: def.projectileSpeed,
            splash: def.splash ? def.splash * (1 + (tower.level - 1) * 0.16 + research.plasma * 0.06 + (tower.branch === "wide" ? 0.5 : 0)) : 0,
            pullRadius: tower.type === "gravity" ? gravityPullRadiusForTower(def, tower.level, tower.branch) : 0,
            pullDuration: tower.type === "gravity" ? gravityPullDurationForTower(def, tower.level, tower.branch) : 0,
            pullStrength: tower.type === "gravity" ? gravityPullStrengthForTower(def, tower.level, tower.branch) : 0,
            color: def.color,
            tower,
            branch: tower.branch,
            trail: [],
          });
        }
        playSound(tower.type === "plasma" ? "plasma" : tower.type === "gravity" ? "gravity" : "pulse");
        burst(slot.x, slot.y, def.color, tower.type === "plasma" ? 8 : 5, 80);
      }
    }
  }

  function updateProjectiles(dt) {
    for (const p of state.projectiles) {
      if (!p.target || p.target.dead) {
        p.dead = true;
        continue;
      }
      p.trail.push({ x: p.x, y: p.y, life: 0.22 });
      p.trail = p.trail.filter((t) => (t.life -= dt) > 0);
      const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      p.x += Math.cos(angle) * p.speed * dt;
      p.y += Math.sin(angle) * p.speed * dt;
      if (p.type === "gravity") {
        for (const enemy of state.enemies) {
          if (enemy.dead || dist(p, enemy) > p.pullRadius) continue;
          enemy.pullTimer = Math.max(enemy.pullTimer || 0, p.pullDuration);
          enemy.pullX = p.x;
          enemy.pullY = p.y;
          enemy.pullStrength = Math.max(enemy.pullStrength || 0, p.pullStrength);
        }
      }
      if (dist(p, p.target) <= Math.max(p.target.radius, p.speed * dt)) {
        if (p.type === "gravity") {
          for (const enemy of state.enemies) {
            if (enemy.dead || dist(p.target, enemy) > p.pullRadius) continue;
            enemy.pullTimer = Math.max(enemy.pullTimer || 0, p.pullDuration);
            enemy.pullX = p.target.x;
            enemy.pullY = p.target.y;
            enemy.pullStrength = Math.max(enemy.pullStrength || 0, p.pullStrength);
          }
          burst(p.target.x, p.target.y, p.color, 14, p.pullRadius * 2.1);
          playSound("boom");
          state.shock = Math.max(state.shock, 0.08);
        } else if (p.splash) {
          for (const enemy of state.enemies) {
            const d = dist(p.target, enemy);
            if (d <= p.splash) dealDamage(enemy, p.damage * (1 - d / p.splash * 0.45), p.tower);
          }
          if (p.branch === "acid") {
            state.acidPools.push({ x: p.target.x, y: p.target.y, radius: p.splash * 0.5, damage: p.damage * 0.25, life: 2, maxLife: 2, tick: 0 });
          }
          burst(p.target.x, p.target.y, p.color, 46, 210);
          playSound("boom");
          state.shock = Math.max(state.shock, 0.18);
        } else {
          dealDamage(p.target, p.damage, p.tower);
          if (p.branch === "pierce") {
            for (const enemy of nearbyEnemies(p.target, 48, 3)) {
              if (enemy !== p.target) dealDamage(enemy, p.damage * 0.45, p.tower);
            }
          }
          burst(p.target.x, p.target.y, p.color, 9, 95);
        }
        p.dead = true;
      }
    }
    state.projectiles = state.projectiles.filter((p) => !p.dead);
  }

  function updateAcidPools(dt) {
    for (const pool of state.acidPools) {
      pool.life -= dt;
      pool.tick -= dt;
      if (pool.tick <= 0) {
        pool.tick = 1;
        for (const enemy of state.enemies) {
          if (dist(pool, enemy) <= pool.radius) {
            dealDamage(enemy, pool.damage, null);
          }
        }
      }
    }
    state.acidPools = state.acidPools.filter((pool) => pool.life > 0);
  }

  function refreshEnemyCaches() {
    state.enemyProgressOrder = [...state.enemies].sort((a, b) => b.progress - a.progress);
    state.enemyRenderOrder = [...state.enemies].sort((a, b) => a.y - b.y);
    state.currentBoss = state.enemyProgressOrder.find((enemy) => ENEMY_DEFS[enemy.type].boss) || null;
  }



  function updateCoreShield(dt) {
    if (state.coreShieldMax <= 0 || state.coreShield >= state.coreShieldMax) return;
    state.coreShieldTimer += dt;
    if (state.coreShieldTimer >= 5) {
      const restored = Math.floor(state.coreShieldTimer / 5);
      state.coreShield = Math.min(state.coreShieldMax, state.coreShield + restored);
      state.coreShieldTimer %= 5;
      updateUI();
    }
  }

  function dealDamage(enemy, amount, tower) {
    const def = ENEMY_DEFS[enemy.type];
    const armor = enemyArmorValue(def) + (enemy.guardedTimer > 0 ? enemy.guardArmor || 0 : 0);
    const research = currentResearchLevels();
    const fractureBoost = enemy.fracturedTimer > 0 ? 1.15 : 1;
    const bossBoost = def.boss && tower ? 1 + (research.bossBreaker || 0) * 0.08 : 1;
    const markedBoost = enemy.markedTimer > 0 ? 1.3 : 1;
    const armorReduction = (research.armorPierce || 0) * 2;
    const effectiveArmor = Math.max(0, armor - armorReduction);
    const finalArmor = tower?.type === "rail" && tower.branch === "breach" ? effectiveArmor * 0.5 : effectiveArmor;
    const actual = Math.max(1, amount * fractureBoost * bossBoost * markedBoost - finalArmor);
    enemy.hp -= actual;
    queueDamageNumber(enemy, actual);
    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      if (enemy.type === "broodcarrier") createBroodCocoon(enemy);
      if (tower) tower.kills += 1;
      state.runKills += 1;
      const rewardBonus = tower ? slotBonuses(state.slots[tower.slotIndex]).reward : 1;
      const difficultyReward = (DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy).reward;
      const salvageReward = 1 + (research.salvage || 0) * 0.04;
      const reward = Math.ceil(def.reward * rewardBonus * difficultyReward * salvageReward);
      state.alloy += reward;
      state.runEarned += reward;
      updateUI();
      burst(enemy.x, enemy.y, def.color, def.boss ? 90 : 22, def.boss ? 280 : 150);
      playSound(def.boss ? "boss" : "boom");
      if (def.boss) state.shock = 1;
    }
  }

  function queueDamageNumber(enemy, amount) {
    if (amount <= 0) return;
    const jitterX = (Math.random() - 0.5) * 14;
    const jitterY = -enemy.radius - 8 - Math.random() * 8;
    floatingText(enemy.x + jitterX, enemy.y + jitterY, formatDamage(amount), amount >= 30 ? "#fff3b0" : "#ffffff");
  }

  function formatDamage(value) {
    if (value >= 100) return String(Math.round(value));
    if (value >= 10) return String(Math.round(value));
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(2);
  }

  function completeWave() {
    const wave = state.waves[state.waveIndex];
    state.waveActive = false;
    const research = currentResearchLevels();
    const waveReward = Math.ceil(wave.reward * (1 + (research.waveBonus || 0) * 0.05));
    state.alloy += waveReward;
    state.runEarned += waveReward;
    if (research.repair) {
      state.core = Math.min(state.maxCore, state.core + research.repair);
    }
    state.waveIndex += 1;
    if (state.waveIndex >= state.waves.length) {
      state.victory = true;
      const previousCleared = getClearedStages();
      const cleared = Math.max(previousCleared, state.stageIndex + 1);
      const finalStageCleared = state.stageIndex >= STAGES.length - 1;
      let unlockedDifficultyId = null;
      setClearedStages(cleared);
      setSavedStageIndex(finalStageCleared ? state.stageIndex : state.stageIndex + 1);
      if (finalStageCleared) {
        const nextId = nextDifficultyId();
        if (nextId && !isDifficultyUnlocked(nextId)) {
          setHighestUnlockedDifficultyIndex(difficultyOrder.indexOf(nextId));
          localStorage.setItem("orbit.pendingDifficultyUnlock", nextId);
          unlockedDifficultyId = nextId;
        }
      }
      state.runResearchReward = state.stageIndex >= previousCleared ? stageResearchRewardForDifficulty() : 0;
      if (state.runResearchReward > 0) {
        setResearchPoints(researchPoints() + state.runResearchReward);
      }
      window.clearTimeout(scheduleAutoWave.timer);
      state.autoWaveDueAt = 0;
      const nextStageName = STAGES[(state.stageIndex + 1) % STAGES.length].name;
      const researchBanner = state.runResearchReward > 0
        ? `연구 점수 +${state.runResearchReward}. 다음 전장인 ${nextStageName} 구역으로 이동할 수 있습니다.`
        : `이미 클리어한 스테이지입니다. 연구 점수는 추가로 지급되지 않습니다. 다음 전장인 ${nextStageName} 구역으로 이동할 수 있습니다.`;
      showBanner("스테이지 확보", researchBanner);
      openResultScreen(true, unlockedDifficultyId);
    } else {
      showBanner("웨이브 정리 완료", `합금 ${waveReward} 획득. ${state.waveIndex + 1}웨이브를 준비하세요.`);
      if (state.autoWave) scheduleAutoWave();
    }
    updateUI();
  }

  function scheduleAutoWave() {
    window.clearTimeout(scheduleAutoWave.timer);
    if (!state.autoWave || state.waveActive || state.gameOver || state.victory || state.screen !== "battle") {
      state.autoWaveDueAt = 0;
      return;
    }
    state.autoWaveDueAt = performance.now() + 1300;
    scheduleAutoWave.timer = window.setTimeout(() => {
      if (state.autoWave && state.screen === "battle" && !state.waveActive && !state.gameOver && !state.victory) {
        startWave();
      }
    }, 1300);
  }

  function stageSummary(index) {
    return stageRule(index).summary || "장기전에 대비한 방어 작전입니다.";
  }

  const baseScreenController = window.OrbitBaseScreen.create({
    state,
    ui,
    STAGES,
    DIFFICULTY_DEFS,
    difficultyOrder,
    stageSummary,
    stageRule,
    researchPoints,
    resetStage,
    closeOverlay,
    openResearchScreen: () => openResearchScreen(),
    confirmProgressReset: () => confirmProgressReset(),
    exportSaveBackup: () => exportSaveBackup(),
    getClearedStages: (difficulty) => getClearedStages(difficulty),
    importSaveBackup: () => importSaveBackup(),
    isDifficultyUnlocked: (difficultyId) => isDifficultyUnlocked(difficultyId),
    applyDifficultyChoice: (difficultyId) => applyDifficultyChoice(difficultyId),
    consumePendingDifficultyUnlock: () => consumePendingDifficultyUnlock(),
  });
  const openBaseScreen = baseScreenController.openBaseScreen;
  const openDifficultyPopup = baseScreenController.openDifficultyPopup;
  const difficultyDescription = baseScreenController.difficultyDescription;

  function branchDetailText(type, branch) {
    const details = {
      pulse: {
        pierce: "명중 지점 48px 안의 추가 적 최대 2기에게 피해의 45%",
        shock: "공격이 2발씩 발사",
      },
      laser: {
        overheat: "보스 우선 공격, 집중 공격 최대 x3",
        prism: "주 대상 주변 적 2기에게 피해의 30% 보조 광선 연결",
      },
      plasma: {
        wide: "폭발 반경 +50%",
        acid: "현재 폭발 반경의 50% 산성 지대 2초 생성, 1초마다 피해의 25%",
      },
      cryo: {
        freeze: "감속이 추가로 10% 강화됩니다.",
        fracture: "사거리 +30%",
      },
      arc: {
        storm: "연쇄 대상 +4기, 연쇄 거리 +18%",
        surge: "정지 0.2초, 연쇄 피해 감소 없음",
      },
      rail: {
        breach: "관통 대상 +2기, 장갑 50% 무시",
        lock: "명중한 적을 5초 표식, 받는 모든 피해 +30%",
      },
      gravity: {
        singularity: "제어 시간 +1초",
        snare: "흡인 반경 +50%",
      },
      beacon: {
        amplify: "지원 범위 250, 주변 타워 피해 +30%, 공격 주기 -20%",
        overclock: "주변 타워 피해 +40%, 공격 주기 -30%",
      },
    };
    return details[type]?.[branch] || "";
  }


  function updateParticles(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.size += p.grow * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function addParticle(x, y, vx, vy, color, life, size) {
    state.particles.push({ x, y, vx, vy, color, life, maxLife: life, size, grow: 8 + Math.random() * 12 });
  }

  function burst(x, y, color, count, force) {
    const scaledCount = Math.max(1, Math.ceil(count * 0.55));
    const scaledForce = force * 0.72;
    for (let i = 0; i < scaledCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const f = scaledForce * (0.25 + Math.random() * 0.75);
      addParticle(x, y, Math.cos(a) * f, Math.sin(a) * f, color, 0.28 + Math.random() * 0.34, 1.5 + Math.random() * 2.6);
    }
  }

  function render() {
    const shake = state.shock * 4;
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    drawPath();
    drawAcidPools();
    drawSlots();
    drawTowerRanges();
    drawTowers();
    drawBeaconLinks();
    drawProjectiles();
    drawRailAfterimages();
    drawEnemies();
    drawBeams();
    drawParticles();
    drawCore();
    ctx.restore();
    fx.render(state.time, state.shock);
    updateSelectedLiveMetric();
  }

  function clearBattlefield() {
    ctx.clearRect(0, 0, state.width, state.height);
    if (!fx.gl) return;
    fx.gl.clearColor(0, 0, 0, 0);
    fx.gl.clear(fx.gl.COLOR_BUFFER_BIT);
  }

  const mapRenderer = window.OrbitMapRenderer.create({
    ctx,
    state,
    slotKindDef,
  });
  const drawBackground = mapRenderer.drawBackground;
  const drawPath = mapRenderer.drawPath;
  const drawSlots = mapRenderer.drawSlots;
  const drawCore = mapRenderer.drawCore;
  const drawHex = mapRenderer.drawHex;
  const hexPath = mapRenderer.hexPath;
  const towerRenderer = window.OrbitTowerRenderer.create({
    ctx,
    state,
    TOWER_DEFS,
    selectedTower,
    currentResearchLevels,
    towerBaseRange,
    slotBonuses,
    beaconAffectedTowers,
    drawHex,
    hexPath,
    laserFocusRatio,
  });
  const { drawBeaconLinks, drawTowerRanges, drawTowers } = towerRenderer;
  const battleHud = window.OrbitBattleHud.create({
    state,
    ui,
    $,
    STAGES,
    DIFFICULTY_DEFS,
    TOWER_DEFS,
    laserMaxFocusHits,
    waveOverview,
    liveThreatOverview,
    selectedTower,
    towerUpgradeCost,
    branchName,
    selectedStatsHtml,
    towerStatsText,
    towerDetailHtml,
    slotEffectDetailHtml,
    towerSellValue,
    slotKindDef,
    towerBuildCost,
    laserFocusMultiplier,
    laserFocusHits,
    updateTowerCardPreview,
  });
  const {
    floatingText,
    hideBanner,
    renderIntelTags,
    showBanner,
    updateAutoWaveButton,
    updateSelectedLiveMetric,
    updateSoundButton,
    updateUI,
  } = battleHud;
  const battleInput = window.OrbitBattleInput.create({
    state,
    canvas,
    ui,
    STAGES,
    dist,
    resize,
    updateUI,
    ensureAudio,
    startWave,
    selectedTower,
    upgradeSelected,
    buildSelectedTower,
    sellSelected,
    playSound,
    openStageInfoModal,
    updateAutoWaveButton,
    updateSoundButton,
    scheduleAutoWave,
    openBaseScreen,
    resetStage,
    closeOverlay,
  });
  const { handlePrimaryAction, wireEvents } = battleInput;

  function towerCardSummary(type, slot = null) {
    const stats = towerStats(type, 1, slot);
    const output = towerMetrics.estimateOutput(type, stats, laserMaxDamageMultiplier());
    const lines = [];
    if (type === "beacon") {
      lines.push(`지원 ${stats.auraDamage}%`);
      lines.push(`주기 -${stats.auraCooldown}%`);
    } else if (type === "gravity") {
      lines.push(`흡인 ${stats.pullRadius || 0}`);
      lines.push(`제어 ${stats.controlDuration || 0}s`);
    } else if (type === "cryo") {
      lines.push(`감속 ${stats.slow || 0}%`);
      lines.push(`기절 ${stats.stun || 0}s`);
    } else if (type === "laser") {
      lines.push(`DPS ${roundedMetric(output.dps)}`);
      lines.push(`최대 ${roundedMetric(output.maxDps)}`);
    } else {
      lines.push(`DPS ${roundedMetric(output.dps)}`);
      if (stats.splash) lines.push(`폭발 ${stats.splash}`);
      else if (stats.chain) lines.push(`연쇄 ${stats.chain}`);
      else if (stats.pierce) lines.push(`관통 ${stats.pierce}`);
      else lines.push(`사거리 ${stats.range}`);
    }
    if (lines.length < 2) lines.push(`사거리 ${stats.range}`);
    return {
      cost: towerBuildCost(type),
      role: TOWER_DEFS[type].role,
      primary: lines[0],
      secondary: lines[1],
    };
  }

  function updateTowerCardPreview(button) {
    const type = button.dataset.type;
    const name = TOWER_DEFS[type]?.name || "";
    const cost = towerBuildCost(type);
    const costEl = button.querySelector(".tower-card-cost");
    if (costEl) costEl.textContent = `${cost}`;
    const label = `${name} / 비용 ${cost}`;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function buildTowerBar() {
    ui.towerBar.innerHTML = "";
    Object.entries(TOWER_DEFS).forEach(([type, def]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tower-card";
      button.dataset.type = type;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `
        <strong>${def.name}</strong>
        <span class="tower-card-cost">${towerBuildCost(type)}</span>
      `;
      button.addEventListener("click", () => {
        const slot = state.slots[state.selectedSlot];
        if (!slot || slot.tower) return;
        if (performance.now() < state.towerBarUnlockAt) return;
        if (state.selectedTowerType === type) {
          deployTower(state.selectedSlot, type);
          return;
        }
        state.selectedTowerType = type;
        state.selectedTowerInfoVisible = true;
        state.towerBarUnlockAt = 0;
        updateUI();
      });
      ui.towerBar.appendChild(button);
    });
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  let last = performance.now();
  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;
    let remaining = raw * state.speed;
    state.beams.length = 0;
    while (remaining > 0) {
      const step = Math.min(remaining, SIMULATION_STEP);
      update(step);
      remaining -= step;
    }
    if (state.screen === "battle") {
      render();
    } else {
      clearBattlefield();
    }
    requestAnimationFrame(frame);
  }

  buildTowerBar();
  layoutResizeObserver = wireEvents();
  resize();
  resetStage(state.stageIndex);
  openBaseScreen();
  requestAnimationFrame(frame);
})();

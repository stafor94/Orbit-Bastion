(function () {
  "use strict";

  function createBattleOverlays(deps) {
    const {
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
      getOpenBaseScreen,
      resetStage,
      initPyodideWaves,
      playSound,
      difficultyProgressKey,
      applyTowerUpgrade,
      branchDetailText,
      consumePendingDifficultyUnlock,
    } = deps;

    function closeOverlay() {
      state.screen = "battle";
      ui.overlay.classList.remove("active");
      ui.overlay.innerHTML = "";
    }

    function closeStageInfoModal() {
      document.querySelector(".stage-intel-backdrop")?.remove();
    }

    function enemyWaveText(enemy) {
      return enemy.firstWave === enemy.lastWave
        ? `${enemy.firstWave}웨이브 등장`
        : `${enemy.firstWave}-${enemy.lastWave}웨이브 등장`;
    }

    function enemyIntelAvatarSvg(type) {
      const accent = {
        lurker: "#7dff8b",
        skitter: "#78d7ff",
        brute: "#d6e7ff",
        swarming: "#9df58f",
        broodcarrier: "#ffc88e",
        broodcocoon: "#ffd9a8",
        colossus: "#ff8c98",
      }[type] || "#7dff8b";
      const body = {
        lurker: `
          <ellipse cx="24" cy="26" rx="11" ry="8" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2"/>
          <path d="M15 23 L10 16 M15 28 L9 33 M33 23 L38 16 M33 28 L39 33" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="28" cy="23" r="2.5" fill="#ffffff"/>
        `,
        skitter: `
          <path d="M11 27 L24 14 L36 21 L30 30 L17 31 Z" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M16 30 L10 35 M20 31 L16 38 M30 27 L36 34 M33 23 L39 19" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="20" cy="22" r="2.5" fill="#ffffff"/>
        `,
        brute: `
          <path d="M10 26 L15 16 L29 14 L38 21 L37 31 L29 36 L16 35 L10 29 Z" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M14 31 L11 38 M32 31 L35 38 M13 20 L8 18 M35 23 L40 24" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="21" cy="22" r="2.2" fill="#ffffff"/>
          <circle cx="27" cy="21" r="1.8" fill="#ffffff"/>
        `,
        swarming: `
          <path d="M12 27 L22 20 L35 24 L30 31 L18 33 Z" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M16 26 L10 23 M16 30 L9 31 M29 28 L37 31" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="24" cy="24" r="2.2" fill="#ffffff"/>
        `,
        broodcarrier: `
          <path d="M10 25 C12 17, 21 14, 31 17 C38 19, 40 31, 32 35 C22 39, 11 35, 10 25 Z" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="2"/>
          <ellipse cx="30" cy="27" rx="7" ry="9" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="1.5"/>
          <circle cx="20" cy="23" r="2.4" fill="#ffffff"/>
        `,
        broodcocoon: `
          <ellipse cx="24" cy="26" rx="10" ry="13" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2"/>
          <path d="M18 18 C24 22, 27 29, 30 34" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
        `,
        colossus: `
          <ellipse cx="24" cy="26" rx="13" ry="10" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2"/>
          <path d="M12 18 L7 12 M13 33 L7 39 M36 18 L41 12 M35 33 L41 39" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="20" cy="24" r="2.6" fill="#ffffff"/>
          <circle cx="29" cy="23" r="2.2" fill="#ffffff"/>
        `,
      }[type] || "";
      return `
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle cx="24" cy="24" r="18" fill="${accent}" fill-opacity="0.12"/>
          ${body}
        </svg>
      `;
    }

    function openStageInfoModal() {
      if (state.screen !== "battle") return;
      closeStageInfoModal();
      const stage = STAGES[state.stageIndex];
      const roster = currentWaveEnemyRoster();
      const waveInfo = waveOverview();
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
          <p>${waveInfo.summary}</p>
          <div class="stage-intel-tags">
            ${waveInfo.threat.tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("")}
          </div>
        </div>
        <div class="stage-enemy-list">
          ${roster.map((enemy) => `
            <div class="stage-enemy-card">
              <div class="stage-enemy-head">
                <div class="stage-enemy-identity">
                  <div class="stage-enemy-avatar">${enemyIntelAvatarSvg(enemy.type)}</div>
                  <div>
                    <strong>${enemy.name}</strong>
                    <span>${enemyWaveText(enemy)}</span>
                  </div>
                </div>
                <span>총 ${enemy.count}기</span>
              </div>
              <div class="stage-enemy-badges">
                ${enemy.tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("")}
              </div>
              <div class="stage-enemy-grid">
                <span>체력 ${enemy.hp}</span>
                <span>속도 ${enemy.speed}</span>
                <span>장갑 ${enemy.armor}</span>
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
    }

    function researchLinkPath(from, to) {
      const a = RESEARCH_LAYOUT[from];
      const b = RESEARCH_LAYOUT[to];
      const nodeHalfWidth = 6.4;
      const startX = a[0] + nodeHalfWidth;
      const startY = a[1] + 5.8;
      const endX = b[0] - nodeHalfWidth;
      const endY = b[1] + 5.8;
      const midX = (startX + endX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    }

    function resetResearchByFilter(filter = state.selectedResearchFilter) {
      const levels = getResearchLevels();
      const targetFilter = filter || "all";
      const { refund, upgraded, cascaded } = researchResetSummary(targetFilter, levels);
      if (!upgraded || !refund) return;
      const label = targetFilter === "all" ? "전체 연구" : `${researchCategoryName(targetFilter)} 연구`;
      const applyReset = () => {
        for (const def of researchResetTargets(targetFilter, levels)) {
          levels[def.id] = 0;
        }
        state.researchLevels = levels;
        state.lastResearchPurchased = null;
        state.lastResearchPulseUntil = 0;
        setResearchPoints(researchPoints() + refund);
        saveResearchLevels(levels);
        resetStage(state.stageIndex);
        initPyodideWaves();
        openResearchScreen();
      };
      if (window.OrbitDialogs?.confirmResearchReset) {
        window.OrbitDialogs.confirmResearchReset({
          root: ui.overlay,
          title: label,
          refund,
          cascadeCount: cascaded,
          onConfirm: applyReset,
        });
        return;
      }
      const cascadeSuffix = cascaded ? `\n연쇄 초기화로 다른 연구 ${cascaded}개도 함께 환급됩니다.` : "";
      if (!window.confirm(`${label}를 초기화하고 연구 점수 ${refund}점을 환급할까요?${cascadeSuffix}`)) return;
      applyReset();
    }

    function openResearchScreen() {
      state.screen = "research";
      const levels = getResearchLevels();
      const points = researchPoints();
      const filter = "all";
      const visibleDefs = researchVisibleDefs(filter);
      const resetSummary = researchResetSummary(filter, levels);
      if (state.selectedResearch && !visibleDefs.some((def) => def.id === state.selectedResearch)) {
        state.selectedResearch = visibleDefs[0]?.id || null;
      }
      const selectedDef = RESEARCH_DEFS.find((def) => def.id === state.selectedResearch) || null;
      const visibleIds = new Set(visibleDefs.map((def) => def.id));
      ui.overlay.classList.add("active");
      ui.overlay.innerHTML = `
      <div class="screen-header">
        <div class="screen-title">
          <span>보유 연구 점수 ${points}</span>
          <h2>기술 연구소</h2>
        </div>
        <div class="screen-header-actions">
          <button id="resetResearchButton" class="screen-header-button" type="button" data-research-reset="${filter}" ${resetSummary.upgraded ? "" : "disabled"}>전체 초기화</button>
          <button id="backToBaseButton" class="screen-close" type="button">기지</button>
        </div>
      </div>
      <div class="screen-grid research-grid">
        <div class="research-tree">
          <svg class="research-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            ${RESEARCH_LINKS.map(([from, to]) => {
              const visible = filter === "all" || (visibleIds.has(from) && visibleIds.has(to));
              const linked = visible && (levels[from] || 0) > 0 && isResearchUnlocked(RESEARCH_DEFS.find((def) => def.id === to), levels);
              return `<path class="${linked ? "active" : ""} ${visible ? "" : "filtered-out"}" d="${researchLinkPath(from, to)}"></path>`;
            }).join("")}
          </svg>
          ${RESEARCH_DEFS.map((def) => {
            const level = levels[def.id] || 0;
            const maxed = level >= def.max;
            const locked = !isResearchUnlocked(def, levels);
            const selected = selectedDef?.id === def.id;
            const filteredOut = filter !== "all" && !visibleIds.has(def.id);
            const [x, y] = RESEARCH_LAYOUT[def.id];
            const detailMeta = researchMeta(def.id);
            return `
              <button class="research-node ${selected ? "active" : ""} ${locked ? "locked" : ""} ${maxed ? "maxed" : ""} ${filteredOut ? "filtered-out" : ""}" style="left:${x}%; top:${y}%;" type="button" data-research-pick="${def.id}" data-research-node="${def.id}" aria-pressed="${selected}" aria-label="${detailMeta.name || def.id} ${level}/${def.max}">
                <span class="research-node-inner">
                  <span class="research-icon">${researchIconSvg(def.id)}</span>
                  <span class="research-level">${level}/${def.max}</span>
                </span>
              </button>
            `;
          }).join("")}
        </div>
        ${selectedDef ? (() => {
          const level = levels[selectedDef.id] || 0;
          const maxed = level >= selectedDef.max;
          const cost = researchCost(selectedDef, level);
          const lockReason = researchLockReason(selectedDef, levels);
          const affordable = points >= cost;
          const canBuy = !maxed && !lockReason && affordable;
          const detailMeta = researchMeta(selectedDef.id);
          const displayName = detailMeta.name || selectedDef.name || selectedDef.id;
          const currentEffect = level > 0 ? researchEffectText(selectedDef.id, level) : "현재 효과 없음";
          const nextEffect = maxed ? "최대 단계 연구 완료" : researchEffectText(selectedDef.id, level + 1);
          const researchWarning = lockReason || "";
          return `
            <div class="research-detail ${state.lastResearchPurchased === selectedDef.id && state.lastResearchPulseUntil > Date.now() ? "research-detail-pulse" : ""}">
              <div class="research-detail-head">
                <span class="research-icon large">${researchIconSvg(selectedDef.id)}</span>
                <div>
                  <div class="research-badge-row">
                    <span class="research-category-badge">${researchCategoryName(detailMeta.category)}</span>
                    <span class="research-target-badge">${researchAppliesToText(selectedDef)}</span>
                  </div>
                  <strong>${displayName} ${level}/${selectedDef.max}</strong>
                  <span>${detailMeta.summary || selectedDef.desc || ""}</span>
                </div>
              </div>
              <div class="research-effect-grid">
                <div class="research-effect-card ${state.lastResearchPurchased === selectedDef.id && state.lastResearchPulseUntil > Date.now() ? "research-effect-card-pulse" : ""}">
                  <strong>현재 효과</strong>
                  <span>${currentEffect}</span>
                </div>
                <div class="research-effect-card ${state.lastResearchPurchased === selectedDef.id && state.lastResearchPulseUntil > Date.now() ? "research-effect-card-pulse" : ""}">
                  <strong>다음 단계</strong>
                  <span>${nextEffect}</span>
                </div>
              </div>
              <div class="research-action-row">
                <div class="research-action-main">
                  <button id="buyResearchButton" class="primary ${researchWarning ? "research-warning-button" : ""}" type="button" data-research="${selectedDef.id}" ${canBuy ? "" : "disabled"}>
                    <span class="research-button-main">${maxed ? "연구 완료" : `연구 ${cost}`}</span>
                    ${researchWarning ? `<span class="research-action-warning">${researchWarning}</span>` : ""}
                  </button>
                </div>
              </div>
            </div>
          `;
        })() : ""}
      </div>
    `;
      ui.overlay.querySelector("#backToBaseButton").addEventListener("click", () => getOpenBaseScreen()());
      ui.overlay.querySelectorAll("[data-research-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedResearch = button.dataset.researchPick;
          state.researchFocusTarget = button.dataset.researchRecommend ? "recommend" : "node";
          openResearchScreen();
        });
      });
      ui.overlay.querySelector(".research-tree")?.addEventListener("click", (event) => {
        if (event.target.closest("[data-research-node]")) return;
        state.selectedResearch = null;
        state.researchFocusTarget = "node";
        openResearchScreen();
      });
      ui.overlay.querySelector("#buyResearchButton")?.addEventListener("click", (event) => {
        buyResearch(event.currentTarget.dataset.research);
      });
      ui.overlay.querySelector("#resetResearchButton")?.addEventListener("click", (event) => {
        resetResearchByFilter(event.currentTarget.dataset.researchReset);
      });
      const focusTarget = ui.overlay.querySelector(`[data-research-node="${state.selectedResearch}"]`);
      focusTarget?.focus({ preventScroll: true });
    }

    function buyResearch(id) {
      const def = RESEARCH_DEFS.find((item) => item.id === id);
      if (!def) return;
      const levels = getResearchLevels();
      const level = levels[id] || 0;
      if (level >= def.max) return;
      if (!isResearchUnlocked(def, levels)) return;
      const cost = researchCost(def, level);
      if (researchPoints() < cost) return;
      setResearchPoints(researchPoints() - cost);
      levels[id] = level + 1;
      saveResearchLevels(levels);
      state.researchLevels = levels;
      state.selectedResearch = id;
      state.researchFocusTarget = "node";
      state.lastResearchPurchased = id;
      state.lastResearchPulseUntil = Date.now() + 1800;
      resetStage(state.stageIndex);
      initPyodideWaves();
      openResearchScreen();
    }

    function openBranchScreen(tower, cost) {
      const def = TOWER_DEFS[tower.type];
      const options = BRANCH_DEFS[tower.type] || [];
      state.screen = "branch";
      ui.overlay.classList.add("active");
      ui.overlay.innerHTML = `
      <div class="screen-header">
        <div class="screen-title">
          <span>4단계 최종 강화</span>
          <h2>${def.name}</h2>
        </div>
        <button id="cancelBranchButton" class="screen-close" type="button">취소</button>
      </div>
      <div class="research-list">
        ${options.map((option) => `
          <button class="research-item" type="button" data-branch="${option.id}">
            <span class="research-main">
              <strong>${option.name}</strong>
              <span>${option.desc}</span>
              <span class="branch-detail">${branchDetailText(tower.type, option.id)}</span>
            </span>
            <span class="research-cost">${cost}</span>
          </button>
        `).join("")}
      </div>
    `;
      ui.overlay.querySelector("#cancelBranchButton").addEventListener("click", closeOverlay);
      ui.overlay.querySelectorAll("[data-branch]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!state.towers.includes(tower) || state.alloy < cost) {
            closeOverlay();
            return;
          }
          applyTowerUpgrade(tower, cost, button.dataset.branch);
          closeOverlay();
        });
      });
    }

    function openResultScreen(victory, unlockedDifficultyId = null) {
      state.screen = "result";
      ui.overlay.classList.add("active");
      ui.overlay.innerHTML = `
      <div class="screen-header">
        <div class="screen-title">
          <span>${STAGES[state.stageIndex].name}</span>
          <h2>${victory ? "작전 성공" : "작전 실패"}</h2>
        </div>
      </div>
      <div class="screen-grid">
        <div class="result-card">
          <strong>${victory ? "방어선이 전 구역을 지켜냈습니다." : "코어 방어선이 붕괴했습니다."}</strong>
          <p>${victory ? "전장을 확보했습니다. 연구 점수를 정비하고 다음 구역으로 진격할 수 있습니다." : "돌파를 허용했습니다. 연구와 타워 구성을 조정한 뒤 다시 시도하세요."}</p>
        </div>
        <div class="meta-row">
          <div class="meta-box"><span class="meta-label">처치</span><strong>${state.runKills}</strong></div>
          <div class="meta-box"><span class="meta-label">합금</span><strong>${state.runEarned}</strong></div>
          <div class="meta-box"><span class="meta-label">연구</span><strong>${state.runResearchReward}</strong></div>
        </div>
        <div class="screen-actions">
          <button id="resultRetryButton" type="button">재도전</button>
          <button id="resultBaseButton" class="primary" type="button">기지로</button>
        </div>
      </div>
    `;
      ui.overlay.querySelector("#resultRetryButton").addEventListener("click", () => {
        resetStage(state.stageIndex);
        initPyodideWaves();
        closeOverlay();
      });
      ui.overlay.querySelector("#resultBaseButton").addEventListener("click", () => {
        const next = victory ? Math.min(state.stageIndex + 1, STAGES.length - 1) : state.stageIndex;
        resetStage(next);
        initPyodideWaves();
        getOpenBaseScreen()();
      });
      if (unlockedDifficultyId && window.OrbitDialogs?.showDifficultyUnlock) {
        window.setTimeout(() => consumePendingDifficultyUnlock(), 50);
      }
    }

    function confirmProgressReset() {
      if (window.OrbitDialogs?.confirmNewGame) {
        window.OrbitDialogs.confirmNewGame({
          root: ui.overlay,
          onConfirm: () => {
            ["orbit.cleared", "orbit.stage", "orbit.research", "orbit.researchLevels", "orbit.difficulty", "orbit.difficultyLocked", "orbit.pendingDifficultyUnlock"].forEach((key) => localStorage.removeItem(key));
            difficultyOrder.forEach((difficultyId) => {
              localStorage.removeItem(difficultyProgressKey("cleared", difficultyId));
              localStorage.removeItem(difficultyProgressKey("stage", difficultyId));
            });
            state.difficulty = "easy";
            state.difficultyLocked = false;
            state.stageIndex = 0;
            resetStage(0);
            initPyodideWaves();
            getOpenBaseScreen()();
            playSound("boom");
          },
          playWarning: () => playSound("error"),
        });
      }
    }

    return {
      closeOverlay,
      closeStageInfoModal,
      confirmProgressReset,
      openBranchScreen,
      openResearchScreen,
      openResultScreen,
      openStageInfoModal,
    };
  }

  window.OrbitBattleOverlays = { create: createBattleOverlays };
})();

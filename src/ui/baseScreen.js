(function () {
  "use strict";

  function createBaseScreenController(deps) {
    const {
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
      openResearchScreen,
      confirmProgressReset,
      exportSaveBackup,
      getClearedStages,
      importSaveBackup,
      isDifficultyUnlocked,
      applyDifficultyChoice,
      consumePendingDifficultyUnlock,
    } = deps;

    function unlockRequirementText(id) {
      const difficultyIndex = difficultyOrder.indexOf(id);
      if (difficultyIndex <= 0) return difficultyDescription(id);
      const previousId = difficultyOrder[difficultyIndex - 1];
      const previousLabel = DIFFICULTY_DEFS[previousId]?.label || previousId;
      return `${previousLabel} 마지막 스테이지 클리어 필요`;
    }

    function stageIntel(index) {
      const rule = stageRule(index);
      const tags = [];
      const hpBoosts = Object.entries(rule.hp || {})
        .filter(([, scale]) => scale > 1.05)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type, scale]) => `${typeLabel(type)} 체력 ${Math.round(scale * 100)}%`);
      hpBoosts.forEach((text) => tags.push({ text, tone: "armor" }));
      if ((rule.extraGroups || []).some((group) => group.type === "colossus")) tags.push({ text: "보스 강화", tone: "alert" });
      else if ((rule.extraGroups || []).length) tags.push({ text: `추가 무리 ${rule.extraGroups.length}`, tone: "alert" });
      if ((rule.bossCooldown || 1) < 1) tags.push({ text: "보스 호출 빠름", tone: "alert" });
      return tags.slice(0, 5);
    }

    function typeLabel(type) {
      const labels = {
        lurker: "러커",
        skitter: "스키터",
        brute: "브루트",
        ironclad: "철갑",
        swarming: "스워밍",
        colossus: "콜로서스",
      };
      return labels[type] || type;
    }

    function renderStageTags(index) {
      return stageIntel(index)
        .map((tag) => `<span class="stage-tag ${tag.tone || "default"}">${tag.text}</span>`)
        .join("");
    }

    function openBaseScreen() {
      state.screen = "base";
      const cleared = getClearedStages();
      const research = researchPoints();
      ui.overlay.classList.add("active");
      ui.overlay.innerHTML = `
        <div class="screen-header">
          <div class="screen-title">
            <span>궤도 식민지 작전실</span>
            <h2>기지 지휘</h2>
          </div>
          <div class="screen-header-actions">
            <button id="resetProgressButton" class="screen-header-button" type="button">초기화</button>
            <button id="closeOverlayButton" class="screen-close" type="button">전투로</button>
          </div>
        </div>
        <div class="screen-grid base-grid">
          <div class="meta-row">
            <div class="meta-box"><span class="meta-label">진행</span><strong>${cleared}/${STAGES.length}</strong></div>
            <div class="meta-box"><span class="meta-label">연구</span><strong>${research}</strong></div>
            <div class="meta-box"><span class="meta-label">난이도</span><strong>${DIFFICULTY_DEFS[state.difficulty].label}</strong></div>
          </div>
          <button id="openDifficultyButton" type="button">난이도 변경</button>
          <div class="stage-scroll">
            <div class="stage-list">
              ${STAGES.map((stage, index) => {
                const locked = index > cleared;
                const status = index < cleared ? "확보" : index === cleared ? "출격" : "잠금";
                return `
                  <button class="stage-item" type="button" data-stage="${index}" ${locked ? "disabled" : ""}>
                    <span class="stage-main">
                      <strong>${index + 1}. ${stage.name}</strong>
                      <span>${stageSummary(index)} ${stageRule(index).rule}</span>
                      <span class="stage-tags">${renderStageTags(index)}</span>
                    </span>
                    <span class="stage-badge">${status}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
          <div class="screen-actions">
            <button id="openResearchButton" type="button">연구소</button>
            <button id="resumeBattleButton" class="primary" type="button">현재 전장 시작</button>
          </div>
          <div class="screen-actions backup-actions">
            <button id="exportSaveButton" type="button">백업</button>
            <button id="importSaveButton" type="button">복원</button>
          </div>
        </div>
      `;
      ui.overlay.querySelector("#closeOverlayButton").addEventListener("click", closeOverlay);
      ui.overlay.querySelector("#resumeBattleButton").addEventListener("click", closeOverlay);
      ui.overlay.querySelector("#openResearchButton").addEventListener("click", openResearchScreen);
      ui.overlay.querySelector("#exportSaveButton").addEventListener("click", () => exportSaveBackup());
      ui.overlay.querySelector("#importSaveButton").addEventListener("click", async () => {
        if (await importSaveBackup()) openBaseScreen();
      });
      ui.overlay.querySelector("#resetProgressButton").addEventListener("click", confirmProgressReset);
      ui.overlay.querySelector("#openDifficultyButton").addEventListener("click", openDifficultyPopup);
      ui.overlay.querySelectorAll(".stage-item").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.stage);
          resetStage(index);
          closeOverlay();
        });
      });
      window.setTimeout(() => {
        const focusIndex = Math.min(state.stageIndex, STAGES.length - 1);
        ui.overlay.querySelector(`[data-stage="${focusIndex}"]`)?.scrollIntoView({ block: "nearest" });
      }, 0);
      if (typeof consumePendingDifficultyUnlock === "function") {
        window.setTimeout(() => consumePendingDifficultyUnlock(), 30);
      }
    }

    function openDifficultyPopup() {
      ui.overlay.querySelector(".modal-backdrop")?.remove();
      const modal = document.createElement("div");
      modal.className = "modal-backdrop";
      modal.innerHTML = `
        <div class="modal-panel" role="dialog" aria-modal="true" aria-label="난이도 변경">
          <div class="screen-header">
            <div class="screen-title">
              <span>현재 난이도 ${DIFFICULTY_DEFS[state.difficulty].label}</span>
              <h2>난이도 변경</h2>
            </div>
            <button id="closeDifficultyPopup" class="screen-close" type="button">닫기</button>
          </div>
          <p>난이도를 바꾸면 해당 난이도의 스테이지 진행도로 즉시 전환됩니다. 연구 점수와 연구 단계는 그대로 유지됩니다.</p>
          <div class="difficulty-row">
            ${difficultyOrder.map((id) => {
              const def = DIFFICULTY_DEFS[id];
              const unlocked = isDifficultyUnlocked(id);
              const detail = unlocked ? difficultyDescription(id) : unlockRequirementText(id);
              return `
                <button class="difficulty-button ${state.difficulty === id ? "active" : ""}" type="button" data-difficulty-pick="${id}" ${unlocked ? "" : "disabled"}>
                  <span class="difficulty-main">
                    <strong>${def.label}</strong>
                    <span>${detail}</span>
                  </span>
                  <span class="difficulty-scale">${unlocked ? `체력 ${Math.round(def.hp * 100)}%` : "잠금"}</span>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
      ui.overlay.appendChild(modal);
      modal.querySelector("#closeDifficultyPopup").addEventListener("click", () => modal.remove());
      modal.querySelectorAll("[data-difficulty-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          applyDifficultyChoice(button.dataset.difficultyPick);
        });
      });
    }

    function difficultyDescription(id) {
      if (window.OrbitDifficulties) return window.OrbitDifficulties.describe(id);
      if (id === "easy") return "적 체력 80%";
      if (id === "normal") return "적 체력 100% / 장갑 +1";
      if (id === "hard") return "적 체력 200% / 장갑 +3";
      if (id === "hell") return "적 체력 300% / 장갑 +5";
      if (id === "nightmare") return "적 체력 400% / 장갑 +10";
      return "";
    }

    return {
      openBaseScreen,
      openDifficultyPopup,
      difficultyDescription,
    };
  }

  window.OrbitBaseScreen = {
    create: createBaseScreenController,
  };
})();

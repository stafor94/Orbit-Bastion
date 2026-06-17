(function () {
  "use strict";

  function createBattleHud(deps) {
    const {
      state,
      ui,
      $,
      STAGES,
      DIFFICULTY_DEFS,
      TOWER_DEFS,
      LASER_MAX_FOCUS_HITS,
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
    } = deps;

    function renderIntelTags(target, tags) {
      if (!target) return;
      target.innerHTML = tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("");
    }

    function updateUI() {
      const stage = STAGES[state.stageIndex];
      const difficulty = DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy;
      const waveInfo = waveOverview();
      const liveThreat = liveThreatOverview();
      ui.difficulty.textContent = difficulty.label;
      ui.core.textContent = String(state.core);
      ui.alloy.textContent = String(Math.floor(state.alloy));
      ui.wave.textContent = `${Math.min(state.waveIndex + 1, state.waves.length)}/${state.waves.length || stage.waves}`;
      ui.stage.textContent = `${state.stageIndex + 1}. ${stage.name}`;
      if (ui.waveSummary) ui.waveSummary.textContent = state.waveActive ? `${waveInfo.summary} / 교전 중` : waveInfo.summary;
      renderIntelTags(ui.waveGroups, waveInfo.groups.length ? waveInfo.groups : [{ text: "적 정보 없음", tone: "default" }]);
      if (ui.threatSummary) ui.threatSummary.textContent = liveThreat ? liveThreat.summary : waveInfo.threat.summary;
      renderIntelTags(ui.threatTags, liveThreat ? liveThreat.tags : waveInfo.threat.tags);
      ui.start.disabled = state.waveActive || state.gameOver || state.victory;
      ui.start.textContent = state.victory ? "확보 완료" : state.waveActive ? "교전 중" : "웨이브 시작";
      ui.speed.textContent = `${state.speed}x`;

      const selectedEmptySlot = state.selectedSlot >= 0 && state.slots[state.selectedSlot] && !state.slots[state.selectedSlot].tower;
      const tower = selectedTower();
      const showSelectedCard = Boolean(tower || selectedEmptySlot || state.victory || state.gameOver);
      ui.selectedCard.classList.toggle("hidden", !showSelectedCard);
      ui.towerBar.classList.toggle("hidden", !selectedEmptySlot);

      document.querySelectorAll(".tower-card").forEach((el) => {
        el.classList.toggle("selected", el.dataset.type === state.selectedTowerType);
        updateTowerCardPreview(el);
      });

      if (tower) {
        const def = TOWER_DEFS[tower.type];
        const slot = state.slots[tower.slotIndex];
        const nextCost = towerUpgradeCost(tower);
        const branch = branchName(tower.type, tower.branch);
        ui.selectedLabel.textContent = `${tower.level}단계${branch ? ` / ${branch}` : ""} / 처치 ${tower.kills}`;
        ui.selectedName.textContent = def.name;
        ui.selectedStats.innerHTML = selectedStatsHtml(def.role, towerStatsText(tower.type, tower.level, slot, tower.branch));
        ui.selectedDetails.innerHTML = towerDetailHtml(tower.type, tower.level, slot, tower.branch, tower) + slotEffectDetailHtml(slot);
        ui.upgrade.disabled = tower.level >= 4 || state.alloy < nextCost;
        ui.upgrade.textContent = tower.level >= 4 ? "최대" : `강화 ${nextCost}`;
        ui.sell.disabled = false;
        ui.sell.textContent = `판매 ${towerSellValue(tower)}`;
      } else if (selectedEmptySlot) {
        const slot = state.slots[state.selectedSlot];
        const kind = slotKindDef(slot.kind);
        const selectedType = state.selectedTowerType;
        if (selectedType) {
          const def = TOWER_DEFS[selectedType];
          const buildCost = towerBuildCost(selectedType);
          ui.selectedLabel.textContent = "건설 준비";
          ui.selectedName.textContent = def.name;
          ui.selectedStats.innerHTML = state.selectedTowerInfoVisible
            ? selectedStatsHtml(def.role, towerStatsText(selectedType, 1, slot))
            : selectedStatsHtml(def.role, "아래 버튼을 다시 누르면 바로 건설합니다.");
          ui.selectedDetails.innerHTML = state.selectedTowerInfoVisible
            ? towerDetailHtml(selectedType, 1, slot) + slotEffectDetailHtml(slot)
            : slotEffectDetailHtml(slot);
          ui.upgrade.disabled = state.alloy < buildCost;
          ui.upgrade.textContent = `건설 ${buildCost}`;
        } else {
          ui.selectedLabel.textContent = "배치 후보";
          ui.selectedName.textContent = `${kind.name} 슬롯 - 구매할 타워를 선택하세요.`;
          ui.selectedStats.innerHTML = selectedStatsHtml("아래 타워 버튼을 눌러 성능을 보고 건설할 수 있습니다.");
          ui.selectedDetails.innerHTML = slotEffectDetailHtml(slot);
          ui.upgrade.disabled = true;
          ui.upgrade.textContent = "건설";
        }
        ui.sell.disabled = true;
        ui.sell.textContent = "판매";
      } else {
        ui.selectedLabel.textContent = state.victory ? "임무 완료" : state.gameOver ? "임무 실패" : "선택 없음";
        ui.selectedName.textContent = state.victory ? "다음 전장으로 이동할 수 있습니다." : state.gameOver ? "방어망을 다시 정비하세요." : "타워 또는 슬롯을 선택하세요.";
        ui.selectedStats.innerHTML = "";
        ui.selectedDetails.innerHTML = "";
        ui.upgrade.disabled = true;
        ui.upgrade.textContent = "강화";
        ui.sell.disabled = true;
        ui.sell.textContent = "판매";
      }
    }

    function updateSelectedLiveMetric() {
      const tower = selectedTower();
      if (!tower || tower.type !== "laser") return;
      const live = $("selectedLiveMetric");
      if (!live) return;
      const multiplier = laserFocusMultiplier(tower.laserFocus);
      const hits = laserFocusHits(tower.laserFocus);
      live.textContent = tower.laserTarget
        ? `집중 ${hits}/${LASER_MAX_FOCUS_HITS} / 피해 x${multiplier.toFixed(1)}`
        : tower.laserRetargetTimer > 0
          ? `재조준 ${tower.laserRetargetTimer.toFixed(1)}s`
          : "표적 탐색";
    }

    function updateSoundButton() {
      const label = state.muted ? "음소거 해제" : "소리 끄기";
      ui.sound.textContent = "";
      ui.sound.classList.toggle("muted", state.muted);
      ui.sound.setAttribute("aria-label", label);
      ui.sound.setAttribute("title", label);
    }

    function updateAutoWaveButton() {
      ui.autoWave.textContent = state.autoWave ? "자동" : "수동";
      ui.autoWave.classList.toggle("primary", state.autoWave);
    }

    function hideBanner() {
      ui.banner.classList.add("hidden");
    }

    function showBanner(title, text, duration = 0) {
      window.clearTimeout(showBanner.timer);
      ui.banner.querySelector("strong").textContent = title;
      ui.banner.querySelector("span").textContent = text;
      ui.banner.classList.remove("hidden");
      if (duration > 0) {
        showBanner.timer = window.setTimeout(() => {
          hideBanner();
        }, duration);
      }
    }

    function floatingText(x, y, text, color) {
      const el = document.createElement("span");
      el.className = "float-text";
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.color = color;
      ui.floatLayer.appendChild(el);
      setTimeout(() => el.remove(), 850);
    }

    return {
      floatingText,
      hideBanner,
      renderIntelTags,
      showBanner,
      updateAutoWaveButton,
      updateSelectedLiveMetric,
      updateSoundButton,
      updateUI,
    };
  }

  window.OrbitBattleHud = { create: createBattleHud };
})();

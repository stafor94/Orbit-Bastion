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
    } = deps;

    function renderIntelTags(target, tags) {
      if (!target) return;
      target.innerHTML = tags.map((tag) => `<span class="intel-tag ${tag.tone || "default"}">${tag.text}</span>`).join("");
    }

    function announce(message) {
      if (!ui.a11yStatus || !message || state.lastA11yMessage === message) return;
      state.lastA11yMessage = message;
      ui.a11yStatus.textContent = message;
    }

    function updateUI() {
      const stage = STAGES[state.stageIndex];
      const difficulty = DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy;
      const waveInfo = waveOverview();
      const liveThreat = liveThreatOverview();
      ui.difficulty.textContent = difficulty.label;
      ui.core.textContent = String(state.core);
      if (ui.coreShield) {
        const hasShield = state.coreShieldMax > 0;
        ui.coreShield.textContent = hasShield ? `쉴드 ${state.coreShield}/${state.coreShieldMax}` : "쉴드 0/0";
        ui.coreShield.classList.toggle("hidden", !hasShield);
      }
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
      const tacticalUse = (skill) => Math.max(0, state.tacticalUses?.[skill] || 0);
      const tacticalMax = (skill) => Math.max(0, state.tacticalMaxUses?.[skill] || 0);
      if (ui.tacticalUses) ui.tacticalUses.textContent = `전술 ${Object.keys(state.tacticalMaxUses || {}).map((skill) => tacticalUse(skill)).join("/")}`;
      const tacticalDisabled = state.gameOver || state.victory;
      const tacticalCooldown = (skill) => Math.ceil(state.tacticalCooldowns?.[skill] || 0);
      if (ui.stasisSkill) {
        const cooldown = tacticalCooldown("stasis");
        const uses = tacticalUse("stasis");
        ui.stasisSkill.disabled = tacticalDisabled || cooldown > 0 || uses <= 0;
        ui.stasisSkill.classList.toggle("primary", state.selectedTacticalSkill === "stasis");
        ui.stasisSkill.textContent = cooldown > 0 ? `정지장 ${cooldown}s` : state.selectedTacticalSkill === "stasis" ? "위치 선택" : `정지장 ${uses}/${tacticalMax("stasis")}`;
      }
      if (ui.overchargeSkill) {
        const cooldown = tacticalCooldown("overcharge");
        const uses = tacticalUse("overcharge");
        ui.overchargeSkill.disabled = tacticalDisabled || state.overchargeTimer > 0 || cooldown > 0 || uses <= 0;
        ui.overchargeSkill.classList.toggle("primary", state.overchargeTimer > 0);
        ui.overchargeSkill.textContent = state.overchargeTimer > 0 ? `과충전 ${Math.ceil(state.overchargeTimer)}s` : cooldown > 0 ? `과충전 ${cooldown}s` : `과충전 ${uses}/${tacticalMax("overcharge")}`;
      }
      if (ui.empSkill) {
        const cooldown = tacticalCooldown("emp");
        const uses = tacticalUse("emp");
        ui.empSkill.disabled = tacticalDisabled || state.enemies.length === 0 || cooldown > 0 || uses <= 0;
        ui.empSkill.textContent = cooldown > 0 ? `EMP ${cooldown}s` : `EMP ${uses}/${tacticalMax("emp")}`;
      }

      const selectedEmptySlot = state.selectedSlot >= 0 && state.slots[state.selectedSlot] && !state.slots[state.selectedSlot].tower;
      const tower = selectedTower();
      const showSelectedCard = Boolean(tower || selectedEmptySlot || state.victory || state.gameOver);
      ui.selectedCard.classList.toggle("hidden", !showSelectedCard);
      ui.towerBar.classList.toggle("hidden", !selectedEmptySlot);

      document.querySelectorAll(".tower-card").forEach((el) => {
        const selected = el.dataset.type === state.selectedTowerType;
        el.classList.toggle("selected", selected);
        el.setAttribute("aria-pressed", selected ? "true" : "false");
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
        ui.upgrade.setAttribute("aria-label", tower.level >= 4 ? `${def.name} 최대 강화` : `${def.name} 강화 비용 ${nextCost}`);
        ui.sell.disabled = false;
        ui.sell.textContent = `판매 ${towerSellValue(tower)}`;
        ui.sell.setAttribute("aria-label", `${def.name} 판매, 회수 합금 ${towerSellValue(tower)}`);
        ui.selectedCard.setAttribute("aria-label", `${def.name} 선택됨. ${ui.selectedLabel.textContent}`);
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
          ui.upgrade.setAttribute("aria-label", `${def.name} 건설 비용 ${buildCost}`);
          ui.selectedCard.setAttribute("aria-label", `${kind.name} 슬롯에 ${def.name} 건설 준비`);
        } else {
          ui.selectedLabel.textContent = "배치 후보";
          ui.selectedName.textContent = `${kind.name} 슬롯 - 구매할 타워를 선택하세요.`;
          ui.selectedStats.innerHTML = selectedStatsHtml("아래 타워 버튼을 눌러 성능을 보고 건설할 수 있습니다.");
          ui.selectedDetails.innerHTML = slotEffectDetailHtml(slot);
          ui.upgrade.disabled = true;
          ui.upgrade.textContent = "건설";
          ui.upgrade.setAttribute("aria-label", "건설할 타워를 먼저 선택하세요");
          ui.selectedCard.setAttribute("aria-label", `${kind.name} 슬롯 선택됨. 구매할 타워를 선택하세요.`);
        }
        ui.sell.disabled = true;
        ui.sell.textContent = "판매";
        ui.sell.setAttribute("aria-label", "판매할 타워가 없습니다");
      } else {
        ui.selectedLabel.textContent = state.victory ? "임무 완료" : state.gameOver ? "임무 실패" : "선택 없음";
        ui.selectedName.textContent = state.victory ? "다음 전장으로 이동할 수 있습니다." : state.gameOver ? "방어망을 다시 정비하세요." : "타워 또는 슬롯을 선택하세요.";
        ui.selectedStats.innerHTML = "";
        ui.selectedDetails.innerHTML = "";
        ui.upgrade.disabled = true;
        ui.upgrade.textContent = "강화";
        ui.upgrade.setAttribute("aria-label", "강화할 타워가 없습니다");
        ui.sell.disabled = true;
        ui.sell.textContent = "판매";
        ui.sell.setAttribute("aria-label", "판매할 타워가 없습니다");
        ui.selectedCard.setAttribute("aria-label", ui.selectedName.textContent);
      }

      if (tower || selectedEmptySlot || state.victory || state.gameOver) {
        announce(`${ui.selectedLabel.textContent}. ${ui.selectedName.textContent}`);
      }
    }

    function updateSelectedLiveMetric() {
      const tower = selectedTower();
      if (!tower || tower.type !== "laser") return;
      const live = $("selectedLiveMetric");
      if (!live) return;
      const multiplier = laserFocusMultiplier(tower.laserFocus, tower.branch);
      const hits = laserFocusHits(tower.laserFocus, tower.branch);
      live.textContent = tower.laserTarget
        ? `집중 ${hits}/${laserMaxFocusHits(tower.branch)} / 피해 x${multiplier.toFixed(1)}`
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
      announce(`${title}. ${text}`);
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

    function showToast(message, tone = "warning") {
      if (!ui.floatLayer || !message) return;
      ui.floatLayer.querySelector(".toast-message")?.remove();
      const el = document.createElement("span");
      el.className = `toast-message ${tone}`;
      el.textContent = message;
      ui.floatLayer.appendChild(el);
      announce(message);
      setTimeout(() => el.remove(), 1800);
    }

    return {
      floatingText,
      hideBanner,
      renderIntelTags,
      showBanner,
      showToast,
      updateAutoWaveButton,
      updateSelectedLiveMetric,
      updateSoundButton,
      updateUI,
    };
  }

  window.OrbitBattleHud = { create: createBattleHud };
})();

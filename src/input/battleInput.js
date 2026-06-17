(function () {
  "use strict";

  function createBattleInput(deps) {
    const {
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
    } = deps;

    function canvasPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches ? event.touches[0] : event;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function isCoarsePointer(event = null) {
      return event?.pointerType === "touch" || window.matchMedia?.("(pointer: coarse)")?.matches;
    }

    function nearestSlotInfo(point) {
      let nearest = -1;
      let best = Infinity;
      state.slots.forEach((slot, index) => {
        const distance = dist(point, slot);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      return { nearest, distance: best };
    }

    function handleCanvasTap(event) {
      event.preventDefault();
      const p = canvasPoint(event);
      const coarse = isCoarsePointer(event);
      const pickupRadius = coarse ? 46 : 34;
      const forgivenessRadius = coarse ? 62 : 44;
      const { nearest, distance } = nearestSlotInfo(p);
      if (distance <= pickupRadius && nearest >= 0) {
        if (state.slots[nearest].tower) {
          state.selectedSlot = nearest;
          state.selectedTowerType = null;
          state.selectedTowerInfoVisible = false;
          state.towerBarUnlockAt = 0;
        } else {
          const repeatedTap = state.selectedSlot === nearest && state.lastTappedSlot === nearest && performance.now() - state.lastTapAt < 520;
          state.selectedSlot = nearest;
          state.selectedTowerType = null;
          state.selectedTowerInfoVisible = false;
          state.towerBarUnlockAt = repeatedTap ? 0 : performance.now() + (coarse ? 120 : 220);
        }
        state.lastTappedSlot = nearest;
        state.lastTapAt = performance.now();
        updateUI();
      } else if (state.selectedSlot >= 0 && dist(p, state.slots[state.selectedSlot]) <= forgivenessRadius) {
        state.towerBarUnlockAt = 0;
        updateUI();
      } else if (state.selectedSlot >= 0 || state.selectedTowerType) {
        state.selectedSlot = -1;
        state.selectedTowerType = null;
        state.selectedTowerInfoVisible = false;
        state.towerBarUnlockAt = 0;
        state.lastTappedSlot = -1;
        updateUI();
      }
    }

    function handlePrimaryAction() {
      if (selectedTower()) {
        upgradeSelected();
        return;
      }
      buildSelectedTower();
    }

    function wireEvents() {
      let layoutResizeObserver = null;
      window.addEventListener("resize", resize);
      if (window.ResizeObserver) {
        layoutResizeObserver = new ResizeObserver(() => resize());
        layoutResizeObserver.observe(canvas.parentElement);
      }
      window.addEventListener("pointerdown", ensureAudio, { once: true });
      canvas.addEventListener("pointerdown", handleCanvasTap);
      ui.start.addEventListener("click", startWave);
      ui.upgrade.addEventListener("click", handlePrimaryAction);
      ui.sell.addEventListener("click", sellSelected);
      ui.stageInfo.addEventListener("click", () => {
        playSound("click");
        openStageInfoModal();
      });
      ui.speed.addEventListener("click", () => {
        playSound("click");
        state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
        updateUI();
      });
      ui.autoWave.addEventListener("click", () => {
        playSound("click");
        state.autoWave = !state.autoWave;
        localStorage.setItem("orbit.autoWave", state.autoWave ? "1" : "0");
        updateAutoWaveButton();
        if (state.autoWave && state.screen === "battle" && !state.waveActive) scheduleAutoWave();
      });
      ui.sound.addEventListener("click", () => {
        state.muted = !state.muted;
        localStorage.setItem("orbit.muted", state.muted ? "1" : "0");
        updateSoundButton();
        if (!state.muted) playSound("click");
      });
      ui.base.addEventListener("click", () => {
        playSound("click");
        openBaseScreen();
      });
      ui.reset.addEventListener("click", () => {
        playSound("click");
        const next = state.victory ? Math.min(state.stageIndex + 1, STAGES.length - 1) : state.stageIndex;
        resetStage(next);
        closeOverlay();
      });
      return layoutResizeObserver;
    }

    return {
      handlePrimaryAction,
      handleCanvasTap,
      wireEvents,
    };
  }

  window.OrbitBattleInput = { create: createBattleInput };
})();

(function () {
  "use strict";

  function createTowerRenderer(deps) {
    const {
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
    } = deps;

    function roundedRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawTowerRanges() {
      const tower = selectedTower();
      const previewSlot = state.selectedSlot >= 0 ? state.slots[state.selectedSlot] : null;
      const previewType = !tower && previewSlot && !previewSlot.tower ? state.selectedTowerType : null;
      if (!tower && !previewType) return;
      const slot = tower ? state.slots[tower.slotIndex] : previewSlot;
      const type = tower ? tower.type : previewType;
      const level = tower ? tower.level : 1;
      const branch = tower ? tower.branch : null;
      const def = TOWER_DEFS[type];
      const research = currentResearchLevels();
      const range = towerBaseRange(type, def, level, branch) * slotBonuses(slot).range * (1 + (research.range || 0) * 0.04);
      ctx.save();
      ctx.globalAlpha = type === "cryo" ? (tower ? 0.07 : 0.05) : (tower ? 0.13 : 0.1);
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = type === "cryo" ? (tower ? 0.22 : 0.16) : (tower ? 0.48 : 0.36);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = tower ? 1.5 : 1.3;
      if (!tower || type === "beacon") ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();

      if (tower?.type === "beacon") {
        ctx.save();
        for (const ally of beaconAffectedTowers(tower)) {
          const allySlot = state.slots[ally.slotIndex];
          ctx.strokeStyle = "#ffe08a";
          ctx.fillStyle = "rgba(255, 207, 106, 0.1)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(allySlot.x, allySlot.y, 29, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawTowers() {
      const selected = selectedTower();
      for (const tower of state.towers) {
        const slot = state.slots[tower.slotIndex];
        const def = TOWER_DEFS[tower.type];
        ctx.save();
        ctx.translate(slot.x, slot.y);
        if (tower.type === "cryo") {
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          hexPath(0, 0, 20);
          ctx.stroke();
          ctx.restore();
        } else if (tower.type === "beacon") {
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          hexPath(0, 0, 23);
          ctx.stroke();
          ctx.restore();
        } else {
          drawHex(0, 0, 23, def.color, 0.25);
        }
        ctx.fillStyle = tower.type === "cryo" ? "rgba(9, 13, 20, 0.96)" : "#161c29";
        ctx.beginPath();
        hexPath(0, 0, 17);
        ctx.fill();
        ctx.rotate(tower.angle);
        const recoil = tower.recoil * 5;
        if (tower.type === "pulse") drawPulseTower(def.color, recoil, tower.level);
        if (tower.type === "laser") drawLaserTower(def.color, recoil, tower.level);
        if (tower.type === "plasma") drawPlasmaTower(def.color, recoil, tower.level);
        if (tower.type === "cryo") drawCryoTower(def.color, state.time, tower.level);
        if (tower.type === "arc") drawArcTower(def.color, state.time, recoil, tower.level);
        if (tower.type === "rail") drawRailTower(def.color, recoil, tower.level);
        if (tower.type === "gravity") drawGravityTower(def.color, state.time, recoil, tower.level);
        if (tower.type === "beacon") drawBeaconTower(def.color, state.time, recoil, tower.level);
        ctx.restore();
        if (tower === selected && tower.type === "laser") drawLaserFocusGauge(tower, slot, def.color);
      }
    }

    function drawBeaconLinks() {
      const beacons = state.towers.filter((tower) => tower.type === "beacon");
      if (!beacons.length) return;
      ctx.save();
      for (const tower of beacons) {
        const slot = state.slots[tower.slotIndex];
        if (!slot) continue;
        const alpha = 0.18 + Math.sin(state.time * 3.2 + tower.slotIndex) * 0.03;
        for (const ally of beaconAffectedTowers(tower)) {
          const allySlot = state.slots[ally.slotIndex];
          if (!allySlot) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = tower.branch === "overclock" ? "#ffd47c" : "#ffe08a";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(slot.x, slot.y);
          ctx.lineTo(allySlot.x, allySlot.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawLaserFocusGauge(tower, slot, color) {
      const ratio = laserFocusRatio(tower.laserFocus);
      const width = 42;
      const x = slot.x - width / 2;
      const y = slot.y - 35;
      ctx.save();
      ctx.fillStyle = "rgba(5, 8, 14, 0.88)";
      roundedRect(x, y, width, 6, 3);
      ctx.fill();
      if (ratio > 0) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
        roundedRect(x + 1, y + 1, (width - 2) * ratio, 4, 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPulseTower(color, recoil, level) {
      ctx.fillStyle = "#222a3a";
      roundedRect(-10, -10, 20, 20, 4);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillRect(1 - recoil, -4, 21, 8);
      ctx.fillStyle = "#dff7ff";
      ctx.fillRect(12 - recoil, -2, 7, 4);
      drawLevelPips(level, color);
    }

    function drawLaserTower(color, recoil, level) {
      ctx.fillStyle = "#2a2024";
      roundedRect(-9, -12, 18, 24, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(24 - recoil, 0);
      ctx.lineTo(0, 8);
      ctx.stroke();
      drawLevelPips(level, color);
    }

    function drawPlasmaTower(color, recoil, level) {
      ctx.fillStyle = "#211d2e";
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(10 - recoil, 0, 11, -0.9, 0.9);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(5, 0, 4 + Math.sin(state.time * 8) * 1.2, 0, Math.PI * 2);
      ctx.fill();
      drawLevelPips(level, color);
    }

    function drawCryoTower(color, time, level) {
      ctx.rotate(Math.PI / 6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(8.5, 0);
        ctx.lineTo(6.4, 2.4);
        ctx.moveTo(8.5, 0);
        ctx.lineTo(6.4, -2.4);
        ctx.stroke();
      }
      ctx.save();
      ctx.rotate(-time * 0.5);
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      hexPath(0, 0, 10.5);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.rotate(time * 0.95);
      ctx.globalAlpha = 0.34;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(1.6, 0);
        ctx.lineTo(5.4, 0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 2; i++) {
        const angle = time * (0.85 + i * 0.35) + i * Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 4.7, Math.sin(angle) * 4.7, 0.95, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawLevelPips(level, color);
    }

    function drawArcTower(color, time, recoil, level) {
      ctx.fillStyle = "#2d2416";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(time * 1.6 + i * (Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(9, -6);
        ctx.lineTo(16 - recoil * 0.3, 0);
        ctx.lineTo(9, 6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#fff6d8";
      ctx.beginPath();
      ctx.arc(0, 0, 3.8 + Math.sin(time * 10) * 0.7, 0, Math.PI * 2);
      ctx.fill();
      drawLevelPips(level, color);
    }

    function drawRailTower(color, recoil, level) {
      ctx.fillStyle = "#18251d";
      roundedRect(-12, -9, 20, 18, 4);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(20 - recoil, -1.5);
      ctx.lineTo(20 - recoil, 1.5);
      ctx.lineTo(-5, 4);
      ctx.stroke();
      ctx.fillStyle = "#ebfff0";
      ctx.fillRect(10 - recoil, -1.5, 8, 3);
      drawLevelPips(level, color);
    }

    function drawGravityTower(color, time, recoil, level) {
      ctx.fillStyle = "#162720";
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 13;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 7 + i * 5 + Math.sin(time * 5 + i) * 1.4 - recoil * 0.18, 0.4 + i, Math.PI * 1.55 + i);
        ctx.stroke();
      }
      ctx.fillStyle = "#eafffb";
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      drawLevelPips(level, color);
    }

    function drawBeaconTower(color, time, recoil, level) {
      ctx.fillStyle = "#2b2417";
      roundedRect(-9, -11, 18, 22, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 10);
      ctx.moveTo(-8, -4);
      ctx.lineTo(0, -11 - recoil * 0.15);
      ctx.lineTo(8, -4);
      ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.beginPath();
      ctx.moveTo(-5, 2 + Math.sin(time * 1.4) * 1.2);
      ctx.lineTo(5, 2 + Math.sin(time * 1.4) * 1.2);
      ctx.moveTo(-4, 6 + Math.sin(time * 1.4 + 1.2) * 1.1);
      ctx.lineTo(4, 6 + Math.sin(time * 1.4 + 1.2) * 1.1);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.arc(0, -11, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.rotate(time * 1.1);
      ctx.globalAlpha = 0.34;
      ctx.beginPath();
      ctx.moveTo(0, -14.5);
      ctx.lineTo(0, -7.5);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.46;
      const signalY = -11 + Math.sin(time * 1.8) * 1.1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, signalY, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      drawLevelPips(level, color);
    }

    function drawLevelPips(level, color) {
      ctx.save();
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx.restore();
      ctx.fillStyle = color;
      for (let i = 0; i < level; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 8, 17, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return {
      drawBeaconLinks,
      drawTowerRanges,
      drawTowers,
    };
  }

  window.OrbitTowerRenderer = {
    create: createTowerRenderer,
  };
})();

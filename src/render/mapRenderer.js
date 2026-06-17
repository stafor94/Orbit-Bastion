(function () {
  "use strict";

  function createMapRenderer(deps) {
    const { ctx, state, slotKindDef } = deps;

  function drawBackground() {
    const w = state.width;
    const h = state.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#101525");
    g.addColorStop(0.48, "#090c14");
    g.addColorStop(1, "#111018");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.42;
    for (let y = 18; y < h; y += 44) {
      for (let x = -20; x < w; x += 64) {
        ctx.strokeStyle = "rgba(120, 143, 172, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + ((y / 44) % 2) * 18, y, 52, 34);
      }
    }
    ctx.restore();

    for (let i = 0; i < 18; i++) {
      const x = ((i * 73) % (w + 80)) - 40;
      const y = ((i * 121) % (h + 90)) - 45;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(255,94,108,0.16)" : "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 15 + (i % 4) * 9, y + 8);
      ctx.lineTo(x + 8, y + 22 + (i % 5) * 4);
      ctx.stroke();
    }
  }

  function drawPath() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255,94,108,0.12)";
    ctx.strokeStyle = "rgba(8, 6, 8, 0.92)";
    ctx.lineWidth = 44;
    strokePath();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(89, 41, 48, 0.72)";
    ctx.lineWidth = 34;
    strokePath();
    ctx.strokeStyle = "rgba(28, 18, 24, 0.82)";
    ctx.lineWidth = 22;
    strokePath();

    ctx.setLineDash([12, 15]);
    ctx.strokeStyle = "rgba(255, 107, 117, 0.22)";
    ctx.lineWidth = 2;
    strokePath();
    ctx.setLineDash([]);
  }

  function strokePath() {
    ctx.beginPath();
    state.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }

  function drawSlots() {
    state.slots.forEach((slot, i) => {
      const selected = state.selectedSlot === i;
      const deployable = state.selectedTowerType && !slot.tower;
      const kind = slotKindDef(slot.kind);
      const pulse = slot.pulse;
      const calmSelection = selected && ((slot.tower && (slot.tower.type === "cryo" || slot.tower.type === "beacon")) || (!slot.tower && (state.selectedTowerType === "cryo" || state.selectedTowerType === "beacon")));
      ctx.save();
      ctx.translate(slot.x, slot.y);
      drawHex(0, 0, 20 + pulse * 3.5, selected ? "#b7ff39" : deployable ? kind.color : kind.color, selected ? 0.9 : 0.28 + pulse * 0.22);
      if (selected) {
        ctx.strokeStyle = "#d7ff64";
        ctx.shadowColor = "#b7ff39";
        ctx.shadowBlur = calmSelection ? 0 : 24;
        ctx.lineWidth = calmSelection ? 2 : 4;
        ctx.globalAlpha = calmSelection ? 0.35 : 1;
        ctx.beginPath();
        hexPath(0, 0, calmSelection ? 24 : 26 + Math.sin(state.time * 9) * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = slot.tower ? "rgba(15, 20, 31, 0.86)" : "rgba(5, 8, 14, 0.62)";
      ctx.beginPath();
      hexPath(0, 0, 16);
      ctx.fill();
      const suppressCoreGlow = slot.tower && (slot.tower.type === "cryo" || slot.tower.type === "beacon");
      if (slot.kind !== "standard") {
        ctx.fillStyle = kind.color;
        ctx.shadowColor = kind.color;
        ctx.shadowBlur = suppressCoreGlow ? 0 : 9;
        ctx.globalAlpha = suppressCoreGlow ? 0.32 : 1;
        ctx.beginPath();
        ctx.arc(0, 0, suppressCoreGlow ? 2.2 : 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }


  function drawCore() {
    const end = state.path[state.path.length - 1];
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.shadowColor = state.core > 6 ? "#46ffd2" : "#ff5e6c";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = state.core > 6 ? "#46ffd2" : "#ff5e6c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHex(x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    ctx.lineWidth = 2;
    ctx.beginPath();
    hexPath(x, y, r);
    ctx.stroke();
    ctx.restore();
  }

  function hexPath(x, y, r) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }


    return {
      drawBackground,
      drawPath,
      drawSlots,
      drawCore,
      drawHex,
      hexPath,
    };
  }

  window.OrbitMapRenderer = {
    create: createMapRenderer,
  };
})();

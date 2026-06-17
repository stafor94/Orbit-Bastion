(function () {
  "use strict";

  function createEnemyRenderer(deps) {
    let { ctx } = deps;
    const { state, ENEMY_DEFS, enemyArmorValue } = deps;

    function drawEnemies() {
      const ordered = state.enemyRenderOrder.length ? state.enemyRenderOrder : state.enemies;
      for (const enemy of ordered) {
        const def = ENEMY_DEFS[enemy.type];
        const hpT = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(0, enemy.radius * 0.7, enemy.radius * 1.15, enemy.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (enemy.type === "colossus") drawColossus(enemy, def, hpT);
        else if (enemy.type === "broodcocoon") drawBroodCocoon(enemy, def, hpT);
        else drawAlien(enemy, def, hpT);

        if (enemy.slowTimer > 0) {
          ctx.strokeStyle = "rgba(125,233,255,0.34)";
          ctx.lineWidth = 1.2;
          ctx.shadowColor = "#7de9ff";
          ctx.shadowBlur = 2;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        if (enemy.markedTimer > 0) {
          ctx.strokeStyle = "rgba(125,255,139,0.9)";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "#7dff8b";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-enemy.radius - 2, 0);
          ctx.lineTo(enemy.radius + 2, 0);
          ctx.moveTo(0, -enemy.radius - 2);
          ctx.lineTo(0, enemy.radius + 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        const armor = enemyArmorValue(def);
        if (armor > 0) {
          ctx.fillStyle = "rgba(220, 235, 255, 0.76)";
          for (let i = 0; i < Math.min(4, armor); i++) {
            ctx.fillRect(-enemy.radius + 3 + i * 6, enemy.radius + 5, 4, 3);
          }
        }

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(-enemy.radius, -enemy.radius - 11, enemy.radius * 2, 4);
        ctx.fillStyle = hpT > 0.35 ? "#7dff8b" : "#ff5e6c";
        ctx.fillRect(-enemy.radius, -enemy.radius - 11, enemy.radius * 2 * hpT, 4);
        drawEnemyBadges(enemy, def);
        ctx.restore();
      }
    }

    function renderEnemyThumbnail(canvas, type) {
      const def = ENEMY_DEFS[type];
      if (!canvas || !def) return;
      const tempCtx = canvas.getContext("2d");
      if (!tempCtx) return;
      const previousCtx = ctx;
      ctx = tempCtx;
      const size = Math.min(canvas.width || 48, canvas.height || 48);
      const radius = Math.max(8, Math.min(18, Math.round((def.radius || 12) * 0.82)));
      const enemy = {
        type,
        radius,
        x: size / 2,
        y: size / 2,
        hp: 1,
        maxHp: 1,
        phase: 1.25,
        slowTimer: 0,
        markedTimer: 0,
        fracturedTimer: 0,
        stunTimer: 0,
      };
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.shadowColor = "rgba(0,0,0,0.72)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath();
      ctx.ellipse(0, enemy.radius * 0.7, enemy.radius * 1.15, enemy.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (enemy.type === "colossus") drawColossus(enemy, def, 1);
      else if (enemy.type === "broodcocoon") drawBroodCocoon(enemy, def, 1);
      else drawAlien(enemy, def, 1);
      const armor = enemyArmorValue(def);
      if (armor > 0) {
        ctx.fillStyle = "rgba(220, 235, 255, 0.76)";
        for (let i = 0; i < Math.min(4, armor); i++) {
          ctx.fillRect(-enemy.radius + 3 + i * 6, enemy.radius + 5, 4, 3);
        }
      }
      ctx.restore();
      ctx = previousCtx;
    }

    function drawEnemyBadges(enemy, def) {
      const badges = [];
      if (def.boss) badges.push({ text: "BOSS", fill: "rgba(255, 94, 108, 0.2)", stroke: "rgba(255, 94, 108, 0.55)", color: "#ffd0d4" });
      if (enemyArmorValue(def) > 0) badges.push({ text: `장갑 ${enemyArmorValue(def)}`, fill: "rgba(214, 231, 255, 0.16)", stroke: "rgba(198, 221, 255, 0.45)", color: "#e6f0ff" });
      if ((enemy.stunTimer || 0) > 0.01) badges.push({ text: "기절", fill: "rgba(255, 200, 90, 0.16)", stroke: "rgba(255, 200, 90, 0.48)", color: "#ffd27a" });
      else if (enemy.slowTimer > 0) badges.push({ text: "감속", fill: "rgba(125, 233, 255, 0.16)", stroke: "rgba(125, 233, 255, 0.45)", color: "#baf4ff" });
      if (enemy.markedTimer > 0) badges.push({ text: "표식", fill: "rgba(125, 255, 139, 0.16)", stroke: "rgba(125, 255, 139, 0.45)", color: "#c9ffd1" });
      if (enemy.enraged) badges.push({ text: "광폭", fill: "rgba(223, 255, 98, 0.16)", stroke: "rgba(223, 255, 98, 0.45)", color: "#efffa6" });
      if (enemy.guardedTimer > 0) badges.push({ text: `방호 +${enemy.guardArmor || 0}`, fill: "rgba(110, 200, 255, 0.16)", stroke: "rgba(110, 200, 255, 0.46)", color: "#d8f3ff" });
      if (enemy.fracturedTimer > 0) badges.push({ text: "균열", fill: "rgba(255, 94, 108, 0.16)", stroke: "rgba(255, 94, 108, 0.36)", color: "#ffb5bd" });
      if (!badges.length) return;
      ctx.font = "900 9px 'Noto Sans KR', 'Malgun Gothic', sans-serif";
      ctx.textBaseline = "middle";
      let x = -enemy.radius;
      const y = -enemy.radius - 20;
      for (const badge of badges.slice(0, 3)) {
        const width = Math.ceil(ctx.measureText(badge.text).width) + 10;
        ctx.fillStyle = badge.fill;
        ctx.strokeStyle = badge.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, width, 11, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = badge.color;
        ctx.fillText(badge.text, x + 5, y + 5.5);
        x += width + 4;
      }
    }

    function drawAlien(enemy, def, hpT) {
      switch (enemy.type) {
        case "skitter":
          drawSkitter(enemy, def, hpT);
          break;
        case "venomrunner":
          drawVenomRunner(enemy, def, hpT);
          break;
        case "brute":
          drawBrute(enemy, def, hpT);
          break;
        case "shellguard":
          drawShellGuard(enemy, def, hpT);
          break;
        case "swarming":
          drawSwarming(enemy, def, hpT);
          break;
        case "broodcarrier":
          drawBroodCarrier(enemy, def, hpT);
          break;
        default:
          drawLurker(enemy, def, hpT);
          break;
      }
    }

    function alienGradient(def, radius, stretch = 1) {
      const g = ctx.createRadialGradient(-radius * 0.24, -radius * 0.34, radius * 0.1, 0, 0, radius * stretch);
      g.addColorStop(0, "#eafff2");
      g.addColorStop(0.22, def.color);
      g.addColorStop(1, "#183624");
      return g;
    }

    function drawAlienEye(x, y, radius, color) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawLurker(enemy, def, hpT) {
      const r = enemy.radius;
      const sway = Math.sin(enemy.phase * 1.4) * r * 0.08;
      ctx.strokeStyle = "rgba(125,255,139,0.32)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        const offset = -r * 0.34 + i * r * 0.24;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.28, offset);
        ctx.lineTo(side * (r * 0.78 + Math.sin(enemy.phase * 6 + i) * 2), offset + r * 0.7);
        ctx.stroke();
      }
      ctx.fillStyle = alienGradient(def, r);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.9, 0, -r * 1.02);
      ctx.quadraticCurveTo(r * 0.82, -r * 0.84, r * 0.92, -r * 0.08);
      ctx.quadraticCurveTo(r * 0.64, r * 0.76, 0, r * 0.92 + sway);
      ctx.quadraticCurveTo(-r * 0.72, r * 0.66, -r * 0.9, -r * 0.02);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + (1 - hpT) * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.16);
      ctx.lineTo(r * 0.34, -r * 0.34);
      ctx.moveTo(-r * 0.3, r * 0.16);
      ctx.lineTo(r * 0.3, r * 0.06);
      ctx.stroke();
      drawAlienEye(r * 0.18, -r * 0.2, Math.max(2, r * 0.14), def.color);
    }

    function drawSkitter(enemy, def, hpT) {
      const r = enemy.radius;
      ctx.strokeStyle = "rgba(125,255,139,0.34)";
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1;
        const local = i % 3;
        const startY = -r * 0.16 + local * r * 0.22;
        const kick = Math.sin(enemy.phase * 9 + i * 0.7) * r * 0.08;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.12, startY);
        ctx.lineTo(side * (r * (0.62 + local * 0.12)), startY + r * 0.26 + kick);
        ctx.lineTo(side * (r * (0.98 + local * 0.08)), startY + r * (0.82 - local * 0.12));
        ctx.stroke();
      }
      ctx.fillStyle = alienGradient(def, r, 1.15);
      ctx.beginPath();
      ctx.moveTo(-r * 1.12, -r * 0.12);
      ctx.lineTo(-r * 0.1, -r * 0.92);
      ctx.lineTo(r * 0.96, -r * 0.42);
      ctx.lineTo(r * 0.58, -r * 0.04);
      ctx.lineTo(r * 0.88, r * 0.18);
      ctx.lineTo(r * 0.1, r * 0.44);
      ctx.lineTo(-r * 0.6, r * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + (1 - hpT) * 0.22})`;
      ctx.beginPath();
      ctx.moveTo(-r * 0.66, -r * 0.12);
      ctx.lineTo(r * 0.46, -r * 0.28);
      ctx.moveTo(-r * 0.24, r * 0.18);
      ctx.lineTo(r * 0.3, r * 0.06);
      ctx.stroke();
      drawAlienEye(-r * 0.36, -r * 0.18, Math.max(2, r * 0.12), def.color);
    }

    function drawBrute(enemy, def, hpT) {
      const r = enemy.radius;
      ctx.strokeStyle = "rgba(214,231,255,0.24)";
      ctx.lineWidth = 3;
      for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.46, r * 0.06);
        ctx.lineTo(side * r * 0.94, r * 0.28);
        ctx.lineTo(side * r * 0.84, r * 0.88);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * r * 0.16, r * 0.22);
        ctx.lineTo(side * r * 0.38, r * 0.94);
        ctx.stroke();
      }
      ctx.fillStyle = alienGradient(def, r, 1.2);
      ctx.beginPath();
      ctx.moveTo(-r * 1.04, -r * 0.06);
      ctx.lineTo(-r * 0.76, -r * 0.7);
      ctx.lineTo(-r * 0.18, -r * 0.92);
      ctx.lineTo(r * 0.22, -r * 0.82);
      ctx.lineTo(r * 0.88, -r * 0.52);
      ctx.lineTo(r * 1.02, 0);
      ctx.lineTo(r * 0.74, r * 0.72);
      ctx.lineTo(r * 0.14, r * 0.94);
      ctx.lineTo(-r * 0.62, r * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(14, 22, 30, 0.5)";
      ctx.beginPath();
      ctx.moveTo(-r * 0.84, -r * 0.22);
      ctx.lineTo(-r * 0.5, -r * 0.76);
      ctx.lineTo(-r * 0.08, -r * 0.6);
      ctx.lineTo(-r * 0.22, 0);
      ctx.closePath();
      ctx.moveTo(r * 0.24, -r * 0.64);
      ctx.lineTo(r * 0.74, -r * 0.42);
      ctx.lineTo(r * 0.56, r * 0.04);
      ctx.lineTo(r * 0.08, -r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + (1 - hpT) * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.26);
      ctx.lineTo(r * 0.22, -r * 0.42);
      ctx.moveTo(-r * 0.34, r * 0.08);
      ctx.lineTo(r * 0.24, -r * 0.04);
      ctx.stroke();
      drawAlienEye(-r * 0.12, -r * 0.18, Math.max(2, r * 0.14), def.color);
      drawAlienEye(r * 0.18, -r * 0.1, Math.max(2, r * 0.11), def.color);
    }


    function drawVenomRunner(enemy, def, hpT) {
      drawSkitter(enemy, def, hpT);
      const r = enemy.radius;
      ctx.strokeStyle = enemy.enraged ? "rgba(223, 255, 98, 0.9)" : "rgba(223, 255, 98, 0.34)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.25 + Math.sin(enemy.phase * 9) * 0.08), -0.9, 0.9);
      ctx.stroke();
    }

    function drawShellGuard(enemy, def, hpT) {
      drawBrute(enemy, def, hpT);
      const r = enemy.radius;
      const aura = def.guardAura?.radius || 0;
      if (aura > 0) {
        ctx.strokeStyle = "rgba(110, 200, 255, 0.24)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(aura * 0.28, r * 1.95), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(230, 248, 255, 0.72)";
      ctx.lineWidth = 2;
      for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.25, -r * 0.7);
        ctx.lineTo(side * r * 0.82, -r * 0.2);
        ctx.lineTo(side * r * 0.65, r * 0.55);
        ctx.stroke();
      }
    }

    function drawSwarming(enemy, def, hpT) {
      const r = enemy.radius;
      const wag = Math.sin(enemy.phase * 10) * r * 0.12;
      ctx.strokeStyle = "rgba(125,255,139,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, -r * 0.08);
      ctx.lineTo(-r * 1.04, -r * 0.34);
      ctx.moveTo(-r * 0.62, 0);
      ctx.lineTo(-r * 1.02, 0);
      ctx.moveTo(-r * 0.68, r * 0.08);
      ctx.lineTo(-r * 1.04, r * 0.34);
      ctx.stroke();
      ctx.fillStyle = alienGradient(def, r, 0.95);
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, 0);
      ctx.lineTo(-r * 0.22, -r * 0.52);
      ctx.lineTo(r * 0.82, -r * 0.1);
      ctx.lineTo(r * 0.94, 0);
      ctx.lineTo(r * 0.78, r * 0.14 + wag);
      ctx.lineTo(-r * 0.2, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.14 + (1 - hpT) * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(-r * 0.24, -r * 0.18);
      ctx.lineTo(r * 0.48, 0);
      ctx.stroke();
      drawAlienEye(r * 0.08, -r * 0.08, Math.max(2, r * 0.1), def.color);
    }

    function drawBroodCarrier(enemy, def, hpT) {
      const r = enemy.radius;
      ctx.strokeStyle = "rgba(255, 214, 162, 0.24)";
      ctx.lineWidth = 2;
      for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.18, r * 0.16);
        ctx.lineTo(side * r * 0.52, r * 0.84);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * r * 0.34, -r * 0.04);
        ctx.lineTo(side * r * 0.8, r * 0.58);
        ctx.stroke();
      }
      ctx.fillStyle = alienGradient(def, r, 1.3);
      ctx.beginPath();
      ctx.moveTo(-r * 0.92, 0);
      ctx.quadraticCurveTo(-r * 0.76, -r * 0.72, -r * 0.12, -r * 0.72);
      ctx.quadraticCurveTo(r * 0.72, -r * 0.76, r * 0.96, -r * 0.06);
      ctx.quadraticCurveTo(r * 0.96, r * 0.76, 0, r * 0.94);
      ctx.quadraticCurveTo(-r * 0.72, r * 0.78, -r * 0.92, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 205, 165, 0.22)";
      for (let i = 0; i < 3; i++) {
        const px = r * (0.18 + i * 0.22);
        const py = -r * (0.3 - i * 0.16);
        ctx.beginPath();
        ctx.ellipse(px, py, r * (0.22 + i * 0.04), r * (0.3 + i * 0.02), 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + (1 - hpT) * 0.22})`;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.14);
      ctx.lineTo(r * 0.1, -r * 0.24);
      ctx.moveTo(-r * 0.22, r * 0.12);
      ctx.lineTo(r * 0.08, r * 0.04);
      ctx.stroke();
      drawAlienEye(-r * 0.02, -r * 0.12, Math.max(2, r * 0.12), def.color);
    }

    function drawColossus(enemy, def, hpT) {
      const r = enemy.radius;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + enemy.phase * 0.4;
        ctx.strokeStyle = i % 2 ? "rgba(255,94,108,0.32)" : "rgba(117,255,139,0.25)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.45);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.0);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(-r * 0.28, -r * 0.4, 4, 0, 0, r * 1.35);
      g.addColorStop(0, "#ffd8da");
      g.addColorStop(0.22, def.color);
      g.addColorStop(0.7, "#41202c");
      g.addColorStop(1, "#10080c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.25, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + (1 - hpT) * 0.45})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-r + i * r * 0.45, -r * 0.5);
        ctx.lineTo(-r * 0.7 + i * r * 0.45, r * 0.55);
        ctx.stroke();
      }
      ctx.shadowColor = "#ff5e6c";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(r * 0.24, -r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx.arc(-r * 0.32, -r * 0.08, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBroodCocoon(enemy, def, hpT) {
      const r = enemy.radius;
      ctx.strokeStyle = "rgba(255, 214, 162, 0.38)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const t = enemy.phase * 0.6 + i * 1.4;
        ctx.beginPath();
        ctx.arc(Math.cos(t) * r * 0.2, Math.sin(t) * r * 0.2, r * (0.45 + i * 0.1), t, t + Math.PI * 0.9);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 2, 0, 0, r * 1.15);
      g.addColorStop(0, "#fff8e8");
      g.addColorStop(0.28, def.color);
      g.addColorStop(1, "#5a3118");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.94, r * 1.08, Math.sin(enemy.phase * 0.5) * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 250, 230, ${0.28 + (1 - hpT) * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, -r * 0.12, r * 0.26, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    return {
      drawEnemies,
      renderEnemyThumbnail,
    };
  }

  window.OrbitEnemyRenderer = {
    create: createEnemyRenderer,
  };
})();

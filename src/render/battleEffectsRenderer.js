(function () {
  "use strict";

  function createBattleEffectsRenderer(deps) {
    const { ctx, state } = deps;

    function drawProjectiles() {
      for (const p of state.projectiles) {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.type === "plasma" ? 3.2 : 2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        for (const [i, t] of p.trail.entries()) {
          if (i === 0) ctx.moveTo(t.x, t.y);
          else ctx.lineTo(t.x, t.y);
        }
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.type === "plasma" ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawRailAfterimages() {
      if (!state.railAfterimages.length) return;
      for (const beam of state.railAfterimages) {
        const fade = Math.max(0, beam.life / beam.maxLife);
        ctx.save();
        ctx.strokeStyle = beam.color;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 5 * fade;
        ctx.globalAlpha = 0.22 * fade;
        ctx.lineWidth = beam.width;
        ctx.beginPath();
        ctx.moveTo(beam.x1, beam.y1);
        ctx.lineTo(beam.x2, beam.y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawAcidPools() {
      if (!state.acidPools.length) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const pool of state.acidPools) {
        const t = Math.max(0, pool.life / pool.maxLife);
        const g = ctx.createRadialGradient(pool.x, pool.y, 3, pool.x, pool.y, pool.radius);
        g.addColorStop(0, `rgba(125,255,139,${0.22 * t})`);
        g.addColorStop(0.55, `rgba(70,255,210,${0.12 * t})`);
        g.addColorStop(1, "rgba(125,255,139,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pool.x, pool.y, pool.radius * (1 + Math.sin(state.time * 5) * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawBeams() {
      for (const beam of state.beams) {
        ctx.save();
        ctx.strokeStyle = beam.color;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 8;
        for (let i = 0; i < 2; i++) {
          ctx.globalAlpha = 0.5 - i * 0.18;
          ctx.lineWidth = beam.width + i * 1.2;
          ctx.beginPath();
          ctx.moveTo(beam.x1, beam.y1);
          const jitter = Math.sin(state.time * 34 + i) * 0.8;
          ctx.lineTo((beam.x1 + beam.x2) / 2 + jitter, (beam.y1 + beam.y2) / 2 - jitter);
          ctx.lineTo(beam.x2, beam.y2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawParticles() {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of state.particles) {
        const t = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.2 - t * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    return {
      drawAcidPools,
      drawBeams,
      drawParticles,
      drawProjectiles,
      drawRailAfterimages,
    };
  }

  window.OrbitBattleEffectsRenderer = {
    create: createBattleEffectsRenderer,
  };
})();

(function () {
  "use strict";

  function createTargeting(deps) {
    const { state, dist, dist2, lerp } = deps;

    function nearbyEnemies(center, radius, limit) {
      const result = [];
      const distances = [];
      const maxDist2 = radius * radius;
      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const distance2 = dist2(center, enemy);
        if (distance2 > maxDist2) continue;
        let inserted = false;
        for (let i = 0; i < distances.length; i++) {
          if (distance2 < distances[i]) {
            distances.splice(i, 0, distance2);
            result.splice(i, 0, enemy);
            inserted = true;
            break;
          }
        }
        if (!inserted && result.length < limit) {
          distances.push(distance2);
          result.push(enemy);
        }
        if (result.length > limit) {
          result.length = limit;
          distances.length = limit;
        }
      }
      return result;
    }

    function chainTargets(firstTarget, maxHits, hopRange) {
      const hits = [];
      let current = firstTarget;
      while (current && hits.length < maxHits) {
        hits.push(current);
        let next = null;
        let bestProgress = -Infinity;
        let bestDistance2 = Infinity;
        const maxDist2 = hopRange * hopRange;
        for (const enemy of state.enemyProgressOrder) {
          if (enemy.dead || hits.includes(enemy)) continue;
          const distance2 = dist2(current, enemy);
          if (distance2 > maxDist2) continue;
          if (enemy.progress > bestProgress || (enemy.progress === bestProgress && distance2 < bestDistance2)) {
            next = enemy;
            bestProgress = enemy.progress;
            bestDistance2 = distance2;
          }
        }
        current = next;
      }
      return hits;
    }

    function enemiesAlongBeam(origin, target, range, thickness, maxHits) {
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const hits = [];
      const range2 = range * range;
      for (const enemy of state.enemyProgressOrder) {
        if (enemy.dead || dist2(origin, enemy) > range2) continue;
        const ox = enemy.x - origin.x;
        const oy = enemy.y - origin.y;
        const along = ox * ux + oy * uy;
        if (along < 0 || along > range) continue;
        const perpendicular = Math.abs(ox * uy - oy * ux);
        if (perpendicular <= enemy.radius + thickness) hits.push(enemy);
        if (hits.length >= maxHits) break;
      }
      return hits;
    }

    function findTarget(x, y, range) {
      const origin = { x, y };
      const range2 = range * range;
      for (const enemy of state.enemyProgressOrder) {
        if (!enemy.dead && dist2(origin, enemy) <= range2) return enemy;
      }
      return null;
    }

    function findNearestTarget(x, y, range) {
      const origin = { x, y };
      const range2 = range * range;
      let best = null;
      let bestDistance2 = Infinity;
      for (const enemy of state.enemies) {
        const distance2 = dist2(origin, enemy);
        if (enemy.dead || distance2 > range2) continue;
        if (distance2 < bestDistance2 || (distance2 === bestDistance2 && enemy.progress > (best?.progress ?? -Infinity))) {
          best = enemy;
          bestDistance2 = distance2;
        }
      }
      return best;
    }

    function placeOnPath(enemy) {
      let remaining = enemy.progress;
      if (remaining <= 0) {
        const first = state.path[0];
        const second = state.path[1];
        const a = Math.atan2(second.y - first.y, second.x - first.x);
        enemy.x = first.x + Math.cos(a) * remaining;
        enemy.y = first.y + Math.sin(a) * remaining;
        return;
      }
      for (let i = 0; i < state.path.length - 1; i++) {
        const a = state.path[i];
        const b = state.path[i + 1];
        const seg = dist(a, b);
        if (remaining <= seg) {
          const t = remaining / seg;
          enemy.x = lerp(a.x, b.x, t);
          enemy.y = lerp(a.y, b.y, t);
          return;
        }
        remaining -= seg;
      }
      const end = state.path[state.path.length - 1];
      enemy.x = end.x;
      enemy.y = end.y;
    }

    return {
      chainTargets,
      enemiesAlongBeam,
      findNearestTarget,
      findTarget,
      nearbyEnemies,
      placeOnPath,
    };
  }

  window.OrbitTargeting = {
    create: createTargeting,
  };
})();

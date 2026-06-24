(function () {
  "use strict";

  function createWaveLogic(deps) {
    const {
      state,
      STAGES,
      STAGE_RULES,
      ENEMY_DEFS,
      DIFFICULTY_DEFS,
      formatPreviewNumber,
      enemyArmorValue,
    } = deps;

    function stageRule(index = state.stageIndex) {
      return STAGE_RULES[index] || STAGE_RULES[0];
    }

    function stageEnemyHpScale() {
      return 1;
    }

    function applyStageRulesToWaves(waves) {
      const rule = stageRule();
      return waves.map((wave) => {
        const groups = wave.groups.map((group) => ({
          ...group,
          count: Math.max(1, Math.ceil(group.count * (rule.group[group.type] || 1))),
        }));
        for (const extra of rule.extraGroups || []) {
          if (wave.wave >= extra.wave) {
            const extraRamp = Math.min(1, 0.5 + Math.max(0, wave.wave - extra.wave) * 0.25);
            const extraCount = Math.ceil((extra.count + Math.floor(wave.wave / 3)) * extraRamp);
            groups.push({ type: extra.type, count: extraCount, gap: extra.gap });
          }
        }
        const pacingScale = wavePacingScale(state.stageIndex, wave.wave, waves.length);
        if (pacingScale !== 1) {
          for (const group of groups) {
            if (ENEMY_DEFS[group.type]?.boss) continue;
            group.count = Math.max(1, Math.ceil(group.count * pacingScale));
          }
        }
        return { ...wave, groups };
      });
    }

    function wavePacingScale(stageIndex, waveNumber, waveCount) {
      const stagePressure = Math.max(0, stageIndex - 3);
      if (!stagePressure || waveNumber < 1 || waveCount <= 1) return 1;

      const intensity = Math.min(1, stagePressure / 5);
      const progress = Math.max(0, Math.min(1, (waveNumber - 1) / (waveCount - 1)));
      const target = 0.52 + 0.9 * progress;
      return 1 + (target - 1) * intensity;
    }

    function stageWaveGrowthScale(stageIndex) {
      const scales = [0.72, 0.78, 0.84, 0.9, 0.94, 0.97, 1, 1.02, 1.03, 1.04, 1.04, 1.05, 1.06, 1.07, 1.08];
      if (stageIndex < 0) return scales[0];
      return stageIndex < scales.length ? scales[stageIndex] : scales.at(-1);
    }

    function stageEnemyMix(stageIndex) {
      const skitterStart = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3];
      const bruteStart = [99, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5];
      const venomrunnerStart = [99, 99, 99, 8, 7, 7, 6, 6, 5, 5, 5, 5, 4, 4, 4];
      const swarmingStart = [99, 99, 99, 8, 6, 7, 7, 7, 8, 8, 7, 7, 7, 6, 6];
      const shellguardStart = [99, 99, 99, 99, 99, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5];
      const broodcarrierStart = [99, 99, 99, 99, 8, 8, 8, 8, 9, 9, 7, 7, 6, 6, 6];
      const ironcladStart = [99, 99, 99, 99, 99, 99, 99, 99, 8, 7, 7, 7, 6, 6, 6];
      const index = Math.max(0, Math.min(stageIndex, skitterStart.length - 1));
      return {
        skitterStart: skitterStart[index],
        bruteStart: bruteStart[index],
        venomrunnerStart: venomrunnerStart[index],
        swarmingStart: swarmingStart[index],
        shellguardStart: shellguardStart[index],
        broodcarrierStart: broodcarrierStart[index],
        ironcladStart: ironcladStart[index],
        bossEnabled: true,
      };
    }

    function buildFallbackWaves() {
      const stage = STAGES[state.stageIndex];
      const growthScale = stageWaveGrowthScale(state.stageIndex);
      const mix = stageEnemyMix(state.stageIndex);
      state.waves = [];
      for (let w = 1; w <= stage.waves; w++) {
        if (w === 1) {
          state.waves.push({ wave: w, groups: [{ type: "lurker", count: 6 + Math.floor(Math.max(0, state.stageIndex - 2) / 2), gap: 0.82 }], reward: 18 + w * 4 });
          continue;
        }
        const effectiveWave = 1 + (w - 1) * growthScale;
        const groups = [{ type: "lurker", count: 4 + Math.round(effectiveWave * 2), gap: Math.max(0.6, 0.96 - w * 0.032) }];
        if (w >= mix.skitterStart) groups.push({ type: "skitter", count: 3 + Math.round(effectiveWave), gap: 0.5 });
        if (w >= mix.bruteStart) groups.push({ type: "brute", count: Math.max(1, Math.floor(effectiveWave / 2)), gap: 1.2 });
        if (w >= mix.venomrunnerStart) groups.push({ type: "venomrunner", count: 2 + Math.round(effectiveWave * 0.85), gap: 0.46 });
        if (w >= mix.swarmingStart) groups.push({ type: "swarming", count: 10 + Math.round(effectiveWave * 2), gap: 0.26 });
        if (w >= mix.shellguardStart) groups.push({ type: "shellguard", count: Math.max(1, Math.floor(effectiveWave * 0.28)), gap: 1.35 });
        if (w >= mix.broodcarrierStart) groups.push({ type: "broodcarrier", count: Math.max(1, Math.floor(effectiveWave * 0.45)), gap: 0.95 });
        if (w >= mix.ironcladStart) groups.push({ type: "ironclad", count: Math.max(1, Math.floor(effectiveWave * 0.22)), gap: 1.55 });
        if (mix.bossEnabled && w === stage.waves) groups.push({ type: stageRule().bossType || "colossus", count: 1, gap: 0.15 });
        state.waves.push({ wave: w, groups, reward: 18 + w * 4 });
      }
      state.waves = applyStageRulesToWaves(state.waves);
    }

    function waveOverview(wave = state.waves[state.waveIndex]) {
      if (!wave) {
        return {
          summary: state.victory ? "모든 웨이브 완료" : "다음 웨이브 대기 중",
          groups: [],
          threat: { summary: "교전 적 없음", tags: [{ text: "정비 시간", tone: "control" }] },
        };
      }
      const groups = [];
      const threatTags = [];
      let totalCount = 0;
      let armored = false;
      let boss = false;
      let swarm = false;
      let fast = false;
      let elite = false;
      for (const group of wave.groups) {
        const def = ENEMY_DEFS[group.type];
        if (!def) continue;
        totalCount += group.count;
        groups.push({ text: `${def.name} x${group.count}`, tone: def.boss ? "alert" : enemyArmorValue(def) > 0 ? "armor" : "default" });
        armored ||= enemyArmorValue(def) > 0;
        boss ||= Boolean(def.boss);
        swarm ||= group.count >= 8 || group.type === "swarming";
        fast ||= def.speed >= 72;
        elite ||= def.hp >= 180;
      }
      if (boss) threatTags.push({ text: "보스", tone: "alert" });
      if (armored) threatTags.push({ text: "장갑 적", tone: "armor" });
      if (swarm) threatTags.push({ text: "군체 다수", tone: "alert" });
      if (fast) threatTags.push({ text: "고속 돌파", tone: "control" });
      if (elite) threatTags.push({ text: "중장 개체", tone: "armor" });
      if (!threatTags.length) threatTags.push({ text: "기본 위협", tone: "default" });
      return {
        summary: `${wave.wave}웨이브 / ${wave.groups.length}개 무리 / 총 ${totalCount}기`,
        groups: groups.slice(0, 4),
        threat: {
          summary: threatTags.map((tag) => tag.text).join(" / "),
          tags: threatTags,
        },
      };
    }

    function enemyTraitTags(type, def) {
      const tags = [];
      const armor = enemyArmorValue(def);
      if (def.boss) tags.push({ text: "보스", tone: "alert" });
      if (armor > 0) tags.push({ text: `장갑 ${armor}`, tone: "armor" });
      if (def.speed >= 72) tags.push({ text: "고속", tone: "control" });
      else if (def.speed <= 36) tags.push({ text: "중장", tone: "armor" });
      if (def.hp <= 30) tags.push({ text: "군체", tone: "default" });
      if (def.enrage) tags.push({ text: "광폭 질주", tone: "alert" });
      if (def.guardAura) tags.push({ text: "방호 오라", tone: "armor" });
      if (def.shieldRegen) tags.push({ text: "보호막 재생", tone: "control" });
      if (def.phaseSpeed) tags.push({ text: "페이즈 가속", tone: "alert" });
      if (def.cocoon) tags.push({ text: "처치 시 고치", tone: "alert" });
      return tags;
    }

    function enemySpecialText(type, def, hpScale = 1) {
      if (def?.enrage) return `체력 ${Math.round(def.enrage.threshold * 100)}% 이하에서 이동 속도 ${formatPreviewNumber(def.enrage.speed, 2)}배`;
      if (def?.guardAura) return `주변 ${def.guardAura.radius}px 적에게 장갑 +${def.guardAura.armor} 부여`;
      if (def?.shieldRegen) return `최대 체력 ${Math.round(def.shieldRegen.cap * 100)}%까지 ${formatPreviewNumber(def.shieldRegen.interval, 1)}초마다 보호막 재생`;
      if (def?.phaseSpeed) return `페이즈별 이동 속도 최대 ${formatPreviewNumber(def.phaseSpeed.at(-1), 2)}배`;
      if (def?.special) return def.special;
      if (!def?.cocoon) return "";
      const hatchText = def.cocoon.hatchGroups
        .map((group) => `${ENEMY_DEFS[group.type]?.name || group.type} ${group.count}기`)
        .join(" + ");
      return `고치 체력 ${Math.round(def.cocoon.hp * hpScale)} / ${formatPreviewNumber(def.cocoon.hatchTime, 1)}초 후 ${hatchText} 부화`;
    }

    function currentWaveEnemyRoster() {
      const difficulty = DIFFICULTY_DEFS[state.difficulty] || DIFFICULTY_DEFS.easy;
      const hpScale = difficulty.hp || 1;
      const summary = new Map();
      for (const wave of state.waves) {
        for (const group of wave.groups) {
          const def = ENEMY_DEFS[group.type];
          if (!def || def.hiddenInRoster) continue;
          const stageHpScale = stageEnemyHpScale(group.type);
          if (!summary.has(group.type)) {
            summary.set(group.type, {
              type: group.type,
              name: def.name,
              count: 0,
              firstWave: wave.wave,
              lastWave: wave.wave,
              hp: Math.round(def.hp * hpScale * stageHpScale),
              speed: def.speed,
              armor: enemyArmorValue(def),
              reward: def.reward,
              boss: Boolean(def.boss),
              tags: enemyTraitTags(group.type, def),
              special: enemySpecialText(group.type, def, hpScale * stageHpScale),
            });
          }
          const item = summary.get(group.type);
          item.count += group.count;
          item.firstWave = Math.min(item.firstWave, wave.wave);
          item.lastWave = Math.max(item.lastWave, wave.wave);
        }
      }
      return [...summary.values()].sort((a, b) => {
        if (a.firstWave !== b.firstWave) return a.firstWave - b.firstWave;
        if (a.boss !== b.boss) return a.boss ? 1 : -1;
        if (a.armor !== b.armor) return b.armor - a.armor;
        if (a.hp !== b.hp) return b.hp - a.hp;
        return b.speed - a.speed;
      });
    }

    function stageEnemySummary() {
      const roster = currentWaveEnemyRoster();
      if (!roster.length) {
        return {
          summary: "0웨이브 / 0개 적 유형 / 총 0기",
          tags: [{ text: "적 정보 없음", tone: "default" }],
        };
      }
      const totalCount = roster.reduce((sum, enemy) => sum + enemy.count, 0);
      const tags = [];
      if (roster.some((enemy) => enemy.boss)) tags.push({ text: "보스", tone: "alert" });
      if (roster.some((enemy) => enemy.armor > 0)) tags.push({ text: "장갑 적", tone: "armor" });
      if (roster.some((enemy) => enemy.speed >= 72)) tags.push({ text: "고속 돌파", tone: "control" });
      if (roster.some((enemy) => enemy.type === "swarming")) tags.push({ text: "군체 다수", tone: "alert" });
      if (roster.some((enemy) => enemy.hp >= 180)) tags.push({ text: "중장 개체", tone: "armor" });
      if (!tags.length) tags.push({ text: "기본 위협", tone: "default" });
      return {
        summary: `${state.waves.length}웨이브 / ${roster.length}개 적 유형 / 총 ${totalCount}기`,
        tags,
      };
    }

    function liveThreatOverview() {
      if (!state.enemies.length) return null;
      let armored = 0;
      let bosses = 0;
      let marked = 0;
      let slowed = 0;
      let stunned = 0;
      for (const enemy of state.enemies) {
        const def = ENEMY_DEFS[enemy.type];
        if (enemyArmorValue(def) > 0) armored += 1;
        if (def.boss) bosses += 1;
        if (enemy.markedTimer > 0) marked += 1;
        if (enemy.slowTimer > 0) slowed += 1;
        if ((enemy.stunTimer || 0) > 0.01) stunned += 1;
      }
      const tags = [];
      if (bosses) tags.push({ text: `보스 ${bosses}`, tone: "alert" });
      if (armored) tags.push({ text: `장갑 ${armored}`, tone: "armor" });
      if (slowed) tags.push({ text: `감속 ${slowed}`, tone: "control" });
      if (stunned) tags.push({ text: `기절 ${stunned}`, tone: "control" });
      if (marked) tags.push({ text: `표식 ${marked}`, tone: "alert" });
      return {
        summary: `교전 중 적 ${state.enemies.length}기`,
        tags: tags.length ? tags : [{ text: "일반 교전", tone: "default" }],
      };
    }

    return {
      applyStageRulesToWaves,
      buildFallbackWaves,
      currentWaveEnemyRoster,
      liveThreatOverview,
      stageEnemySummary,
      stageEnemyHpScale,
      stageRule,
      waveOverview,
    };
  }

  window.OrbitWaveLogic = {
    create: createWaveLogic,
  };
})();

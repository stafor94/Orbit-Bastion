(function () {
  "use strict";

  function createResearchLogic(deps) {
    const {
      state,
      RESEARCH_DEFS,
      RESEARCH_CATEGORIES,
      researchPresentation,
      getResearchLevels,
      researchPoints,
    } = deps;

    function formatPreviewNumber(value, digits = 1) {
      const rounded = Math.round(value * (10 ** digits)) / (10 ** digits);
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
    }

    function researchCost(def, level) {
      return def.baseCost + level;
    }

    function researchDef(id) {
      return RESEARCH_DEFS.find((def) => def.id === id) || null;
    }

    function researchMeta(id) {
      return researchPresentation.defs?.[id] || { name: id, category: "all", appliesTo: ["전체"], summary: "" };
    }

    function researchCategoryName(id) {
      return RESEARCH_CATEGORIES.find((category) => category.id === id)?.name || "전체";
    }

    function researchLockReason(def, levels) {
      const parents = def.requires?.parents || [];
      const missing = parents
        .map((parent) => {
          const level = levels[parent.id] || 0;
          if (level >= parent.level) return "";
          return `${researchMeta(parent.id).name} ${parent.level}단계`;
        })
        .filter(Boolean);
      return missing.length ? `선행 연구 필요: ${missing.join(" / ")}` : "";
    }

    function isResearchUnlocked(def, levels) {
      return !researchLockReason(def, levels);
    }

    function researchVisibleDefs(filter = state.selectedResearchFilter) {
      if (!filter || filter === "all") return RESEARCH_DEFS;
      return RESEARCH_DEFS.filter((def) => researchMeta(def.id).category === filter);
    }

    function researchAppliesToText(def) {
      const appliesTo = researchMeta(def.id).appliesTo || [];
      return appliesTo.length ? appliesTo.join(" / ") : "전체";
    }

    function researchEffectText(id, level) {
      if (level <= 0) return "효과 없음";
      switch (id) {
        case "core":
          return `시작 코어 체력 +${level * 2}`;
        case "alloy":
          return `시작 합금 +${level * 25}`;
        case "pulse":
        case "laser":
        case "plasma":
        case "arc":
        case "rail":
          return `${researchMeta(id).name} 피해 +${level * 8}%`;
        case "gravity":
          return `끌어당김 범위 +${level * 6}% / 흡인력 +${level * 6}%`;
        case "beacon":
          return `보조 피해 +${level * 3}%p / 재장전 보정 -${level * 3}%p`;
        case "targeting":
          return `모든 타워 피해 +${level * 2}%`;
        case "salvage":
          return `처치 합금 +${level * 4}%`;
        case "capacitors":
          return `건설 비용 -${level * 3}% / 업그레이드 비용 -${level * 2}%`;
        case "cryo":
          return `감속 강도 +${level * 3}%p`;
        case "ballistics":
          return `투사체 속도 +${level * 8}%`;
        case "range":
          return `모든 타워 사거리 +${level * 4}%`;
        case "cooldown":
          return `모든 타워 공격 주기 -${level * 3}%`;
        case "armorPierce":
          return `적 장갑 ${level * 2} 고정 감소`;
        case "allDamage":
          return `모든 타워 피해 +${level * 4}%`;
        case "recycle":
          return `판매 환급 +${level * 5}%`;
        case "repair":
          return `웨이브 종료 시 코어 회복 +${level}`;
        case "fortress":
          return `5초마다 재생되는 코어 쉴드 최대 ${level}`;
        case "bossBreaker":
          return `보스 대상 피해 +${level * 8}%`;
        case "overdrive":
          return `웨이브 중 전체 피해 +${level * 3}%`;
        case "waveBonus":
          return `웨이브 보상 +${level * 5}%`;
        default:
          return `${level}단계 효과`;
      }
    }

    function researchSpentForLevel(def, level) {
      let spent = 0;
      for (let i = 0; i < level; i++) spent += researchCost(def, i);
      return spent;
    }

    function researchResetTargets(filter, levels = getResearchLevels()) {
      const targetIds = new Set(researchVisibleDefs(filter).map((def) => def.id));
      const resetIds = new Set(targetIds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const def of RESEARCH_DEFS) {
          if ((levels[def.id] || 0) <= 0 || resetIds.has(def.id)) continue;
          const parents = def.requires?.parents || [];
          if (parents.some((parent) => resetIds.has(parent.id))) {
            resetIds.add(def.id);
            changed = true;
          }
        }
      }
      return RESEARCH_DEFS.filter((def) => resetIds.has(def.id));
    }

    function researchResetSummary(filter, levels = getResearchLevels()) {
      const defs = researchResetTargets(filter, levels);
      let refund = 0;
      let upgraded = 0;
      let cascaded = 0;
      for (const def of defs) {
        const level = levels[def.id] || 0;
        if (level <= 0) continue;
        upgraded += 1;
        if ((researchMeta(def.id).category || "all") !== (filter || "all") && filter !== "all") cascaded += 1;
        refund += researchSpentForLevel(def, level);
      }
      return { refund, upgraded, cascaded };
    }

    function recommendedResearch(levels = getResearchLevels(), points = researchPoints()) {
      const stageFactor = state.stageIndex + 1;
      const hardMode = state.difficulty === "hard" || state.difficulty === "hell" || state.difficulty === "nightmare";
      const weights = {
        core: stageFactor <= 2 ? 1.1 : 0.94,
        alloy: stageFactor <= 3 ? 1.22 : 0.86,
        pulse: stageFactor <= 2 ? 1 : 0.88,
        laser: stageFactor >= 3 ? 0.96 : 0.84,
        plasma: stageFactor >= 2 ? 1.04 : 0.9,
        arc: stageFactor >= 3 ? 1 : 0.88,
        rail: stageFactor >= 3 ? 1.02 : 0.9,
        targeting: 1.08,
        salvage: stageFactor <= 3 ? 1.08 : 0.92,
        capacitors: stageFactor <= 3 ? 1.18 : 0.94,
        cryo: hardMode || stageFactor >= 3 ? 0.94 : 0.8,
        gravity: hardMode || stageFactor >= 3 ? 1.02 : 0.9,
        beacon: stageFactor >= 2 ? 1 : 0.88,
        ballistics: 0.72,
        range: stageFactor >= 2 ? 1.08 : 0.96,
        cooldown: 1.16,
        armorPierce: stageFactor >= 2 ? 1.06 : 0.7,
        allDamage: 1.18,
        recycle: stageFactor <= 2 ? 0.8 : 0.66,
        repair: hardMode ? 1.08 : stageFactor >= 4 ? 0.96 : 0.82,
        fortress: hardMode || stageFactor >= 4 ? 1.02 : 0.7,
        bossBreaker: stageFactor >= 3 ? 1.08 : 0.76,
        overdrive: 1 + state.stageIndex * 0.1,
        waveBonus: stageFactor <= 2 ? 1 : 0.9,
      };
      return RESEARCH_DEFS
        .filter((def) => {
          const level = levels[def.id] || 0;
          return level < def.max && isResearchUnlocked(def, levels) && researchCost(def, level) <= points;
        })
        .map((def) => {
          const level = levels[def.id] || 0;
          const cost = researchCost(def, level);
          return { def, cost, score: (weights[def.id] || 0.8) / Math.max(1, cost) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    return {
      formatPreviewNumber,
      isResearchUnlocked,
      recommendedResearch,
      researchAppliesToText,
      researchCategoryName,
      researchCost,
      researchDef,
      researchEffectText,
      researchLockReason,
      researchMeta,
      researchResetSummary,
      researchResetTargets,
      researchSpentForLevel,
      researchVisibleDefs,
    };
  }

  window.OrbitResearchLogic = { create: createResearchLogic };
})();

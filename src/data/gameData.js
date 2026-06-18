(function () {
  "use strict";

  const TOWER_DEFS = {
    pulse: {
      name: "펄스 캐논",
      short: "펄스",
      cost: 65,
      color: "#54c6ff",
      range: 118,
      cooldown: 0.5,
      damage: 10,
      projectileSpeed: 420,
      upgrade: 65,
      role: "안정적인 단일 대상 공격 타워입니다.",
    },
    laser: {
      name: "레이저 랜스",
      short: "레이저",
      cost: 110,
      color: "#ff6a58",
      range: 130,
      cooldown: 1,
      damage: 20,
      upgrade: 110,
      role: "같은 적을 오래 조준할수록 피해가 강해지는 집속 광선 타워입니다.",
    },
    plasma: {
      name: "플라즈마 박격포",
      short: "플라즈마",
      cost: 140,
      color: "#b98cff",
      range: 130,
      cooldown: 2.2,
      damage: 34,
      splash: 50,
      projectileSpeed: 250,
      upgrade: 140,
      role: "몰려오는 적을 처리하는 범위 폭발 타워입니다.",
    },
    cryo: {
      name: "크라이오 필드",
      short: "크라이오 필드",
      cost: 80,
      color: "#7de9ff",
      range: 90,
      cooldown: 0,
      damage: 0,
      slow: 0.6,
      upgrade: 80,
      role: "직접 피해 없이 적을 지속 감속하고 약화하는 제어 타워입니다.",
    },
  };

  const ENEMY_DEFS = {
    lurker: { name: "러커", hp: 70, speed: 48, reward: 6, radius: 13, color: "#78ff9b", armor: 0 },
    skitter: { name: "스키터", hp: 38, speed: 78, reward: 4, radius: 9, color: "#caff5a", armor: 0 },
    venomrunner: { name: "베놈 러너", hp: 58, speed: 70, reward: 5, radius: 10, color: "#b6ff35", armor: 0, enrage: { threshold: 0.45, speed: 1.45 } },
    brute: { name: "브루트", hp: 180, speed: 32, reward: 10, radius: 17, color: "#45d188", armor: 3 },
    shellguard: { name: "갑각 수호체", hp: 300, speed: 30, reward: 13, radius: 18, color: "#6ec8ff", armor: 10, guardAura: { radius: 80, armor: 3 } },
    swarming: { name: "스웜링", hp: 24, speed: 63, reward: 2, radius: 7, color: "#a1ffcf", armor: 0 },
    broodcarrier: {
      name: "기생 운반체",
      hp: 118,
      speed: 41,
      reward: 8,
      radius: 14,
      color: "#ff9b78",
      armor: 1,
      cocoon: {
        hp: 354,
        hatchTime: 6,
        hatchGroups: [{ type: "brute", count: 3 }],
      },
    },
    broodcocoon: {
      name: "기생 고치",
      hp: 354,
      speed: 0,
      reward: 0,
      radius: 15,
      color: "#ffcf8a",
      armor: 20,
      stationary: true,
      cocoonBody: true,
      hiddenInRoster: true,
    },
    colossus: { name: "브루드 콜로서스", hp: 3750, speed: 19, reward: 50, radius: 28, color: "#ff5e6c", armor: 10, boss: true },
  };

  const STAGES = [
    {
      name: "착륙 방어선",
      core: 20,
      alloy: 170,
      waves: 10,
      path: [
        [0.02, 0.19], [0.28, 0.19], [0.28, 0.42], [0.74, 0.42],
        [0.74, 0.66], [0.42, 0.66], [0.42, 0.86], [0.98, 0.86],
      ],
      slots: [
        [0.176, 0.467], [0.441, 0.365], [0.844, 0.373], [0.861, 0.504],
        [0.619, 0.576], [0.628, 0.724], [0.316, 0.613], [0.299, 0.73],
      ],
    },
    {
      name: "파괴된 중계소",
      core: 18,
      alloy: 180,
      waves: 10,
      path: [
        [0.5, -0.04], [0.5, 0.16], [0.18, 0.16], [0.18, 0.42],
        [0.82, 0.42], [0.82, 0.67], [0.3, 0.67], [0.3, 1.04],
      ],
      slots: [
        [0.569, 0.236], [0.238, 0.072], [0.26, 0.29], [0.249, 0.518],
        [0.596, 0.508], [0.751, 0.322], [0.726, 0.758], [0.086, 0.72],
      ],
    },
    {
      name: "잿빛 채굴지",
      core: 18,
      alloy: 190,
      waves: 10,
      path: [
        [-0.04, 0.78], [0.18, 0.78], [0.18, 0.52], [0.5, 0.52],
        [0.5, 0.24], [0.84, 0.24], [0.84, 0.76], [1.04, 0.76],
      ],
      slots: [
        [0.316, 0.733], [0.11, 0.36], [0.316, 0.611], [0.063, 0.482],
        [0.34, 0.476], [0.364, 0.38], [0.636, 0.38], [0.636, 0.29],
        [0.704, 0.5],
      ],
    },
    {
      name: "식민지 관문",
      core: 22,
      alloy: 215,
      waves: 10,
      path: [
        [0.02, 0.1], [0.86, 0.1], [0.86, 0.33], [0.22, 0.33],
        [0.22, 0.57], [0.78, 0.57], [0.78, 0.82], [0.06, 0.82],
      ],
      slots: [
        [0.314, 0.169], [0.709, 0.169], [0.745, 0.389], [0.444, 0.271],
        [0.115, 0.414], [0.325, 0.45], [0.5, 0.629], [0.679, 0.511],
        [0.65, 0.761], [0.46, 0.72],
      ],
    },
    {
      name: "감염된 정제소",
      core: 20,
      alloy: 225,
      waves: 10,
      path: [
        [0.02, 0.14], [0.36, 0.14], [0.36, 0.34], [0.15, 0.34],
        [0.15, 0.58], [0.78, 0.58], [0.78, 0.78], [0.42, 0.78],
        [0.42, 1.04],
      ],
      slots: [
        [0.57, 0.18], [0.455, 0.24], [0.442, 0.403], [0.263, 0.653],
        [0.465, 0.653], [0.667, 0.507], [0.715, 0.853], [0.654, 0.707],
        [0.206, 0.744], [0.09, 0.69],
      ],
    },
    {
      name: "심층 둥지 균열",
      core: 24,
      alloy: 240,
      waves: 10,
      path: [
        [0.5, -0.04], [0.5, 0.12], [0.15, 0.12], [0.15, 0.33],
        [0.85, 0.33], [0.85, 0.53], [0.22, 0.53], [0.22, 0.74],
        [0.72, 0.74], [0.72, 1.04],
      ],
      slots: [
        [0.66, 0.24], [0.272, 0.208], [0.226, 0.428], [0.724, 0.418],
        [0.774, 0.232], [0.535, 0.442], [0.31, 0.828], [0.47, 0.652],
        [0.545, 0.828], [0.796, 0.664],
      ],
    },
    {
      name: "궤도 추락지",
      core: 22,
      alloy: 250,
      waves: 10,
      path: [
        [-0.04, 0.22], [0.22, 0.22], [0.22, 0.1], [0.78, 0.1],
        [0.78, 0.36], [0.38, 0.36], [0.38, 0.62], [0.9, 0.62],
        [0.9, 0.84], [0.12, 0.84],
      ],
      slots: [
        [0.322, 0.272], [0.662, 0.191], [0.708, 0.42], [0.262, 0.407],
        [0.262, 0.573], [0.562, 0.56], [0.806, 0.56], [0.782, 0.763],
        [0.51, 0.78], [0.39, 0.71],
      ],
    },
    {
      name: "하이브 코어",
      core: 26,
      alloy: 265,
      waves: 10,
      path: [
        [0.04, 0.04], [0.92, 0.04], [0.92, 0.24], [0.12, 0.24],
        [0.12, 0.45], [0.82, 0.45], [0.82, 0.66], [0.18, 0.66],
        [0.18, 0.88], [0.98, 0.88],
      ],
      slots: [
        [0.2, 0.55], [0.48, 0.12], [0.802, 0.17], [0.365, 0.518],
        [0.47, 0.382], [0.694, 0.382], [0.682, 0.587], [0.5, 0.592],
        [0.298, 0.803], [0.58, 0.812], [0.62, 0.69],
      ],
    },
    {
      name: "심연 차단선",
      core: 28,
      alloy: 285,
      waves: 10,
      path: [
        [0.05, 0.08], [0.92, 0.08], [0.92, 0.24], [0.18, 0.24],
        [0.18, 0.44], [0.82, 0.44], [0.82, 0.66], [0.1, 0.66],
        [0.1, 0.86], [0.88, 0.86],
      ],
      slots: [
        [0.2, 0.36], [0.46, 0.14], [0.72, 0.18], [0.73, 0.37],
        [0.48, 0.34], [0.32, 0.52], [0.62, 0.56], [0.83, 0.6],
        [0.28, 0.76], [0.54, 0.78], [0.78, 0.79],
      ],
    },
    {
      name: "군락 심장실",
      core: 30,
      alloy: 300,
      waves: 10,
      path: [
        [0.5, -0.04], [0.5, 0.12], [0.12, 0.12], [0.12, 0.3],
        [0.86, 0.3], [0.86, 0.5], [0.2, 0.5], [0.2, 0.7],
        [0.78, 0.7], [0.78, 1.04],
      ],
      slots: [
        [0.61, 0.2], [0.31, 0.2], [0.24, 0.4], [0.5, 0.4],
        [0.77, 0.4], [0.68, 0.58], [0.42, 0.58], [0.3, 0.82],
        [0.55, 0.82], [0.82, 0.82],
      ],
    },
  ];

  const STAGE_RULES = [
    {
      summary: "기본 방어선을 복구하는 첫 전장입니다.",
      rule: "기본 규칙",
      group: {},
      hp: {},
    },
    {
      summary: "빠른 외계체가 중계소 잔해를 돌파합니다.",
      rule: "스키터 출현 증가",
      group: { skitter: 1.35 },
      hp: {},
    },
    {
      summary: "갑각형 적과 유충 무리가 단계적으로 몰려옵니다.",
      rule: "브루트 출현 증가",
      group: { brute: 1.2 },
      hp: {},
    },
    {
      summary: "거대 갑각 보스가 식민지 관문을 압박합니다.",
      rule: "보스 소환 주기 단축",
      group: { swarming: 1.15 },
      hp: {},
      bossCooldown: 0.82,
    },
    {
      summary: "오염된 정제 시설에서 유충과 고속 적이 밀려옵니다.",
      rule: "스웜링과 스키터 대량 출현",
      group: { swarming: 1.65, skitter: 1.35 },
      hp: {},
      extraGroups: [{ wave: 5, type: "swarming", count: 8, gap: 0.18 }],
    },
    {
      summary: "외계 둥지 균열에서 중갑 개체가 단계적으로 증원됩니다.",
      rule: "갑각 적 증원",
      group: { brute: 1.45, lurker: 1.15 },
      hp: {},
      extraGroups: [{ wave: 5, type: "brute", count: 1, gap: 1.0 }],
    },
    {
      summary: "궤도 잔해 사이로 빠른 생명체와 갑각 무리가 흩어져 침투합니다.",
      rule: "혼합 웨이브 강화",
      group: { skitter: 1.35, brute: 1.25, lurker: 1.2 },
      hp: {},
      extraGroups: [{ wave: 6, type: "skitter", count: 5, gap: 0.32 }],
    },
    {
      summary: "하이브 심장부에서 모든 외계 생명체가 강화된 상태로 진격합니다.",
      rule: "최종 총력전",
      group: { swarming: 1.4, skitter: 1.35, brute: 1.5, lurker: 1.25 },
      hp: {},
      bossCooldown: 0.72,
      extraGroups: [
        { wave: 7, type: "swarming", count: 10, gap: 0.16 },
        { wave: 6, type: "brute", count: 2, gap: 0.9 },
      ],
    },
    {
      summary: "하이브 외곽 차단선에서 강화된 혼성 군단이 다중 구역을 압박합니다.",
      rule: "혼성 공세 증폭",
      group: { swarming: 1.5, skitter: 1.45, brute: 1.35, lurker: 1.3 },
      hp: {},
      bossCooldown: 0.66,
      extraGroups: [
        { wave: 6, type: "skitter", count: 8, gap: 0.24 },
        { wave: 7, type: "brute", count: 2, gap: 0.85 },
      ],
    },
    {
      summary: "군락 심장실에서 모든 개체와 중무장 파동이 연속 투입됩니다.",
      rule: "최종 붕괴 전선",
      group: { swarming: 1.65, skitter: 1.5, brute: 1.55, lurker: 1.35 },
      hp: {},
      bossCooldown: 0.58,
      extraGroups: [
        { wave: 7, type: "swarming", count: 12, gap: 0.14 },
        { wave: 6, type: "brute", count: 3, gap: 0.82 },
        { wave: 9, type: "skitter", count: 10, gap: 0.22 },
      ],
    },
  ];

  const RESEARCH_DEFS = [
    { id: "core", name: "코어 장갑 보강", desc: "스테이지 시작 코어 내구도가 레벨마다 2 증가합니다.", max: 5, baseCost: 2, tier: 1 },
    { id: "alloy", name: "초기 합금 비축", desc: "스테이지 시작 합금이 레벨마다 25 증가합니다.", max: 5, baseCost: 2, tier: 1 },
    { id: "pulse", name: "펄스 탄자 개량", desc: "펄스 캐논 피해량이 레벨마다 8% 증가합니다.", max: 5, baseCost: 2, tier: 1 },
    { id: "laser", name: "레이저 집속 렌즈", desc: "레이저 랜스 피해량이 레벨마다 8% 증가합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "targeting", name: "표적 분석", desc: "모든 타워의 피해량이 레벨마다 2% 증가합니다.", max: 5, baseCost: 2, tier: 1 },

    { id: "salvage", name: "합금 회수 프로토콜", desc: "적 처치 시 얻는 합금이 레벨마다 4% 증가합니다.", max: 5, baseCost: 3, tier: 2, requires: { parents: [{ id: "alloy", level: 2 }] } },
    { id: "capacitors", name: "축전 배치 공정", desc: "타워 배치 비용이 레벨마다 3% 감소합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "plasma", name: "플라즈마 압축탄", desc: "플라즈마 박격포 폭발 범위가 레벨마다 6% 증가합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "cryo", name: "극저온 냉각 코어", desc: "크라이오 필드의 감속 효과가 레벨마다 강해집니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "arc", name: "아크 방전 증폭기", desc: "아크 테슬라 피해량이 레벨마다 8% 증가합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "rail", name: "레일 가속 포구", desc: "레일 스파이어 피해량이 레벨마다 8% 증가합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "gravity", name: "중력 우물 조율기", desc: "중력 앵커의 흡인 반경과 흡인력이 레벨마다 6% 증가합니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "beacon", name: "비콘 증폭 회로", desc: "전술 비콘의 지원 피해와 주기 보정이 레벨마다 3%p 강화됩니다.", max: 5, baseCost: 3, tier: 1 },
    { id: "ballistics", name: "탄도 가속기", desc: "발사체 속도가 레벨마다 8% 증가합니다.", max: 5, baseCost: 3, tier: 1 },

    { id: "range", name: "궤도 조준 렌즈", desc: "모든 타워의 사거리가 레벨마다 4% 증가합니다.", max: 5, baseCost: 4, tier: 2, requires: { parents: [{ id: "ballistics", level: 2 }] } },
    { id: "cooldown", name: "과충전 회로", desc: "모든 타워의 공격 주기가 레벨마다 3% 짧아집니다.", max: 5, baseCost: 4, tier: 3, requires: { parents: [{ id: "range", level: 2 }] } },
    { id: "armorPierce", name: "장갑 관통 탄심", desc: "적 장갑을 레벨마다 2만큼 고정 감소시킨 뒤 피해를 계산합니다.", max: 5, baseCost: 4, tier: 4, requires: { parents: [{ id: "cooldown", level: 2 }] } },
    { id: "allDamage", name: "전술 증폭 매트릭스", desc: "모든 타워의 피해량이 레벨마다 4% 증가합니다.", max: 5, baseCost: 4, tier: 2, requires: { parents: [{ id: "targeting", level: 2 }] } },
    { id: "recycle", name: "재판매 정산", desc: "타워 판매 회수율이 레벨마다 5% 증가합니다.", max: 5, baseCost: 4, tier: 3, requires: { parents: [{ id: "salvage", level: 2 }] } },

    { id: "repair", name: "웨이브 간 자동 수리", desc: "웨이브 종료 시 코어를 레벨마다 1 회복합니다.", max: 4, baseCost: 5, tier: 2, requires: { parents: [{ id: "core", level: 2 }] } },
    { id: "fortress", name: "요새 코어 프로토콜", desc: "5초마다 1씩 회복되어 적 1기의 공격을 막는 코어 쉴드를 레벨마다 1 제공합니다.", max: 4, baseCost: 6, tier: 3, requires: { parents: [{ id: "repair", level: 2 }] } },
    { id: "bossBreaker", name: "거대 개체 분쇄", desc: "보스에게 주는 피해가 레벨마다 8% 증가합니다.", max: 4, baseCost: 5, tier: 3, requires: { parents: [{ id: "allDamage", level: 2 }] } },
    { id: "overdrive", name: "전장 과부하", desc: "웨이브 중 모든 타워 피해량이 레벨마다 3% 증가합니다.", max: 4, baseCost: 5, tier: 4, requires: { parents: [{ id: "bossBreaker", level: 2 }] } },
    { id: "waveBonus", name: "웨이브 회수 작전", desc: "웨이브 종료 보상이 레벨마다 5% 증가합니다.", max: 4, baseCost: 5, tier: 2, requires: { parents: [{ id: "capacitors", level: 2 }] } },
  ];

  const DEFAULT_RESEARCH = Object.fromEntries(RESEARCH_DEFS.map((item) => [item.id, 0]));

  const RESEARCH_LAYOUT = {
    core: [18, 10], repair: [50, 10], fortress: [82, 10],
    alloy: [18, 24], salvage: [50, 24], recycle: [82, 24],
    capacitors: [34, 38], waveBonus: [66, 38],
    targeting: [14, 52], allDamage: [38, 52], bossBreaker: [62, 52], overdrive: [86, 52],
    ballistics: [14, 66], range: [38, 66], cooldown: [62, 66], armorPierce: [86, 66],
    pulse: [14, 80], laser: [38, 80], plasma: [62, 80], cryo: [86, 80],
    arc: [14, 94], rail: [38, 94], gravity: [62, 94], beacon: [86, 94],
  };

  const RESEARCH_LINKS = RESEARCH_DEFS.flatMap((def) => (def.requires?.parents || []).map((parent) => [parent.id, def.id]));

  const DIFFICULTY_DEFS = {
    easy: { label: "Easy", hp: 0.8, reward: 1, desc: "적 체력 80%" },
    normal: { label: "Normal", hp: 1, reward: 1, desc: "적 체력 100% / 장갑 +1" },
    hard: { label: "Hard", hp: 2, reward: 1, desc: "적 체력 200% / 장갑 +3" },
    hell: { label: "Hell", hp: 3, reward: 1, desc: "적 체력 300% / 장갑 +5" },
  };

  const BRANCH_DEFS = {
    pulse: [
      { id: "pierce", name: "관통탄", desc: "명중 지점 주변 추가 적에게 45% 피해를 줍니다." },
      { id: "shock", name: "연격탄", desc: "공격이 2발씩 나갑니다." },
    ],
    laser: [
      { id: "overheat", name: "과열 광선", desc: "보스를 우선 조준하고 집중 공격 피해가 최대 3배까지 증가합니다." },
      { id: "prism", name: "분광 빔", desc: "근처 적 둘에게 약한 보조 광선을 연결합니다." },
    ],
    plasma: [
      { id: "wide", name: "대형 폭발", desc: "폭발 범위가 50% 증가합니다." },
      { id: "acid", name: "산성 잔류장", desc: "폭발 범위의 50% 장판을 남기고 3초 동안 1초마다 피해를 줍니다." },
    ],
    cryo: [
      { id: "freeze", name: "극저온 정지", desc: "감속이 추가로 10% 강화됩니다." },
      { id: "fracture", name: "빙결 지대", desc: "사거리가 30% 증가합니다." },
    ],
  };

  const SLOT_KINDS = [
    { id: "standard", name: "표준", color: "#54c6ff", desc: "기본 배치 슬롯입니다." },
    { id: "high", name: "고지대", color: "#ffc85a", desc: "사거리 +12%" },
    { id: "coolant", name: "냉각", color: "#7de9ff", desc: "공격 주기 -10%" },
    { id: "reactor", name: "반응로", color: "#ff5e6c", desc: "피해 +10%" },
    { id: "mineral", name: "광물", color: "#7dff8b", desc: "처치 합금 +25%" },
  ];


  Object.assign(DIFFICULTY_DEFS, window.OrbitDifficulties?.defs || {});

  window.OrbitGameData = {
    TOWER_DEFS,
    ENEMY_DEFS,
    STAGES,
    STAGE_RULES,
    RESEARCH_DEFS,
    DEFAULT_RESEARCH,
    RESEARCH_LAYOUT,
    RESEARCH_LINKS,
    DIFFICULTY_DEFS,
    BRANCH_DEFS,
    SLOT_KINDS,
  };
})();

(function () {
  "use strict";

  const data = window.OrbitGameData;
  if (!data) return;

  Object.assign(data.TOWER_DEFS, {
    arc: {
      name: "아크 테슬라",
      short: "아크",
      cost: 135,
      color: "#ffe46a",
      range: 130,
      cooldown: 1.4,
      damage: 30,
      chain: 3,
      chainRange: 78,
      stun: 0.1,
      upgrade: 112,
      role: "하나의 전하를 주변 적에게 연쇄하는 광역 제압 타워입니다.",
    },
    rail: {
      name: "레일 스파이어",
      short: "레일",
      cost: 170,
      color: "#7dff8b",
      range: 140,
      cooldown: 6,
      damage: 50,
      pierce: 3,
      upgrade: 145,
      role: "긴 사거리를 따라 적을 관통하는 중장거리 타워입니다.",
    },
    gravity: {
      name: "중력 앵커",
      short: "중력",
      cost: 200,
      color: "#6fffd2",
      range: 100,
      cooldown: 6,
      damage: 0,
      projectileSpeed: 240,
      pullRadius: 70,
      pullDuration: 1.5,
      pullStrength: 84,
      upgrade: 122,
      role: "적을 끌어당겨 이동을 제어하고 진형을 무너뜨리는 제어 타워입니다.",
    },
    beacon: {
      name: "전술 비콘",
      short: "비콘",
      cost: 145,
      color: "#ffcf6a",
      range: 100,
      cooldown: 1.6,
      damage: 0,
      auraDamage: 0.1,
      auraCooldown: 0.1,
      upgrade: 118,
      role: "주변 타워의 화력과 공격 주기를 보정하는 지원 타워입니다.",
    },
  });

  Object.assign(data.BRANCH_DEFS, {
    arc: [
      { id: "storm", name: "연쇄 증폭", desc: "연쇄 대상이 늘고 이웃한 적을 더 넓게 타격합니다." },
      { id: "surge", name: "과전류", desc: "정지 시간이 0.2초로 늘고 연쇄 피해 감소가 사라집니다." },
    ],
    rail: [
      { id: "breach", name: "관통 포격", desc: "관통 대상이 2기 늘고 장갑을 50% 무시합니다." },
      { id: "lock", name: "추적 고정", desc: "명중한 적에게 표식을 남겨 받는 피해를 늘립니다." },
    ],
    gravity: [
      { id: "singularity", name: "특이점 코어", desc: "제어 시간이 1초 증가합니다." },
      { id: "snare", name: "구속자", desc: "흡인 반경이 50% 증가합니다." },
    ],
    beacon: [
      { id: "amplify", name: "증폭", desc: "지원 범위가 넓어지고 주변 타워의 화력이 강화됩니다." },
      { id: "overclock", name: "과부하", desc: "주변 타워의 공격 보정이 더 강해집니다." },
    ],
  });
})();

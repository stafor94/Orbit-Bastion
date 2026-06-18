(function () {
  "use strict";

  const categories = [
    { id: "all", name: "전체" },
    { id: "economy", name: "자원" },
    { id: "offense", name: "화력" },
    { id: "control", name: "제어" },
    { id: "defense", name: "코어" },
    { id: "tactics", name: "전술" },
  ];

  const defs = {
    core: { name: "코어 장갑 보강", category: "defense", appliesTo: ["스테이지 시작", "코어 내구"], summary: "전장 시작 시 코어 내구를 안정적으로 보강합니다." },
    alloy: { name: "초기 합금 비축", category: "economy", appliesTo: ["스테이지 시작", "초기 자원"], summary: "초반 건설 선택지를 넓히는 기본 경제 연구입니다." },
    pulse: { name: "펄스 위상 개량", category: "offense", appliesTo: ["펄스 캐논"], summary: "단일 대상 화력을 안정적으로 끌어올립니다." },
    laser: { name: "레이저 집속 튜닝", category: "offense", appliesTo: ["레이저 랜스"], summary: "지속 추적 광선의 누적 피해를 강화합니다." },
    targeting: { name: "표적 분석", category: "tactics", appliesTo: ["모든 공격 타워"], summary: "공통 조준 보정으로 전체 타워 피해를 높입니다." },
    salvage: { name: "합금 회수 프로토콜", category: "economy", appliesTo: ["적 처치 보상"], summary: "처치 보상을 늘려 운영 여유를 만듭니다." },
    capacitors: { name: "축전 배치 공정", category: "economy", appliesTo: ["건설", "강화 비용"], summary: "타워 투자 비용을 줄여 전개 속도를 올립니다." },
    plasma: { name: "플라즈마 압축탄", category: "offense", appliesTo: ["플라즈마 박격포"], summary: "플라즈마 박격포의 폭발 범위를 넓혀 군집 처리력을 높입니다." },
    cryo: { name: "극저온 냉각 코어", category: "control", appliesTo: ["크라이오 필드"], summary: "감속 강도를 높여 제어 시간을 확보합니다." },
    arc: { name: "아크 방전 증폭기", category: "offense", appliesTo: ["아크 테슬라"], summary: "연쇄 방전의 기본 피해를 강화합니다." },
    rail: { name: "레일 가속 장치", category: "offense", appliesTo: ["레일 스파이어"], summary: "관통 타격의 단발 화력을 강화합니다." },
    gravity: { name: "중력 왜곡 조율기", category: "control", appliesTo: ["중력 앵커"], summary: "흡인 반경과 강도를 함께 강화합니다." },
    beacon: { name: "비콘 증폭 회로", category: "tactics", appliesTo: ["전술 비콘"], summary: "지원 피해와 공격 주기 보정을 동시에 끌어올립니다." },
    ballistics: { name: "기초 사거리 보정", category: "tactics", appliesTo: ["모든 타워"], summary: "초기 조준 보정으로 모든 타워의 기본 사거리를 넓힙니다." },
    range: { name: "궤도 조준 튜닝", category: "tactics", appliesTo: ["모든 타워"], summary: "사거리를 늘려 유효 화망을 넓힙니다." },
    cooldown: { name: "과충전 회로", category: "tactics", appliesTo: ["모든 타워"], summary: "공격 주기를 줄여 전반적인 처리량을 높입니다." },
    armorPierce: { name: "장갑 관통 제어", category: "offense", appliesTo: ["방어형 적 대응"], summary: "적 장갑을 고정 수치로 낮춰 피해 손실을 줄입니다." },
    allDamage: { name: "전술 증폭 매트릭스", category: "offense", appliesTo: ["모든 공격 타워"], summary: "모든 화력의 바닥값을 올리는 범용 강화입니다." },
    recycle: { name: "재활용 정산", category: "economy", appliesTo: ["판매 합금"], summary: "빌드 변경 부담을 줄여 운영 유연성을 높입니다." },
    repair: { name: "웨이브 간 자동 수리", category: "defense", appliesTo: ["웨이브 종료"], summary: "웨이브 종료 후 코어를 자동 복구합니다." },
    fortress: { name: "요새 코어 프로토콜", category: "defense", appliesTo: ["코어 쉴드"], summary: "시간이 지나면 재생되는 쉴드로 적의 코어 공격을 막습니다." },
    bossBreaker: { name: "거대 개체 분석", category: "offense", appliesTo: ["보스 대상"], summary: "보스전 화력을 끌어올리는 대형전 특화 연구입니다." },
    overdrive: { name: "전장 오버드라이브", category: "offense", appliesTo: ["웨이브 진행 중"], summary: "교전 중 전체 화력 상승폭을 확보합니다." },
    waveBonus: { name: "웨이브 보상 작전", category: "economy", appliesTo: ["웨이브 보상"], summary: "웨이브 완료 보상을 늘려 후반 성장에 힘을 보탭니다." },
  };

  window.OrbitResearchPresentation = {
    categories,
    defs,
  };
})();

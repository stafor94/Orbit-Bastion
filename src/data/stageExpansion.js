(function () {
  "use strict";

  const data = window.OrbitGameData;
  if (!data?.STAGES || !data?.STAGE_RULES) return;

  const extraStages = [
    {
      name: "\uc2ec\uc5f0 \ucc28\ub2e8\uc120",
      core: 28,
      alloy: 290,
      waves: 10,
      path: [[0, 1], [8, 1], [8, 3], [3, 3], [3, 5], [7, 5], [7, 7], [1, 7], [1, 10], [6, 10], [6, 11]],
      slots: [[8, 0], [0, 10], [5, 6], [8, 4], [6, 2], [2, 8], [4, 0], [3, 11], [4, 4], [2, 5], [8, 7], [0, 7]],
    },
    {
      name: "\uad70\ub77d \uc2ec\uc7a5\uc2e4",
      core: 30,
      alloy: 320,
      waves: 10,
      path: [[0, 1], [7, 1], [7, 3], [2, 3], [2, 5], [8, 5], [8, 8], [4, 8], [4, 10], [1, 10], [1, 11], [8, 11]],
      slots: [[8, 2], [0, 11], [4, 6], [6, 4], [2, 9], [6, 0], [4, 2], [1, 5], [5, 10], [3, 4], [7, 6], [3, 8], [6, 2]],
    },
  ];

  const extraRules = [
    {
      summary: "\ud558\uc774\ube0c \uc678\uacfd \ucc28\ub2e8\uc120\uc5d0\uc11c \uac15\ud654\ub41c \ud63c\uc131 \uad70\ub2e8\uc774 \ub2e4\uc911 \uad6c\uc5ed\uc744 \uc555\ubc15\ud569\ub2c8\ub2e4.",
      rule: "\ud63c\uc131 \uacf5\uc138 \uc99d\ud3ed",
      group: { swarming: 1.5, skitter: 1.45, brute: 1.35, lurker: 1.3 },
      hp: { lurker: 1.12, skitter: 1.18, brute: 1.28, colossus: 1.45 },
      bossCooldown: 0.66,
      extraGroups: [
        { wave: 4, type: "skitter", count: 8, gap: 0.24 },
        { wave: 7, type: "brute", count: 2, gap: 0.85 },
      ],
    },
    {
      summary: "\uad70\ub77d \uc2ec\uc7a5\uc2e4\uc5d0\uc11c \ubaa8\ub4e0 \uac1c\uccb4\uc640 \uc911\ubb34\uc7a5 \ud30c\ub3d9\uc774 \uc5f0\uc18d \ud22c\uc785\ub429\ub2c8\ub2e4.",
      rule: "\ucd5c\uc885 \ubd95\uad34 \uc804\uc120",
      group: { swarming: 1.65, skitter: 1.5, brute: 1.55, lurker: 1.35 },
      hp: { lurker: 1.2, skitter: 1.22, brute: 1.4, colossus: 1.55 },
      bossCooldown: 0.58,
      extraGroups: [
        { wave: 3, type: "swarming", count: 12, gap: 0.14 },
        { wave: 6, type: "brute", count: 3, gap: 0.82 },
        { wave: 9, type: "skitter", count: 10, gap: 0.22 },
      ],
    },
  ];

  extraStages.forEach((stage, index) => {
    const targetIndex = data.STAGES.length + index;
    if (!data.STAGES[targetIndex]) data.STAGES.push(stage);
  });

  extraRules.forEach((rule, index) => {
    const targetIndex = data.STAGE_RULES.length + index;
    if (!data.STAGE_RULES[targetIndex]) data.STAGE_RULES.push(rule);
  });
})();

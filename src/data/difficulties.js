(function () {
  "use strict";

  const defs = {
    easy: { label: "쉬움", hp: 0.8, reward: 1, desc: "적 체력 80%" },
    normal: { label: "보통", hp: 1, reward: 1, desc: "적 체력 100%" },
    hard: { label: "어려움", hp: 2, reward: 1, desc: "적 체력 200%" },
    hell: { label: "지옥", hp: 3, reward: 1, desc: "적 체력 300%" },
    nightmare: { label: "악몽", hp: 4, reward: 1, desc: "적 체력 400%" },
  };
  const order = ["easy", "normal", "hard", "hell", "nightmare"];

  const descriptions = {
    easy: "적 체력 80%",
    normal: "적 체력 100%",
    hard: "적 체력 200%",
    hell: "적 체력 300%",
    nightmare: "적 체력 400%",
  };

  window.OrbitDifficulties = {
    defs,
    order,
    describe(id) {
      return descriptions[id] || "";
    },
  };
})();

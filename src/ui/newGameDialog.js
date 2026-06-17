(function () {
  "use strict";

  function confirmNewGame({ root, onConfirm, playWarning }) {
    if (!root || typeof onConfirm !== "function") return;

    root.querySelector(".modal-backdrop")?.remove();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="초기화 확인">
        <div class="screen-header">
          <div class="screen-title">
            <span>진행 데이터</span>
            <h2>초기화</h2>
          </div>
          <button id="cancelNewGameButton" class="screen-close" type="button">닫기</button>
        </div>
        <p>모든 난이도 진행도와 연구 점수, 연구 단계가 전부 초기화됩니다. 정말 초기화하시겠습니까?</p>
        <div class="screen-actions">
          <button id="confirmNewGameButton" class="primary" type="button">초기화</button>
          <button id="cancelNewGameActionButton" type="button">취소</button>
        </div>
      </div>
    `;
    root.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector("#cancelNewGameButton")?.addEventListener("click", close);
    modal.querySelector("#cancelNewGameActionButton")?.addEventListener("click", close);
    modal.querySelector("#confirmNewGameButton")?.addEventListener("click", onConfirm);
    if (typeof playWarning === "function") playWarning();
  }

  function showDifficultyUnlock({ root, label, onClose }) {
    if (!root || !label) return;

    root.querySelector(".modal-backdrop")?.remove();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="난이도 해금">
        <div class="screen-header">
          <div class="screen-title">
            <span>난이도 해금</span>
            <h2>${label}</h2>
          </div>
          <button id="closeDifficultyUnlockButton" class="screen-close" type="button">닫기</button>
        </div>
        <p>${label} 난이도가 해금되었습니다. 기지 화면의 난이도 변경에서 바로 선택할 수 있습니다.</p>
        <div class="screen-actions">
          <button id="confirmDifficultyUnlockButton" class="primary" type="button">확인</button>
        </div>
      </div>
    `;
    root.appendChild(modal);

    const close = () => {
      modal.remove();
      if (typeof onClose === "function") onClose();
    };
    modal.querySelector("#closeDifficultyUnlockButton")?.addEventListener("click", close);
    modal.querySelector("#confirmDifficultyUnlockButton")?.addEventListener("click", close);
  }

  function confirmResearchReset({ root, title, refund, cascadeCount = 0, onConfirm }) {
    if (!root || typeof onConfirm !== "function") return;

    root.querySelector(".modal-backdrop")?.remove();

    const cascadeLine = cascadeCount ? `<p class="modal-note">연쇄 초기화로 다른 연구 ${cascadeCount}개도 함께 환급됩니다.</p>` : "";
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="연구 초기화 확인">
        <div class="screen-header">
          <div class="screen-title">
            <span>연구 초기화</span>
            <h2>${title}</h2>
          </div>
          <button id="cancelResearchResetButton" class="screen-close" type="button">닫기</button>
        </div>
        <p>${title}를 초기화하고 연구 점수 ${refund}점을 환급할까요?</p>
        ${cascadeLine}
        <div class="screen-actions">
          <button id="confirmResearchResetButton" class="primary" type="button">초기화</button>
          <button id="cancelResearchResetActionButton" type="button">취소</button>
        </div>
      </div>
    `;
    root.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector("#cancelResearchResetButton")?.addEventListener("click", close);
    modal.querySelector("#cancelResearchResetActionButton")?.addEventListener("click", close);
    modal.querySelector("#confirmResearchResetButton")?.addEventListener("click", onConfirm);
  }

  window.OrbitDialogs = {
    ...(window.OrbitDialogs || {}),
    confirmNewGame,
    confirmResearchReset,
    showDifficultyUnlock,
  };
})();

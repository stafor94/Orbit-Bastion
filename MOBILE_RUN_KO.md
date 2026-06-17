# Orbit Bastion 모바일 실행 방법

## 포함 파일

- `index.html`
- `styles/` 게임 화면 스타일
- `src/` 게임 로직, 데이터, UI, 렌더링 스크립트

## 모바일 브라우저에서 실행

1. 휴대폰에서 zip 파일을 압축 해제합니다.
   예: `Download/orbit-bastion`
2. 파일 관리자에서 `index.html`을 선택합니다.
3. 브라우저로 열어 게임을 시작합니다.

```text
file:///.../orbit-bastion/index.html
```

## QuickEdit 사용

- QuickEdit으로 `index.html`, `styles/main.css`, `src/main.js`를 수정할 수 있습니다.
- 수정 후 브라우저를 새로고침하면 반영됩니다.

## 참고

- 게임은 Python/Pyodide 없이 JavaScript 웨이브 생성기로 실행됩니다.
- 백업/복원은 기지 화면의 `백업`, `복원` 버튼에서 JSON 파일로 사용할 수 있습니다.

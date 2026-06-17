# Orbit Bastion 모바일 실행 방법

## 포함 파일

- `index.html`
- `styles/` 게임 화면 스타일
- `src/` 게임 로직, 데이터, UI, 렌더링 스크립트
- `python/wave_generator.py`
- `run_server_8009.py`

## Pydroid3에서 실행

1. 휴대폰에서 zip 파일을 압축 해제합니다.
   예: `Download/orbit-bastion`
2. Pydroid3에서 `run_server_8009.py` 파일을 엽니다.
3. 실행 버튼을 누릅니다.
4. 휴대폰 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:8009
```

## Pydroid3 터미널로 실행하는 방법

1. Pydroid3 터미널을 실행합니다.
2. 압축을 푼 폴더로 이동합니다.

```sh
cd /storage/emulated/0/Download/orbit-bastion
```

3. 로컬 서버 파일을 실행합니다.

```sh
python run_server_8009.py
```

4. 휴대폰 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:8009
```

## QuickEdit 사용

- QuickEdit으로 `index.html`, `styles/main.css`, `src/main.js`를 수정할 수 있습니다.
- 수정 후 브라우저를 새로고침하면 반영됩니다.
- 서버를 끄려면 Pydroid3 터미널에서 `Ctrl+C`를 누릅니다.

## 참고

- 인터넷이 연결되어 있으면 Pyodide가 `python/wave_generator.py`를 사용해 웨이브 데이터를 만듭니다.
- 인터넷이 없거나 Pyodide 로딩에 실패해도 게임은 JavaScript 기본 웨이브 생성기로 실행됩니다.
- 같은 와이파이에 있는 다른 기기에서 접속하려면 서버를 `python -m http.server 8000 --bind 0.0.0.0`로 실행하고, 휴대폰의 로컬 IP로 접속합니다.

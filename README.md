# Context Capture

Chrome 화면에서 원하는 영역을 드래그하면, 해당 웹페이지의 URL, 제목, 선택 영역의 텍스트, 링크, 이미지 alt, DOM 요약을 Markdown으로 만들어 Codex와 Claude Code에서 바로 쓸 수 있게 해주는 도구입니다.

결과는 두 군데로 전달됩니다.

- 현재 명령의 stdout
- macOS 클립보드

## 지원 환경

- macOS
- Google Chrome
- Node.js 20 이상
- Codex 또는 Claude Code

V1은 일반 웹페이지만 지원합니다. `chrome://` 페이지, 임의의 데스크톱 앱, OCR, 스크린샷 캡처는 지원하지 않습니다.

## 다운로드

```bash
git clone https://github.com/moonkey48/this-is-it.git
cd this-is-it
```

## 설치

```bash
scripts/install.sh
```

설치 스크립트가 하는 일:

- `~/.local/bin/context-capture` CLI 연결
- `~/.codex/skills/capture-web-context` 설치
- `~/.claude/skills/capture-web-context` 설치
- `~/.claude/commands/capture-context.md` 설치
- `context-capture doctor` 실행

기본 사용 흐름은 macOS Automation으로 실행 중인 Chrome의 활성 탭에 선택 오버레이를 직접 띄웁니다. 첫 실행 때 macOS가 터미널, Claude Code, 또는 Codex에 Google Chrome 제어 권한을 물어볼 수 있습니다. 허용해야 자동으로 오버레이가 뜹니다.

자동 주입이 막히는 환경을 대비해 Chrome 확장도 한 번 로드해두는 것을 권장합니다.

1. Chrome에서 `chrome://extensions` 열기
2. Developer mode 켜기
3. Load unpacked 클릭
4. 이 repo의 `extension/` 폴더 선택

## 사용법

Codex 또는 터미널에서:

```bash
context-capture request --timeout 60
```

Claude Code에서:

```text
/capture-context --timeout 60
```

명령이 대기 중일 때 실행 중인 Chrome의 활성 탭 위에 선택 오버레이가 뜹니다. 원하는 영역을 드래그하면 Markdown 결과가 stdout으로 출력되고 클립보드에도 복사됩니다.

오버레이가 뜨지 않으면:

1. macOS Automation 권한에서 현재 터미널, Claude Code, 또는 Codex가 Google Chrome을 제어할 수 있는지 확인하세요.
2. Chrome 확장을 로드한 상태라면, 명령이 대기 중일 때 Chrome 툴바의 Context Capture 확장 버튼을 클릭하세요.
3. 확장 버튼을 누르면 대기 중인 CLI 요청에 붙어서 stdout/clipboard 결과를 반환합니다.

## Codex에서 쓰기

Codex에서 웹페이지 일부를 참고해 작업하고 싶을 때:

```text
Use $capture-web-context to capture the selected Chrome page area, then use it as context.
```

또는 직접:

```bash
context-capture request --timeout 60
```

Codex는 stdout으로 나온 Markdown을 현재 작업의 근거 자료로 사용할 수 있습니다.

## Claude Code에서 쓰기

Claude Code에서는 slash command가 설치됩니다.

```text
/capture-context --timeout 60
```

출력된 Markdown을 Claude Code가 이어서 분석하거나 수정 작업의 참고 자료로 사용할 수 있습니다.

## 프로젝트 수정하기

Codex나 Claude Code에서 이 폴더를 열고 원하는 변경을 요청하면 됩니다.

```bash
cd this-is-it
codex
```

또는:

```bash
cd this-is-it
claude
```

자주 수정할 파일:

| 목적 | 파일 |
| --- | --- |
| CLI 명령, timeout, doctor | `bin/context-capture.js` |
| 로컬 HTTP 서버 | `src/server.js` |
| Markdown 출력 형태 | `src/format.js` |
| Chrome 선택 UI와 DOM 추출 | `extension/content-script.js` |
| Chrome 확장 권한/단축키 | `extension/manifest.json` |
| Codex/Claude 스킬 안내 | `skills/capture-web-context/SKILL.md` |
| Claude slash command | `integrations/claude/commands/capture-context.md` |
| 설치 동작 | `scripts/install.sh` |

수정 후 확인:

```bash
npm test
context-capture doctor
```

Chrome extension 파일을 수정했다면 `chrome://extensions`에서 Context Capture를 Reload 하세요.

## 업데이트

이미 설치한 사용자는 최신 코드를 받은 뒤 설치 스크립트를 다시 실행하면 됩니다.

```bash
git pull
scripts/install.sh
```

확장 파일이 바뀐 경우 Chrome extension도 Reload 하세요.

## 문제 해결

CLI가 안 잡힐 때:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

상태 점검:

```bash
context-capture doctor
```

포트가 사용 중일 때:

```bash
lsof -i :37421
```

오버레이가 뜨지 않을 때:

- 현재 탭이 일반 `https://` 웹페이지인지 확인하세요.
- macOS Automation 권한에서 현재 실행 앱이 Google Chrome을 제어할 수 있는지 확인하세요.
- Chrome 확장이 로드되어 있는지 확인하세요.
- 페이지를 새로고침한 뒤 다시 시도하세요.
- 명령이 대기 중일 때 Chrome 툴바의 Context Capture 확장 버튼을 클릭하세요.

## 개발 명령

```bash
npm test
node --check bin/context-capture.js
node --check extension/content-script.js
node --check extension/background.js
```

최신 캡처 결과는 아래에 최신 1건만 저장됩니다.

```text
/tmp/context-capture/latest.md
/tmp/context-capture/latest.json
```

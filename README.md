# Context Capture

Chrome에서 원하는 영역을 드래그해 URL, 제목, 선택 영역 텍스트, 링크, 이미지 alt, DOM 요약을 Markdown으로 캡처하는 도구입니다.

Claude Code와 Codex에서 공통으로 쓰기 위해 자동 브라우저 제어를 제거했습니다. 사용 흐름은 단순합니다.

1. Chrome 툴바의 `Context Capture` C 아이콘 클릭
2. 페이지에서 원하는 영역 드래그
3. 결과가 클립보드에 복사됨
4. Claude Code 또는 Codex에서 `context-capture latest`로 클립보드의 캡처 결과 읽기

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
- Chrome native messaging host 설치 (선택적 최신 파일 저장용)
- `~/.codex/skills/capture-web-context` 설치
- `~/.claude/skills/capture-web-context` 설치
- `~/.claude/commands/capture-context.md` 설치
- `context-capture doctor` 실행

그 다음 Chrome 확장을 한 번만 로드하세요.

1. Chrome에서 `chrome://extensions` 열기
2. Developer mode 켜기
3. Load unpacked 클릭
4. 이 repo의 `extension/` 폴더 선택
5. Chrome 툴바의 퍼즐 아이콘을 누르고 Context Capture를 pin 하기

## 사용법

Chrome에서:

1. 캡처하고 싶은 페이지를 엽니다.
2. 툴바의 `C` 아이콘을 클릭합니다.
3. 화면 상단에 `Drag to select the page area`가 보이면 영역을 드래그합니다.
4. 캡처 결과가 클립보드에 저장됩니다.

Codex 또는 터미널에서 최신 캡처 읽기:

```bash
context-capture latest
```

Claude Code에서:

```text
/capture-context
```

## Codex에서 쓰기

먼저 Chrome에서 `C` 아이콘으로 영역을 캡처한 뒤 Codex에서:

```text
Use $capture-web-context to read the latest captured Chrome context.
```

또는 직접:

```bash
context-capture latest
```

## Claude Code에서 쓰기

먼저 Chrome에서 `C` 아이콘으로 영역을 캡처한 뒤 Claude Code에서:

```text
/capture-context
```

## 상태 점검

```bash
context-capture doctor
```

`Chrome extension loaded`가 `[OK]`여야 합니다.

## 업데이트

```bash
git pull
scripts/install.sh
```

확장 파일이 바뀐 경우 `chrome://extensions`에서 Context Capture를 Reload 하세요.

## 문제 해결

CLI가 안 잡힐 때:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

확장이 로드되지 않았다고 나올 때:

- `chrome://extensions`에서 현재 checkout의 `extension/` 폴더가 Load unpacked 되었는지 확인하세요.
- 여러 checkout을 쓰는 경우 `doctor`에 표시되는 경로와 Chrome에 로드한 경로가 같아야 합니다.
- 툴바의 퍼즐 아이콘에서 Context Capture를 pin 하세요.

캡처 후 `latest`가 없다고 나올 때:

- 클립보드가 다른 내용으로 덮어써졌는지 확인하세요.
- Chrome 확장을 Reload 한 뒤 다시 캡처하세요.
- 선택적 파일 저장까지 필요하면 `scripts/install.sh`를 다시 실행해 native messaging host를 재설치하세요.

## 개발

자주 수정할 파일:

| 목적 | 파일 |
| --- | --- |
| CLI, doctor, latest | `bin/context-capture.js` |
| Native host 저장 로직 | `bin/context-capture-native-host.js` |
| Markdown 출력 형태 | `src/format.js` |
| Chrome 선택 UI와 DOM 추출 | `extension/content-script.js` |
| Chrome 확장 버튼/native messaging | `extension/background.js` |
| Chrome 확장 권한 | `extension/manifest.json` |
| Codex/Claude 스킬 안내 | `skills/capture-web-context/SKILL.md` |
| Claude slash command | `integrations/claude/commands/capture-context.md` |
| 설치 동작 | `scripts/install.sh` |

검증:

```bash
npm test
node --check bin/context-capture.js
node --check bin/context-capture-native-host.js
node --check extension/content-script.js
node --check extension/background.js
```

최신 캡처 결과는 아래에 최신 1건만 저장됩니다.

```text
/tmp/context-capture/latest.md
/tmp/context-capture/latest.json
```

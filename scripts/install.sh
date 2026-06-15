#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/.local/bin"
CODEX_SKILLS_DIR="${HOME}/.codex/skills"
CLAUDE_SKILLS_DIR="${HOME}/.claude/skills"
CLAUDE_COMMANDS_DIR="${HOME}/.claude/commands"

mkdir -p "${BIN_DIR}" "${CODEX_SKILLS_DIR}" "${CLAUDE_SKILLS_DIR}" "${CLAUDE_COMMANDS_DIR}"

ln -sfn "${ROOT}/bin/context-capture.js" "${BIN_DIR}/context-capture"
chmod +x "${ROOT}/bin/context-capture.js"

ln -sfn "${ROOT}/skills/capture-web-context" "${CODEX_SKILLS_DIR}/capture-web-context"
ln -sfn "${ROOT}/skills/capture-web-context" "${CLAUDE_SKILLS_DIR}/capture-web-context"

sed "s#__CONTEXT_CAPTURE_ROOT__#${ROOT//\\/\\\\}#g" \
  "${ROOT}/integrations/claude/commands/capture-context.md" \
  > "${CLAUDE_COMMANDS_DIR}/capture-context.md"

echo "Installed context-capture CLI to ${BIN_DIR}/context-capture"
echo "Installed Codex skill to ${CODEX_SKILLS_DIR}/capture-web-context"
echo "Installed Claude skill to ${CLAUDE_SKILLS_DIR}/capture-web-context"
echo "Installed Claude command to ${CLAUDE_COMMANDS_DIR}/capture-context.md"
echo
echo "Load the Chrome extension:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Click Load unpacked"
echo "  4. Select ${ROOT}/extension"
echo
node "${ROOT}/bin/context-capture.js" doctor || true

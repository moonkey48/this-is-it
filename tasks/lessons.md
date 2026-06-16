# Lessons

- Do not equate installing local agent files with installing or activating a Chrome integration. If a workflow depends on the currently running Chrome tab, provide a direct trigger path or make the manual browser step explicit and verifiable.
- Fallback instructions must match behavior. If a CLI says "click the extension button while waiting", that button must attach to the pending CLI request, not only copy a standalone capture to the clipboard.
- When injecting browser UI through AppleScript, do not rely on a separate extension CSS file. The injected script must create the visible styles and on-screen instructions itself.

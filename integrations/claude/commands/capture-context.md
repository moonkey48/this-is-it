---
description: Capture selected Chrome page area as URL, text, and DOM context
argument-hint: "[--timeout seconds]"
---

Run this Bash command and use its stdout as the captured web context:

```bash
node "__CONTEXT_CAPTURE_ROOT__/bin/context-capture.js" request $ARGUMENTS
```

If the command reports that no Chrome overlay appeared, tell the user to click the Context Capture Chrome extension button while the command is still waiting.

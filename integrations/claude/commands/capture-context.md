---
description: Read latest Chrome Context Capture result
argument-hint: ""
---

Tell the user to click the pinned Context Capture C icon in Chrome, drag a page area, then read the latest captured context with:

```bash
node "__CONTEXT_CAPTURE_ROOT__/bin/context-capture.js" latest
```

If no capture exists yet, run:

```bash
node "__CONTEXT_CAPTURE_ROOT__/bin/context-capture.js" capture
```

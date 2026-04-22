---
name: log
description: Show the last 20 Dreamlog entries (not just today's).
allowed-tools: ["Bash(node:*)"]
---

# Dreamlog — log

Show the reader their recent dream log.

1. Run `node ${CLAUDE_PLUGIN_ROOT}/bin/dreamlog-read.mjs log 20` via the Bash tool.
2. Print stdout verbatim — no commentary before or after.
3. If the user passed a number in `$ARGUMENTS`, use that instead of 20 (after clamping 1 ≤ n ≤ 100).

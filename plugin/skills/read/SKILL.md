---
name: read
description: Show today's Dreamlog entries in the editorial reading layout.
allowed-tools: ["Bash(node:*)"]
---

# Dreamlog — read

Show the reader today's dreams.

1. Run `node ${CLAUDE_PLUGIN_ROOT}/bin/dreamlog-read.mjs today` via the Bash tool.
2. Print the script's stdout to the user **verbatim** — do not add any commentary before or after. The script's output is the entire response.
3. If the script exits with an error, print the error message on its own line and nothing else.

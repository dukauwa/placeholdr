---
name: log
description: Show recent Dreamlog entries (last 20 by default).
allowed-tools: ["mcp__dreamlog__list_dreams"]
---

# Dreamlog — log

Show the reader their recent dream log in Claude Code's native text pane. Do NOT shell out — rendering subprocess output collides with the input buffer.

## Steps

1. Parse `$ARGUMENTS`. If it contains a positive integer, use it (clamped to 1-100) as the limit. Otherwise use 20.
2. Call `mcp__dreamlog__list_dreams` with `{ limit: <N> }`.
3. If `dreams` is empty, reply with exactly:

```
*the log is empty.*

try `/dreamlog:remember` to capture a fragment, then `/dreamlog:dream` when you have a few.
```

and stop.

4. Otherwise render using **the same template as `/dreamlog:read`**, except replace the header with:

```
*recent dreams · last <N>*
```

(no "morning letter" subtitle). Then emit each dream block exactly as in `/dreamlog:read` — italic caption, bold lowercase title, plain-prose body, blockquote citations, `---` between dreams.

## Do not

- Do not call any Bash or subprocess tools.
- Do not add commentary before or after the rendered log.
- Do not truncate bodies.

---
name: status
description: Show Dreamlog's counts, last dream time, and dream budget.
allowed-tools: ["mcp__dreamlog__stats"]
---

# Dreamlog — status

Show a one-line summary.

1. Call `mcp__dreamlog__stats`.
2. Reply in a single line, muted and quiet:
   `<memory_count> memories · <dream_count> dreams · last dreamt <relative-time-of-last_dream_at or "never"> · budget <dream_budget>/day`
3. Use a sensible relative time phrase ("4 hours ago", "yesterday", "2 days ago", "just now", etc.) derived from `last_dream_at`. If `last_dream_at` is null, say "never".
4. No other commentary.

---
name: demo
description: Load 41 sample memories and 3 pre-baked dreams so Dreamlog has something to show on first run.
disable-model-invocation: true
allowed-tools: ["mcp__dreamlog__load_demo"]
---

# Dreamlog — demo

Seed the Dreamlog store with demo content so the user can see what the ritual feels like before capturing their own.

1. Call `mcp__dreamlog__load_demo` with no arguments.
2. On success, reply with exactly:
   `loaded 41 memories and 3 sample dreams. try /dreamlog:read.`
3. If the tool errors, print the error and suggest running `/dreamlog:status`.

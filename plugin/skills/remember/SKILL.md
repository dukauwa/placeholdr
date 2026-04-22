---
name: remember
description: Capture a personal fragment (note, overheard, half-thought) into Dreamlog.
disable-model-invocation: true
allowed-tools: ["mcp__dreamlog__remember"]
---

# Dreamlog — remember

The user wants to capture a fragment for Dreamlog to cluster later.

1. The text to remember is in `$ARGUMENTS`.
2. If `$ARGUMENTS` is empty or only whitespace, ask: `what should I remember?` and wait for the user's next message. Treat that message as the content.
3. Call `mcp__dreamlog__remember` with `{ content: "<the verbatim text>", source: "paste" }`.
4. After the tool returns, reply with exactly one line in this format:
   `remembered. (<inserted> chunk<s>, <memory_count> memories total)`
   where `<inserted>` is the tool's returned `inserted` count and `<memory_count>` comes from a quick `mcp__dreamlog__stats` call.
5. Do not paraphrase, quote back, or comment on the content. Respect the ritual: brief, quiet acknowledgement.

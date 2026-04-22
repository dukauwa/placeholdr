---
name: remember-file
description: Ingest a text file on disk into Dreamlog as memories.
disable-model-invocation: true
allowed-tools: ["mcp__dreamlog__remember_file"]
---

# Dreamlog — remember-file

The user wants to ingest the contents of a file.

1. The path is in `$ARGUMENTS`. If empty, ask: `which file?` and wait.
2. Call `mcp__dreamlog__remember_file` with `{ path: "<the path verbatim>" }`.
3. If the tool errors (file not found, not readable, etc.), print the error message and stop.
4. On success, reply with one line: `ingested <basename>. (<inserted> chunks)`.
5. Do not read the file with other tools; `remember_file` handles it inside the plugin.

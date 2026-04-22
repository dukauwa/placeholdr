---
name: schedule
description: Install a 9am daily scheduler so Dreamlog generates tomorrow's dream before you sit down.
disable-model-invocation: true
allowed-tools: ["Bash(bash:*)"]
---

# Dreamlog — schedule

The user wants to install a platform scheduler so dreams are ready by 9am even before they open Claude Code.

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/bin/dreamlog-schedule.sh` via the Bash tool.
2. Print the script's stdout verbatim as the reply.
3. If the script indicates Windows (exit code 2 with the Windows message), point the user to `docs/windows-scheduling.md` in the plugin folder for a manual Task Scheduler recipe.

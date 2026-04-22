#!/usr/bin/env bash
#
# Dreamlog SessionStart hook.
#
# Emits a short nudge to Claude's context on the first session of the day
# if there are memories waiting and no dream yet for today. Otherwise exits
# silently. Never runs any AI.

set -u

# If sqlite3 CLI is missing, exit silently — the MCP server still works,
# we just can't do a zero-cost check here.
command -v sqlite3 >/dev/null 2>&1 || exit 0

DB="${DREAMLOG_HOME:-$HOME/.dreamlog}/dreamlog.db"

# First-run banner: no DB yet.
if [ ! -f "$DB" ]; then
  echo "Dreamlog is ready. Try \`/dreamlog:demo\` to see how it feels, then \`/dreamlog:remember <your text>\`."
  exit 0
fi

MEM_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM memories;" 2>/dev/null || echo 0)
if [ "${MEM_COUNT:-0}" -lt 3 ]; then
  exit 0
fi

# Dream already exists for today?
TODAY_COUNT=$(sqlite3 "$DB" \
  "SELECT COUNT(*) FROM dreams WHERE date(created_at,'localtime') = date('now','localtime');" \
  2>/dev/null || echo 0)
if [ "${TODAY_COUNT:-0}" -gt 0 ]; then
  exit 0
fi

# Nudge if past 9am local OR last dream was on a different day.
HOUR=$(date +%H)
LAST_DREAM_DATE=$(sqlite3 "$DB" \
  "SELECT COALESCE(date(MAX(created_at),'localtime'), '1970-01-01') FROM dreams;" \
  2>/dev/null || echo "1970-01-01")
TODAY_DATE=$(date +%Y-%m-%d)

if [ "$LAST_DREAM_DATE" = "$TODAY_DATE" ] && [ "${HOUR#0}" -lt 9 ]; then
  # Already dreamt today (edge case: we already exited above) OR pre-9am
  # on a day we haven't yet dreamt — stay quiet until 9am.
  exit 0
fi

echo "$MEM_COUNT memories waiting — say \`/dreamlog:dream\` to let me write today's dream."
exit 0

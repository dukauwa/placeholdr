#!/usr/bin/env bash
#
# Install a platform-appropriate daily scheduler that invokes Claude Code
# headlessly at 9am to run /dreamlog:dream. Uses the user's existing Claude
# Code auth — no API keys required.

set -euo pipefail

CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "error: could not find the \`claude\` CLI on your PATH."
  echo "install Claude Code and try again."
  exit 1
fi

DREAMLOG_HOME="${DREAMLOG_HOME:-$HOME/.dreamlog}"
mkdir -p "$DREAMLOG_HOME"

UNAME="$(uname -s)"

case "$UNAME" in
  Darwin)
    PLIST="$HOME/Library/LaunchAgents/dev.dreamlog.daily.plist"
    mkdir -p "$(dirname "$PLIST")"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.dreamlog.daily</string>
  <key>ProgramArguments</key>
    <array>
      <string>/bin/sh</string>
      <string>-c</string>
      <string>$CLAUDE_BIN -p "/dreamlog:dream"</string>
    </array>
  <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key><integer>9</integer>
      <key>Minute</key><integer>0</integer>
    </dict>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$DREAMLOG_HOME/schedule.log</string>
  <key>StandardErrorPath</key><string>$DREAMLOG_HOME/schedule.err</string>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "scheduled via launchd. runs at 9:00am daily."
    echo "logs: $DREAMLOG_HOME/schedule.log"
    echo "remove with /dreamlog:unschedule."
    ;;

  Linux)
    UNIT_DIR="$HOME/.config/systemd/user"
    mkdir -p "$UNIT_DIR"

    cat > "$UNIT_DIR/dreamlog.service" <<EOF
[Unit]
Description=Dreamlog daily dream

[Service]
Type=oneshot
ExecStart=/bin/sh -c '$CLAUDE_BIN -p "/dreamlog:dream" >> $DREAMLOG_HOME/schedule.log 2>&1'
EOF

    cat > "$UNIT_DIR/dreamlog.timer" <<EOF
[Unit]
Description=Run Dreamlog at 9am daily

[Timer]
OnCalendar=*-*-* 09:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl --user daemon-reload
    systemctl --user enable --now dreamlog.timer
    echo "scheduled via systemd user timer. runs at 9:00am daily."
    echo "logs: $DREAMLOG_HOME/schedule.log"
    echo "remove with /dreamlog:unschedule."
    ;;

  *)
    echo "Windows and other platforms aren't automatically supported yet."
    echo "see docs/windows-scheduling.md in the plugin folder for a manual recipe."
    exit 2
    ;;
esac

#!/usr/bin/env bash
#
# Remove the Dreamlog daily scheduler installed by dreamlog-schedule.sh.

set -u

UNAME="$(uname -s)"

case "$UNAME" in
  Darwin)
    PLIST="$HOME/Library/LaunchAgents/dev.dreamlog.daily.plist"
    if [ -f "$PLIST" ]; then
      launchctl unload "$PLIST" 2>/dev/null || true
      rm -f "$PLIST"
      echo "unscheduled. (launchd entry removed)"
    else
      echo "no launchd entry found. nothing to remove."
    fi
    ;;

  Linux)
    UNIT_DIR="$HOME/.config/systemd/user"
    if [ -f "$UNIT_DIR/dreamlog.timer" ] || [ -f "$UNIT_DIR/dreamlog.service" ]; then
      systemctl --user disable --now dreamlog.timer 2>/dev/null || true
      rm -f "$UNIT_DIR/dreamlog.timer" "$UNIT_DIR/dreamlog.service"
      systemctl --user daemon-reload
      echo "unscheduled. (systemd user timer removed)"
    else
      echo "no systemd timer found. nothing to remove."
    fi
    ;;

  *)
    echo "no scheduler was installed for this platform."
    ;;
esac

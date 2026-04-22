# Windows — manual 9am scheduling

Dreamlog's `/dreamlog:schedule` command auto-installs a daily job on macOS (launchd) and Linux (systemd). On Windows you'll set this up manually, once, via Task Scheduler.

## Requirements

- Claude Code installed and logged in (so `claude -p` works non-interactively from a command prompt)
- Your machine on at 9am most mornings (sleep is fine — Task Scheduler catches up when the machine wakes if you configure it to)

## Steps

1. Open **Task Scheduler** (press `Win`, type "Task Scheduler", hit Enter).
2. In the right-hand panel, click **Create Task…** (not "Create Basic Task" — we want the full dialog).
3. **General** tab:
   - Name: `Dreamlog daily dream`
   - Description: `Generate today's dream from captured memories`
   - Select **Run only when user is logged on** (simplest; `claude -p` reuses your login auth).
4. **Triggers** tab → **New…**:
   - Begin the task: `On a schedule`
   - Settings: `Daily`, Start at `9:00 AM`, Recur every `1 day`.
   - Check **Enabled**, then click OK.
5. **Actions** tab → **New…**:
   - Action: `Start a program`
   - Program/script: `claude` (or the full path to `claude.exe` if it's not on PATH — e.g. `C:\Users\YOU\AppData\Local\claude\claude.exe`)
   - Add arguments: `-p "/dreamlog:dream"`
   - Click OK.
6. **Conditions** tab:
   - Uncheck **Start the task only if the computer is on AC power** if you want it to run on battery too.
   - (Optional) Check **Wake the computer to run this task** if you want it to trigger even when asleep.
7. **Settings** tab:
   - Check **Run task as soon as possible after a scheduled start is missed** — this is the Windows equivalent of systemd's `Persistent=true`, so dreams catch up if your machine was off at 9am.
   - Leave the rest at defaults.
8. Click OK. Windows will ask for your account password — enter it so the task can run unattended.

## Testing

Back in Task Scheduler, find `Dreamlog daily dream` in the library, right-click, and choose **Run**. Open Claude Code a minute later and `/dreamlog:read` should show the dreams the task just wrote.

## Removing

Right-click the task → **Delete**.

---

If you'd like us to automate this via a PowerShell script in a future version, open an issue on the repo.

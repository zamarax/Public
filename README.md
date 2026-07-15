# Public Google Scripts

Self-updating [Google Apps Script](https://script.google.com) projects that sync their own code from this repo. No clasp, no OAuth tokens, no CLI tools — once set up, a script updates itself from here every few hours.

## Available scripts

| Script | What it does | Setup |
|--------|--------------|-------|
| [Gmail — Clean Up Sent Items](./Scripts/GoogleScripts/Google-Gmail-Clean-Up-Sent-Items.gs/) | Trashes old **sent emails** (message-level, not whole threads) once they exceed a configurable age. Handles old messages hidden inside threads that have a recent reply. | [README](./Scripts/GoogleScripts/Google-Gmail-Clean-Up-Sent-Items.gs/README.md) |
| [Google Drive — Clean Up Folders + Files](./Scripts/GoogleScripts/Google-Drive-Clean-Up-Folders+Files.gs/) | Trashes old **files** in specified Google Drive folders. Each folder gets its own retention window, with per-folder and **global** file-name exclusions so you can protect specific files anywhere. | [README](./Scripts/GoogleScripts/Google-Drive-Clean-Up-Folders+Files.gs/README.md) |

Both scripts share the same features:

- **Dry-run mode** — preview what would be deleted without touching anything
- **Configurable schedule** — daily / hourly / weekly on any weekday / every N minutes
- **Per-user settings** — your config lives in `UserConfig.gs` and is never overwritten by sync
- **Summary email** — a report after each run
- **Auto-sync** — the script pulls its own updates from this repo automatically; you only revisit the Apps Script editor to change settings or the schedule

## How to use one

1. Pick a script above and open its `README.md` for the full step-by-step setup.
2. In short: create a Google Apps Script project, paste in the `.gs` files + `Config.gs` + the `appsscript.json` manifest, link a GCP project, run `installAllTriggers()`, then run a dry-run `purge` to verify before going live.

## For the repo maintainer

The contents of this Public repo are published here automatically by a GitHub Actions workflow from a private source repo. To change what deployers see in a project's `README.md`, edit `README.public.md` in the private repo and push — the workflow republishes it here. The top-level `Scripts/GoogleScripts/README.md` index is also republished automatically.

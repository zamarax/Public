# Google Scripts (GitHub-pulled)

This folder contains Google Apps Script projects that automatically sync from GitHub.

## How It Works

```
Edit .gs / Config.gs / README.public.md in Personal (private) repo → git push → GitHub Actions copies to Public repo
                                                                                            ↓
                                                  Google Apps Script pulls the latest .gs + Config.gs on a schedule (every ~6 hours)
                                                  UserConfig.gs is NEVER touched — your personal settings are safe
```

No OAuth tokens, no clasp, no CLI tools, no secrets in Google Apps Script. Each script pulls its own code from a public GitHub raw URL and updates itself via the Apps Script API.

## Projects

| Folder | What it cleans | Key extras |
|--------|----------------|------------|
| [Google-Gmail-Clean-Up-Sent-Items.gs](./Google-Gmail-Clean-Up-Sent-Items.gs/) | Old **sent emails** (message-level, not whole threads) | Deep search, cross-label protection, summary email, weekday scheduling |
| [Google-Drive-Clean-Up-Folders+Files.gs](./Google-Drive-Clean-Up-Folders+Files.gs/) | Old **files** in specified Google Drive folders | Per-folder retention, per-folder **and global** file exclusions, summary email, weekday scheduling |

Both projects share the same architecture: `Config.gs` defaults (synced) + `UserConfig.gs` overrides (never synced), dry-run mode, batch continuation, and a self-updating GitHub sync triggered every ~6 hours.

## File layout per project

```
Scripts/GoogleScripts/<Your-Project-Name>.gs/
  <Your-Project-Name>.gs   ← main script, synced
  Config.gs                ← default settings, synced
  UserConfig.gs            ← personal overrides, NOT synced
  appsscript.json          ← OAuth manifest, synced
  README.md                ← owner-facing docs, NOT synced (Private only)
  README.public.md         ← deployer-facing docs, published as README.md in Public
```

## What the sync workflow copies to the Public repo

The workflow at `.github/workflows/sync-google-scripts.yml` copies, for each project subfolder:

- **All `.gs` files** (main script + `Config.gs` + `UserConfig.gs`)
- **`appsscript.json`** (so deployers can copy the manifest directly)
- **`README.public.md` → published as `README.md`** (deployer-facing — drops owner-only PAT/secret setup)

It also copies this top-level `Scripts/GoogleScripts/README.md` index as-is.

It does **NOT** copy each project's owner-facing `README.md` to Public — so editing your owner setup notes in Private will not clobber the public deployer README. Change `README.public.md` to update what deployers see.

## Adding a New Project

1. Create a subfolder matching the layout above. The folder name and main `.gs` file name must match (e.g. `My-Thing.gs/My-Thing.gs`).

2. In `Config.gs`, set `githubRawUrl` to the raw URL of the main `.gs` file on the **Public** repo:
   ```
   https://raw.githubusercontent.com/zamarax/Public/main/Scripts/GoogleScripts/<Your-Project-Name>.gs/<Your-Project-Name>.gs
   ```

3. Declare the OAuth scopes the script needs in `appsscript.json`. Remember: **both** the Google Apps Script API **and** any Google service API the script uses (e.g. Gmail, Drive) must be **enabled** on the linked GCP project, not just declared in the manifest.

4. Create a `README.md` (owner-facing, full setup incl. PAT/secret) **and** a `README.public.md` (deployer-facing, drops Steps 1 & 2). The workflow publishes `README.public.md` to Public as `README.md`.

5. Set `SYNCED_FILES` in the main `.gs` to `['<Your-Project-Name>', 'Config']` so the self-sync pulls the right files.

6. In Google Apps Script (script.google.com), create a new project, paste the `.gs` files + Config + UserConfig + manifest, and run `installAllTriggers()`.

7. Add the project to the table above, pushing the Private repo so the workflow syncs everything to Public.

## Uninstall

For any project, run `removeAllTriggers()` in its Apps Script editor. Files/emails already in Trash stay there per Google's own retention policy.

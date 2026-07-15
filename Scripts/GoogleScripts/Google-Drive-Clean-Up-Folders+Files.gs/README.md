# Google-Drive-Clean-Up-Folders+Files

Automatically trashes **files** in specified Google Drive folders once they are older than a configurable number of days, with per-folder and global file-name exclusions, deletion caps, dry-run mode, batch continuation, and post-run summary emails.

## Features

- **Per-folder retention** — each folder gets its own `deleteAfterDays`, so "Downloads" can purge after 30 days while "Shared" keeps files for 90
- **Identify by ID or name** — use the Drive folder ID (unambiguous) or the exact folder name
- **Folder-level file exclusions** — keep specific files safe in a specific folder (e.g. exclude `MyFile.doc` from "Shared" only)
- **Global file exclusions** — list a file once and it's protected in EVERY folder the script touches (the "global checker")
- **Age-based deletion** — a file becomes eligible when its last-modified date (`modifiedDate`) is older than `deleteAfterDays` days
- **Dry-run / simulation mode** — log exactly what would be trashed without moving anything to Trash
- **Deletion caps + batch continuation** — `maxDeletesPerRun` limits each run; the rest is picked up automatically on the next scheduled run
- **Post-execution summary email** — lists trashed, excluded, and errored files after each run
- **Configurable trigger schedule** — run daily, hourly, weekly on any weekday, or every N minutes
- **Auto-sync from GitHub** — the script pulls its own code from GitHub on a schedule, no tools or tokens needed
- **Per-user config** — your personal settings live in a separate file that is NEVER overwritten by sync

## Files in This Project

| File | Synced from GitHub? | Purpose |
|------|---------------------|---------|
| `Google-Drive-Clean-Up-Folders+Files.gs` | Yes | Main script code (trigger management, sync logic, purge logic, summary email) |
| `Config.gs` | Yes | Default settings — DO NOT edit this, changes are overwritten on sync |
| `UserConfig.gs` | **No** | YOUR personal settings — safe to edit, never overwritten by sync |
| `appsscript.json` | Yes | The Google Apps Script "manifest" file — lists the permissions the script needs |
| `README.md` | Yes | This file |

## How Auto-Sync Works

```
The maintainer pushes code to GitHub  →  a copy lands in THIS public repo  →  YOUR copy of the script in Google Apps Script pulls updates on a schedule
                                                                        ↑
                                                              UserConfig.gs is NEVER touched — your settings are safe
```

You don't need to clone the repo, run any CLI tools, or hold any tokens. Once set up, the script inside your Apps Script project fetches its own latest code from this public repo's raw URL every few hours and updates itself via the Apps Script API. Your personal settings in `UserConfig.gs` are never overwritten.

## Setup (Step by Step)

Follow these steps **in order**. Each step must be done before the next one.

---

### Step 1 — Create the Google Apps Script Project

1. Open this link: https://script.google.com
2. Click **New Project** (top left)
3. You see a code editor with a file called `Code.gs` containing one line of text
4. Click inside the code editor and press **Ctrl+A** to select everything, then press **Delete**
5. In this repo, open the file `Google-Drive-Clean-Up-Folders+Files.gs`
6. Copy ALL the text in that file (Ctrl+A, Ctrl+C)
7. Go back to the Apps Script editor and paste it (Ctrl+V)
8. Click the **Untitled project** name at the top and rename it to: `Google-Drive-Clean-Up-Folders+Files`
9. Click the **Save** button (floppy disk icon, or press Ctrl+S)
10. Click the **+** next to "Files" in the left sidebar → **Script**
11. Name the new file: `Config`
12. Open `Config.gs` from this repo, copy everything, paste into the new `Config` file in Apps Script
13. Click the **+** next to "Files" again → **Script**
14. Name the new file: `UserConfig`
15. Open `UserConfig.gs` from this repo, copy everything, paste into the new `UserConfig` file in Apps Script
16. Click **Save** (Ctrl+S)

You now have 3 `.gs` files in the Apps Script editor: the main script, `Config` (defaults), `UserConfig` (your overrides).

---

### Step 2 — Add the Manifest File (appsscript.json)

The script needs certain permissions. These are declared in a hidden "manifest" file. Make it visible, then paste in the contents.

**One-time: make the manifest visible**

1. In the Apps Script editor, click the **gear icon** (Project Settings) on the left sidebar
2. Find the setting **"Show appsscript.json manifest file in editor"** and check the box
3. Go back to the **Editor** (click the **<>** icon on the left sidebar)
4. You now see a new file called **`appsscript.json`** in the Files list

**Paste the manifest contents**

5. Click on `appsscript.json` to open it
6. Press **Ctrl+A** to select everything, then press **Delete**
7. Open `appsscript.json` from this repo, copy everything, paste it into the `appsscript.json` file in Apps Script
8. Click **Save** (Ctrl+S)

The exact contents you should paste are:

```json
{
  "timeZone": "America/New_York",
  "exceptionLogging": "CLOUD",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

**What each permission does:**

| Permission | What it lets the script do |
|------------|----------------------------|
| `drive` | List files in folders and move them to Drive Trash |
| `script.projects` | Update its own code from GitHub (the auto-sync feature) |
| `script.external_request` | Fetch code files from raw.githubusercontent.com |
| `script.scriptapp` | Create and read time-based triggers, get the script's OAuth token |
| `script.send_mail` | Send the post-run summary email via `MailApp.sendEmail()` |
| `userinfo.email` | Detect the signed-in account |

> The `drive` scope is the broad one (full Drive access). That's required because the script trashes files by name or ID in arbitrary folders, which per-file access can't do. Because this script runs under your own account, the broad scope only grants access to your own Drive.

---

### Step 3 — Link a GCP Project and Enable the Apps Script API

The sync function calls the Apps Script API to update its own code. Google creates a hidden GCP project for every Apps Script project, but you can't enable APIs on it (you don't have access). You need to link your own GCP project instead.

**Part A — Create a GCP project and enable the API:**

1. Go to https://console.cloud.google.com/
2. Click the project dropdown at the top → **New Project**
3. Name it something like `drive-purge` and click **Create**
4. Once created, open it (select it from the dropdown)
5. Copy the **Project Number** shown at the top of the dashboard (a long number like `123456789012`) — you'll need it soon
6. Go to **APIs & Services → Library** (left sidebar)
7. Search for **"Google Apps Script API"** and click it
8. Click **Enable**

**Part B — Configure the OAuth consent screen:**

1. In the Google Cloud Console, make sure your `drive-purge` project is still selected (dropdown at top)
2. Go to **APIs & Services → OAuth consent screen** (left sidebar)
3. Under **User Type**, select **External**
4. Click **Create**
5. Fill in the form:
   - **App name**: `DrivePurge`
   - **User support email**: select your email from the dropdown
   - **App logo**: skip (optional)
   - **Application home page**: can be left empty
   - **Application privacy policy page**: can be left empty
   - **Authorized domains**: leave empty
   - **Developer contact information**: enter your email again
6. Click **Save and Continue**
7. On the **Scopes** page — just click **Save and Continue**
8. On the **Audience** page, scroll to **Test users** → **+ Add Users** → type the email you use with Apps Script → **Add**
9. Click **Save and Continue**
10. Review the summary and click **Back to Dashboard**

You do NOT need to click "Publish App". Apps in **Testing** mode with yourself as a test user can use all scopes without verification.

> NOTE: The `drive` scope is **sensitive** (not restricted), so it does NOT require Google verification. If you're only using the script yourself you can stay in Testing mode indefinitely with yourself as the only test user.

**Part C — Link the GCP project to your Apps Script project:**

1. Go back to the Apps Script editor: https://script.google.com
2. Open your project (if not already open)
3. Click the **gear icon** (Project Settings) on the left sidebar
4. Scroll down to the **"Google Cloud Platform (GCP) Project"** section
5. Click **"Change project"**
6. Paste your GCP Project Number from Part A
7. Click **"Set project"**
8. Click **Confirm** / **OK** on the warning

---

### Step 4 — Run the Script for the First Time

**If you see "Access blocked" or "has not completed the Google verification process":** add your email as a test user (Step 3 Part B) and retry.

1. In the Apps Script editor, find the **function dropdown** at the top
2. Click the dropdown and select **`installAllTriggers`**
3. Click the **Run** button (triangle play icon)
4. A popup says **Authorization needed** → click **Review permissions**
5. Choose your Google account
6. If you see **Google hasn't verified this app** → click **Advanced** → click **Go to Google-Drive-Clean-Up (unsafe)**
7. Review the requested permissions (Drive, email, Apps Script projects, external requests, send email) and click **Allow**
8. Wait for the run to finish — you should see **"All triggers installed"** in the log

---

### Step 5 — Test the Sync from GitHub

1. Select **`syncFromGitHub`** from the function dropdown at the top
2. Click **Run**
3. "All files are already up to date" = sync is working. "Script updated successfully" = it pulled a newer version from GitHub.
4. If you see an error, check that:
   - You enabled the Apps Script API in Step 3
   - The GCP project from Step 3 is the one linked to your Apps Script project
   - This public repo has the `.gs` files: https://github.com/zamarax/Public/tree/main/Scripts/GoogleScripts

---

### Step 6 — Configure Your Folders (UserConfig.gs)

This is where you tell the script WHICH folders to clean, how OLD files must be, and which files to protect. Edit **`UserConfig.gs`** — NOT `Config.gs`.

See the [Configuration](#configuration) section below for the full schema and the worked example.

---

### Step 7 — Test the Purge (Safe Dry Run)

1. Open **`UserConfig`** in Apps Script
2. Add `dryRun: true,` inside `USER_CONFIG`
3. **Save**
4. Select **`purge`** from the function dropdown → **Run**
5. Check the log for `[DRY RUN] Would trash ...` lines and a summary email of what WOULD be trashed
6. When happy, set `dryRun: false` and you're live

---

### You're Done!

From now on, the script in your Apps Script project updates itself automatically:

1. **Code updates** — when the maintainer publishes changes to this public repo, your Apps Script copy pulls them in within a few hours. You don't need to do anything, and you don't need write access to the repo.
2. **Your settings** — edit `UserConfig.gs` directly in the Apps Script editor. It is never overwritten by sync.

You only need to revisit the Apps Script editor to change **trigger schedules** or tweak **UserConfig.gs** settings (see the "Adjusting Triggers" section below).

---

## Configuration

All settings live in:

- **`Config.gs`** — default values, synced from GitHub (DO NOT edit in Apps Script)
- **`UserConfig.gs`** — your personalized overrides (safe to edit, never synced)

`UserConfig.gs` overrides `Config.gs` at runtime. Arrays like `targetFolders` are **replaced** (not merged), so set the full array in UserConfig.

### Worked Example (the motivating use case)

> "Folder = Shared, delete files older than 90 days, but exclude file named MyFile.doc from that folder, AND globally exclude template.docx everywhere."

```javascript
var USER_CONFIG = {
  targetFolders: [
    {
      name: 'Shared',
      deleteAfterDays: 90,
      excludeFiles: ['MyFile.doc']   // excluded ONLY from 'Shared'
    }
  ],
  globalExcludeFiles: ['template.docx'] // excluded from EVERY folder
}
```

### Available Settings

#### Target Folders (`targetFolders`)

Array of objects. Each entry is evaluated independently (in order). Every entry applies its OWN retention rules to the folder it identifies.

| Field | Required | Description |
|-------|----------|-------------|
| `id` | one of id/name | Drive folder ID (e.g. `1AbCD...`). Unambiguous — recommended. |
| `name` | one of id/name | Exact folder name. Matches folders you own; if multiple share the name, the first found is used (with a warning). |
| `deleteAfterDays` | yes | Trash files whose `modifiedDate` is older than this many days. |
| `excludeFiles` | no | Array of file names (case-insensitive, exact) and/or file IDs to protect **in this folder only**. Default `[]`. |

`targetFolders` example:

```javascript
targetFolders: [
  { id: '1AbCDefGhIjKlMnOpQrStUvWxYz0123456789', deleteAfterDays: 90, excludeFiles: ['MyFile.doc'] },
  { name: 'Downloads', deleteAfterDays: 30, excludeFiles: [] }
]
```

> **Non-recursive:** the script trashes files directly **in** a folder, not files nested inside its subfolders. To clean a subfolder, add it as its own `targetFolders` entry.

#### Global Excludes (`globalExcludeFiles`)

Array of file names and/or IDs protected across EVERY `targetFolders` entry. This is the "global checker" — add a file once and it's safe everywhere the script runs.

```javascript
globalExcludeFiles: ['template.docx', '-master.pptx', '1AbCDefGhIjKlMnOpQrStUvWxYz0123456789']
```

#### Limits, Dry-Run, Summary Email

| Property | Default | Description |
|----------|---------|-------------|
| `maxDeletesPerRun` | `50` | Max files trashed per execution. `0`/`null` = no cap. Remainder handled on the next scheduled run. |
| `dryRun` | `false` | `true` = log trashes without performing them. Summary email still sends simulated results. |
| `sendSummaryEmail` | `true` | Send a summary email after each run. |
| `summaryEmailTo` | (script owner email) | Recipient of the summary email. |
| `summaryEmailSubject` | `'Google Drive Clean-Up Report — Folder/File Purge'` | Subject prefix. |

#### Trigger Settings

| Property | Default | Description |
|----------|---------|-------------|
| `trigger.type` | `'days'` | Frequency unit: `'days'`, `'hours'`, `'weeks'`, or `'minutes'` |
| `trigger.value` | `1` | How often |
| `trigger.hour` | `2` | Hour of day (0-23) — only for `'days'` or `'weeks'` |
| `trigger.minute` | `0` | Minute past the hour (0-59) — only for `'days'` or `'weeks'` |
| `trigger.weekday` | (Monday) | Full English day name (`'SUNDAY'`..`'SATURDAY'`, case-insensitive) — only for `'weeks'`. Omit to default to Monday |
| `purgeMoreDelayMinutes` | `2` | Minutes before the batch-continuation trigger fires. |

### Full UserConfig.gs Example

```javascript
var USER_CONFIG = {
  targetFolders: [
    { name: 'Shared', deleteAfterDays: 90, excludeFiles: ['MyFile.doc'] },
    { name: 'Downloads', deleteAfterDays: 30 }
  ],
  globalExcludeFiles: ['template.docx'],
  dryRun: false,
  maxDeletesPerRun: 25,
  trigger: { type: 'weeks', value: 1, weekday: 'WEDNESDAY', hour: 20, minute: 0 },
  sendSummaryEmail: true,
  summaryEmailTo: 'my-email@example.com'
}
```

---

## Adjusting Triggers (When and How Often It Runs)

### The schedule block

```javascript
trigger: {
  type:    'days',    // 'days', 'hours', 'weeks', or 'minutes'
  value:   1,         // how many of the above to wait between runs
  hour:    2,         // 'days'/'weeks' only — hour of the day (0 to 23, 24-hour clock)
  minute:  0,         // 'days'/'weeks' only — minute past the hour (0 to 59)
  weekday: 'MONDAY'   // 'weeks' only — full day name (SUNDAY..SATURDAY), case-insensitive.
                      //            Omit to default to Monday.
}
```

### Recipes (copy one into UserConfig.gs, then run `installAllTriggers`)

**A) Every day at 2 AM** (default)

```javascript
trigger: { type: 'days', value: 1, hour: 2, minute: 0 },
```

**B) Every 12 hours**

```javascript
trigger: { type: 'hours', value: 12 },
```

**C) Once a week on Mondays at 3:30 AM**

```javascript
trigger: { type: 'weeks', value: 1, hour: 3, minute: 30 },
```

**D) Every Wednesday evening at 8 PM**

```javascript
trigger: { type: 'weeks', value: 1, weekday: 'WEDNESDAY', hour: 20, minute: 0 },
```

> **24-hour clock:** `20` = 8 PM (`17`=5 PM, `18`=6 PM, `22`=10 PM). Day name is any full English weekday (`SUNDAY`..`SATURDAY`), case-insensitive.

**E) Every 30 minutes** (testing only)

```javascript
trigger: { type: 'minutes', value: 30 },
```

### How to apply a schedule change

1. Edit `trigger:` inside `UserConfig.gs`
2. **Save** (Ctrl+S) — saving alone does NOT reschedule
3. Select **`installAllTriggers`** → **Run** — this is what actually sets the new schedule

### Turning it off

Select **`removeAllTriggers`** → **Run**. To turn it back on later, run `installAllTriggers` again.

---

## Functions

| Function | Description |
|----------|-------------|
| `installAllTriggers()` | Installs the purge trigger and the GitHub sync trigger. Run once after setup or after changing trigger settings. |
| `purge()` | Main purge function. Called automatically by the trigger or manually. |
| `purgeMore()` | Continuation wrapper for batch processing. Called automatically when more results remain. |
| `syncFromGitHub()` | Pulls the latest code from GitHub and updates the script + Config.gs if changed. UserConfig.gs is preserved. Called automatically by the sync trigger. |
| `removeAllTriggers()` | Removes all triggers. Run to uninstall the script. |

## Uninstall

Run `removeAllTriggers()` in the Apps Script editor to remove all scheduled triggers. Files already in Drive Trash are NOT emptied automatically — that happens per Drive's own 30-day trash-retention policy.

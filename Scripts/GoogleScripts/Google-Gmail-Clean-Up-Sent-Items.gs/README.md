# Google-Gmail-Clean-Up-Sent-Items

Automatically purges sent email messages older than a configurable number of days.

## Features

- **Configurable trigger schedule** — run daily, hourly, weekly, or every N minutes at a specific time
- **Deletion caps** — limit the number of emails deleted per run
- **Date-range filters** — only target threads within a specific date window
- **Post-execution summary email** — lists all deleted email subjects and dates after each run
- **Dry-run / simulation mode** — log exactly what would be deleted without actually trashing anything
- **Batch processing** — automatically continues across runs when large result sets are found
- **Cross-label protection** — skips threads you've filed under custom labels (e.g. "Important", "Legal") so replies never get trashed along with conversations you deliberately organized
- **Auto-sync from GitHub** — the script pulls its own code from GitHub on a schedule, no tools or tokens needed
- **Per-user config** — your personal settings live in a separate file that is NEVER overwritten by sync

## Files in This Project

| File | Synced from GitHub? | Purpose |
|------|---------------------|---------|
| `Google-Gmail-Clean-Up-Sent-Items.gs` | Yes | Main script code (trigger management, sync logic, purge logic, summary email) |
| `Config.gs` | Yes | Default settings — DO NOT edit this, changes are overwritten on sync |
| `UserConfig.gs` | **No** | YOUR personal settings — safe to edit, never overwritten by sync |
| `README.md` | Yes | This file |

## How Auto-Sync Works

```
Edit .gs or Config.gs → push to Personal (private) repo → GitHub Actions copies .gs + Config.gs to Public repo
                                                                                    ↓
                                                          Google Apps Script pulls Google-Gmail-Clean-Up-Sent-Items.gs + Config.gs every 6 hours
                                                          UserConfig.gs is NEVER touched — your settings are safe
```

No clasp, no OAuth, no secrets. The script fetches its own code from a public GitHub raw URL and updates itself via the Apps Script API.

## Setup (Step by Step)

Follow these steps **in order**. Each step must be done before the next one.

---

### Step 1 — Create a GitHub Personal Access Token

You only do this **once**. This token lets GitHub Actions copy files from your private repo to your public repo automatically.

1. Open this link in your browser: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. In the **Note** field, type: `Public repo sync`
4. Under **Select scopes**, check the **repo** box (this gives full repo access)
5. Click **Generate token** at the bottom
6. **Copy the token** that appears (starts with `ghp_`). You will NOT be able to see it again after leaving the page. Paste it somewhere safe temporarily.

---

### Step 2 — Add the Token to Your Private Repo as a Secret

You only do this **once**.

1. Open this link: https://github.com/zamarax/Personal/settings/secrets/actions
2. Click **New repository secret**
3. In the **Name** field, type: `PUBLIC_REPO_TOKEN`
4. In the **Secret** field, paste the token you copied in Step 1
5. Click **Add secret**
6. You can throw away your temporary copy of the token now — GitHub is storing it safely.

---

### Step 3 — Create the Google Apps Script Project

1. Open this link: https://script.google.com
2. Click **New Project** (top left)
3. You see a code editor with a file called `Code.gs` containing one line of text
4. Click inside the code editor and press **Ctrl+A** to select everything, then press **Delete**
5. In this repo, open the file `Google-Gmail-Clean-Up-Sent-Items.gs`
6. Copy ALL the text in that file (Ctrl+A, Ctrl+C)
7. Go back to the Apps Script editor and paste it (Ctrl+V)
8. Click the **Untitled project** name at the top and rename it to: `Google-Gmail-Clean-Up-Sent-Items`
9. Click the **Save** button (floppy disk icon, or press Ctrl+S)
10. Click the **+** next to "Files" in the left sidebar → **Script**
11. Name the new file: `Config`
12. Open `Config.gs` from this repo, copy everything, paste into the new `Config` file in Apps Script
13. Click the **+** next to "Files" again → **Script**
14. Name the new file: `UserConfig`
15. Open `UserConfig.gs` from this repo, copy everything, paste into the new `UserConfig` file in Apps Script
16. Click **Save** (Ctrl+S)

You now have 3 files in the Apps Script editor: `Code` (the main script), `Config` (defaults), `UserConfig` (your overrides).

---

### Step 4 — Show the Manifest File (appsscript.json)

The script needs certain permissions to update itself from GitHub. These are declared in a hidden manifest file. You need to make it visible so the script can use them.

1. In the Apps Script editor, click the **gear icon** (Project Settings) on the left sidebar
2. Find the setting **"Show appsscript.json manifest file in editor"** and check the box
3. Go back to the **Editor** (click the **<>** icon on the left sidebar)
4. You now see a new file called **`appsscript.json`** in the Files list
5. Click on `appsscript.json` to open it
6. Press **Ctrl+A** to select everything, then press **Delete**
7. Open `appsscript.json` from this repo, copy everything, paste it into the `appsscript.json` file in Apps Script
8. Click **Save** (Ctrl+S)

This file tells Google which permissions the script needs:
- `gmail.modify` — to search and trash emails
- `script.projects` — to update its own code from GitHub
- `script.external_request` — to fetch code from GitHub
- `script.scriptapp` — for triggers and tokens
- `script.send_mail` — to send summary emails via `MailApp.sendEmail()`

---

### Step 5 — Link a GCP Project and Enable the Apps Script API

The sync function calls the Apps Script API to update its own code. Google creates a hidden GCP project for every Apps Script project, but you can't enable APIs on it (you don't have access). You need to link your own GCP project instead.

**Part A — Create a GCP project and enable the API:**

1. Go to https://console.cloud.google.com/
2. Click the project dropdown at the top → **New Project**
3. Name it something like `gmail-purge` and click **Create**
4. Once created, open it (select it from the dropdown)
5. Copy the **Project Number** shown at the top of the dashboard (a long number like `123456789012`) — you'll need it soon
6. Go to **APIs & Services → Library** (left sidebar)
7. Search for **"Google Apps Script API"** and click it
8. Click **Enable**

**Part B — Configure the OAuth consent screen:**

Before you can link the GCP project to your Apps Script project, you must configure the OAuth consent screen. You do NOT need to get your app verified — that's for apps published to the public. A personal script in "Testing" mode only needs your own email added as a test user.

1. In the Google Cloud Console, make sure your `gmail-purge` project is still selected (dropdown at top)
2. Go to **APIs & Services → OAuth consent screen** (left sidebar)
3. Under **User Type**, select **External**
   - Note: "Internal" is only for Google Workspace accounts — personal Gmail accounts must use "External"
4. Click **Create**
5. Fill in the form:
   - **App name**: `GmailPurge`
   - **User support email**: select your email from the dropdown
   - **App logo**: skip (optional)
   - **Application home page**: can be left empty
   - **Application privacy policy page**: can be left empty
   - **Authorized domains**: leave empty
   - **Developer contact information**: enter your email again
6. Click **Save and Continue**
7. On the **Scopes** page — just click **Save and Continue** (don't add scopes here; the `appsscript.json` manifest declares them)
8. On the **Audience** page (also reachable from **OAuth consent screen → Audience** in the left sidebar), scroll to the **Test users** section:
   - Click **+ Add Users**
   - Type your email address (the same Gmail account you use with Apps Script)
   - Click **Add**
9. Click **Save and Continue**
10. Review the summary and click **Back to Dashboard**

You do NOT need to click "Publish App" or submit for verification. Apps in **Testing** mode with yourself added as a test user can use all scopes without verification. The "Google hasn't verified this app" warning you'll see later is expected — just bypass it.

**Part C — Link the GCP project to your Apps Script project:**

1. Go back to the Apps Script editor: https://script.google.com
2. Open your project (if not already open)
3. Click the **gear icon** (Project Settings) on the left sidebar
4. Scroll down to the **"Google Cloud Platform (GCP) Project"** section
5. Click **"Change project"**
6. Paste your GCP Project Number from Part A
7. Click **"Set project"**
8. A warning appears saying all user authentications for the old project will be revoked — this is normal, click **Confirm** or **OK**
9. Done — your Apps Script project now uses a GCP project where the Apps Script API is enabled

---

### Step 6 — Run the Script for the First Time

This installs the automatic schedules (purge + GitHub sync) and grants the permissions.

**If you see "Access blocked" or "has not completed the Google verification process":**

This means your email hasn't been added as a test user in the OAuth consent screen. Fix it:

1. Go to https://console.cloud.google.com/ → make sure your `gmail-purge` project is selected
2. Go to **APIs & Services → OAuth consent screen** (left sidebar)
3. Click on the **Audience** tab
4. Scroll down to the **Test users** section
5. Click **+ Add Users**
6. Add your email (`corey.zamara@gmail.com`) if it's not already there
7. Click **Save**
7. Go back to the Apps Script editor and try again

**To run the script:**

1. In the Apps Script editor, find the **function dropdown** at the top (it probably says `purge` or `CONFIG`)
2. Click the dropdown and select **`installAllTriggers`**
3. Click the **Run** button (triangle play icon)
4. A popup says **Authorization needed** → click **Review permissions**
5. Choose your Google account
6. A warning says **Google hasn't verified this app** → click **Advanced** → click **Go to Google-gmail-clean-up-sent-items (unsafe)**
7. Review the permissions requested (Gmail, email, Apps Script projects, external requests) and click **Allow**
8. Wait for the run to finish — you should see **"All triggers installed"** in the log

---

### Step 7 — Test the Sync from GitHub

Let's make sure the script can pull updates from GitHub.

1. In the Apps Script editor, go to **Execution log** (bottom of the screen)
2. Select **`syncFromGitHub`** from the function dropdown at the top
3. Click **Run**
4. Look at the log. If it says **"All files are already up to date"**, the sync is working
5. If it says **"Script updated successfully from GitHub"**, that means there was a newer version on GitHub and it just pulled it in
6. If you see a warning or error, check that:
   - You enabled the Apps Script API in Step 4
   - The GitHub Actions workflow ran (check https://github.com/zamarax/Personal/actions)
   - The Public repo has the `.gs` files: https://github.com/zamarax/Public/tree/main/Scripts/GoogleScripts

---

### Step 8 — Customize Your Settings (Optional)

Want to change how the script behaves? Edit **`UserConfig.gs`** — NOT `Config.gs`.

1. In the Apps Script editor, open the **`UserConfig`** file in the left sidebar
2. You see a list of commented-out example settings
3. Remove the `//` comment markers from any setting you want to change
4. For example, to change from 1825 days to 90 days:
   ```javascript
   var USER_CONFIG = {
     deleteAfterDays: 90,
   }
   ```
5. Only include the values you want to change — everything else uses the defaults from `Config.gs`
6. Click **Save** (Ctrl+S)
7. Your settings will NOT be overwritten when the script syncs from GitHub

---

### Step 9 — Test the Purge (Safe Dry Run)

Let's test the email deletion WITHOUT actually deleting anything first.

1. Open the **`UserConfig`** file in Apps Script
2. Add this line inside the `USER_CONFIG` object: `dryRun: true,`
3. Click **Save**
4. Select **`purge`** from the function dropdown and click **Run**
5. Check the execution log — you should see lines like **"[DRY RUN] Would delete: ..."**
6. You will also get a summary email listing the emails that WOULD have been deleted
7. When you're happy it works correctly, change `dryRun: true` to `dryRun: false` in `UserConfig.gs`, save, and you're live

---

### You're Done!

From now on, the flow is:

1. **Code updates**: Edit `Google-Gmail-Clean-Up-Sent-Items.gs` or `Config.gs` in the Personal repo → push to GitHub → within 6 hours the script in Google Apps Script will update itself automatically
2. **Your settings**: Edit `UserConfig.gs` directly in the Apps Script editor — it is never overwritten

No need to ever open the Apps Script editor for code updates (unless you want to change trigger schedules, in which case run `installAllTriggers` again after the sync pulls the new code).

## Configuration

All settings live in two files:

- **`Config.gs`** — default values, synced from GitHub (DO NOT edit in Apps Script)
- **`UserConfig.gs`** — your personalized overrides (safe to edit, never synced)

The script merges them at runtime — `UserConfig.gs` values override `Config.gs` defaults. Only include the values you want to change in `UserConfig.gs`.

### Available Settings

#### Auto-Sync

| Property | Default | Description |
|----------|---------|-------------|
| `githubRawUrl` | raw.githubusercontent.com URL to this file on the Public repo | URL the script fetches to check for updates |
| `syncTrigger.type` | `'hours'` | Check frequency unit: `'hours'` or `'days'` |
| `syncTrigger.value` | `6` | How often to check for updates |

#### Deletion Thresholds and Filters

| Property | Default | Description |
|----------|---------|-------------|
| `deleteAfterDays` | `1825` | Purge messages older than this many days |
| `maxDeletesPerRun` | `50` | Maximum threads to delete per execution. Set to `0` or `null` for no cap |
| `dateRangeStart` | `null` | Only target threads on or after this date. Set to a `new Date(...)` or `null` for no start limit |
| `dateRangeEnd` | `null` | Only target threads on or before this date. Set to a `new Date(...)` or `null` for no end limit |

**Date range example (in UserConfig.gs):**
```javascript
var USER_CONFIG = {
  dateRangeStart: new Date(2020, 0, 1),    // Jan 1 2020
  dateRangeEnd:   new Date(2023, 11, 31),   // Dec 31 2023
}
```

#### Search Settings

| Property | Default | Description |
|----------|---------|-------------|
| `targetLabel` | `'^sent'` | Gmail search query identifying messages to purge. Use `^sent` for the built-in Sent mailbox (works with GmailApp.search). |
| `batchPageSize` | `150` | Max threads retrieved per Gmail search call (max 500) |
| `skipThreadsWithCustomLabels` | `true` | When `true`, threads with user-applied labels are skipped. This protects conversations you've filed under labels like "Important" or "Legal" from being trashed along with their Sent copy. Set to `false` to trash ALL old sent threads regardless of labels. |

#### Summary Email

| Property | Default | Description |
|----------|---------|-------------|
| `sendSummaryEmail` | `true` | Send a summary email after each run |
| `summaryEmailTo` | (script owner email) | Recipient address for the summary email |
| `summaryEmailSubject` | `'Gmail Clean-Up Report — Sent Items Purge'` | Subject line prefix for summary emails |

#### Dry-Run / Simulation Mode

| Property | Default | Description |
|----------|---------|-------------|
| `dryRun` | `false` | When `true`, logs what would be deleted but trashes nothing. Summary email is still sent with simulated results |

#### Trigger Settings

| Property | Default | Description |
|----------|---------|-------------|
| `trigger.type` | `'days'` | Frequency unit: `'days'`, `'hours'`, `'weeks'`, or `'minutes'` |
| `trigger.value` | `1` | How often (e.g. `1` = every 1 day, `2` = every 2 hours) |
| `trigger.hour` | `2` | Hour of day (0-23) — only for `'days'` or `'weeks'` |
| `trigger.minute` | `0` | Minute past the hour (0-59) — only for `'days'` or `'weeks'` |
| `purgeMoreDelayMinutes` | `2` | Minutes before batch continuation trigger fires |

**Trigger examples (in UserConfig.gs):**
```javascript
var USER_CONFIG = {
  // Every day at 2 AM
  trigger: { type: 'days', value: 1, hour: 2, minute: 0 },

  // Every 6 hours
  // trigger: { type: 'hours', value: 6 },

  // Every week on Monday at midnight
  // trigger: { type: 'weeks', value: 1, hour: 0, minute: 0 },

  // Every 30 minutes
  // trigger: { type: 'minutes', value: 30 },
}
```

After changing trigger settings, run `installAllTriggers` in the Apps Script editor to apply the new schedule.

### UserConfig.gs Example

Here is a full example showing several overrides at once:

```javascript
var USER_CONFIG = {
  deleteAfterDays: 365,           // delete after 1 year instead of 5
  maxDeletesPerRun: 25,           // only delete 25 per run
  dryRun: true,                   // test mode — nothing actually gets deleted
  trigger: {
    type: 'hours',
    value: 12
  },
  sendSummaryEmail: true,
  summaryEmailTo: 'my-email@example.com'
}
```

## Functions

| Function | Description |
|----------|-------------|
| `installAllTriggers()` | Installs both the purge trigger and the GitHub sync trigger. Run once after setup or after changing trigger settings. |
| `purge()` | Main purge function. Called automatically by the trigger or manually. |
| `purgeMore()` | Continuation wrapper for batch processing. Called automatically when more results remain. |
| `syncFromGitHub()` | Pulls the latest code from GitHub and updates the script + Config.gs if changed. UserConfig.gs is preserved. Called automatically by the sync trigger. |
| `removeAllTriggers()` | Removes all triggers. Run to uninstall the script. |

## Uninstall

Run `removeAllTriggers()` in the Apps Script editor to remove all scheduled triggers.

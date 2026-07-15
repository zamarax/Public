# Google-Gmail-Clean-Up-Sent-Items

Automatically purges old sent email **messages** (individual messages, not whole threads) that are older than a configurable number of days.

## Features

- **Message-level deletion** — trashes individual old sent messages within a thread, even if the thread has a recent reply. A 2020 message in a thread with a 2021 reply gets trashed while the 2021 reply stays intact.
- **Deep search** — searches recent threads too, not just old ones, to find old messages hiding inside threads with recent activity
- **Configurable trigger schedule** — run daily, hourly, weekly, or every N minutes at a specific time
- **Deletion caps** — limit the number of emails deleted per run
- **Date-range filters** — only target messages within a specific date window
- **Post-execution summary email** — lists all deleted email subjects and dates after each run
- **Dry-run / simulation mode** — log exactly what would be deleted without actually trashing anything
- **Batch processing** — automatically continues across runs when large result sets are found
- **Cross-label protection** — skips messages in threads you've filed under custom labels (e.g. "Important", "Legal") so conversations you deliberately organized are never touched
- **Multi-label search** — target the system Sent mailbox, custom labels, or both
- **Auto-sync from GitHub** — the script pulls its own code from GitHub on a schedule, no tools or tokens needed
- **Per-user config** — your personal settings live in a separate file that is NEVER overwritten by sync

## Files in This Project

| File | Synced from GitHub? | Purpose |
|------|---------------------|---------|
| `Google-Gmail-Clean-Up-Sent-Items.gs` | Yes | Main script code (trigger management, sync logic, purge logic, summary email) |
| `Config.gs` | Yes | Default settings — DO NOT edit this, changes are overwritten on sync |
| `UserConfig.gs` | **No** | YOUR personal settings — safe to edit, never overwritten by sync |
| `appsscript.json` | Yes | The Google Apps Script "manifest" file — lists the permissions the script needs |
| `README.md` | Yes | This file |

## How Auto-Sync Works

```
Edit .gs or Config.gs → push to Personal (private) repo → GitHub Actions copies .gs + Config.gs + appsscript.json to Public repo
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

You now have 3 `.gs` files in the Apps Script editor: `Code` (the main script), `Config` (defaults), `UserConfig` (your overrides).

---

### Step 4 — Add the Manifest File (appsscript.json)

The script needs certain permissions to update itself from GitHub and to send summary emails. These are declared in a hidden "manifest" file. You need to make it visible, then paste in the right contents.

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
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

**What each permission does:**

| Permission | What it lets the script do |
|------------|----------------------------|
| `gmail.modify` | Search your mail and move messages to the Trash |
| `script.projects` | Update its own code from GitHub (the auto-sync feature) |
| `script.external_request` | Fetch code files from raw.githubusercontent.com |
| `script.scriptapp` | Create and read time-based triggers, get the script's OAuth token |
| `script.send_mail` | Send the post-run summary email via `MailApp.sendEmail()` |
| `userinfo.email` | Detect the signed-in account (used for the "sent by me" filter) |

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
8. Go back to the Apps Script editor and try again

**To run the script:**

1. In the Apps Script editor, find the **function dropdown** at the top (it probably says `purge` or `CONFIG`)
2. Click the dropdown and select **`installAllTriggers`**
3. Click the **Run** button (triangle play icon)
4. A popup says **Authorization needed** → click **Review permissions**
5. Choose your Google account
6. A warning says **Google hasn't verified this app** → click **Advanced** → click **Go to Google-gmail-clean-up-sent-items (unsafe)**
7. Review the permissions requested (Gmail, email, Apps Script projects, external requests, send email) and click **Allow**
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
   - You enabled the Apps Script API in Step 5
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
5. Check the execution log — you should see lines like **"[DRY RUN] Would trash message: ..."**
6. You will also get a summary email listing the emails that WOULD have been trashed
7. When you're happy it works correctly, change `dryRun: true` to `dryRun: false` in `UserConfig.gs`, save, and you're live

---

### You're Done!

From now on, the flow is:

1. **Code updates**: Edit `Google-Gmail-Clean-Up-Sent-Items.gs` or `Config.gs` in the Personal repo → push to GitHub → within 6 hours the script in Google Apps Script will update itself automatically
2. **Your settings**: Edit `UserConfig.gs` directly in the Apps Script editor — it is never overwritten

No need to ever open the Apps Script editor for code updates. The *only* reason you ever need to revisit the Apps Script editor is to change **trigger schedules** or to tweak your **UserConfig.gs** settings (see the "Adjusting Triggers" section below).

---

## 🕒 Adjusting Triggers (When and How Often It Runs)

> **Plain-English version for absolute beginners.** Read this top-to-bottom even if you've never touched a script before.

### What is a "trigger"?

A **trigger** is just a timer that tells the script "wake up and run now." Gmail Clean-Up uses one trigger that fires **purge** (the cleanup) and another that fires **syncFromGitHub** (checks for code updates). Most people only care about the purge one.

### Where the schedule lives

The schedule for the **purge** is written down inside `Config.gs` (the defaults) and `UserConfig.gs` (your overrides). It looks like a tiny list of words. You don't need to install any software, edit a calendar, or call anyone — just change a few words in one file and click a button.

### The magic words

The schedule block looks like this and lives inside `UserConfig.gs`:

```javascript
trigger: {
  type:  'days',   // how to count: 'days', 'hours', 'weeks', or 'minutes'
  value: 1,        // how many of the above to wait between runs
  hour:  2,        // only used for 'days' and 'weeks' — the hour of the day (0 to 23)
  minute: 0        // only used for 'days' and 'weeks' — the minute past the hour (0 to 59)
}
```

Think of it as filling in a sentence: **"Run every `[value]` `[type]`, at `[hour]`:`[minute]`"** (the time only applies for days/weeks).

### Pick one of these four recipes — copy it into UserConfig.gs

**A) Every day at 2 AM** (this is the default — you can skip this if it's what you want)

```javascript
trigger: { type: 'days', value: 1, hour: 2, minute: 0 },
```

**B) Every 12 hours (twice a day)**

```javascript
trigger: { type: 'hours', value: 12 },
```

> For `hours` you do NOT need `hour` or `minute` — Google just fires it `value` hours after the previous run.

**C) Once a week on Mondays at 3:30 AM**

```javascript
trigger: { type: 'weeks', value: 1, hour: 3, minute: 30 },
```

**D) Every 30 minutes (for testing — not recommended long-term)**

```javascript
trigger: { type: 'minutes', value: 30 },
```

> Only use `minutes` while you're testing. Running every few minutes forever wastes your daily Apps Script quota.

### How to change it — step by step (think "find → change → save → press play")

1. In the Apps Script editor, click **`UserConfig`** in the left sidebar to open it.
2. Look for the block that starts with `trigger: {`. If it has `//` in front of each line, those lines are *off*. Remove the `//` to turn them on. If there is no `trigger` block at all, type one in yourself (copy a recipe from above).
3. Replace the four numbers/words with the ones from the recipe you picked above. Make sure your block sits **inside** the `var USER_CONFIG = { ... }` curly braces and that each line ends with a comma (`,` — like a list).
4. Click the **Save** button (the floppy-disk icon, top bar) or press **Ctrl+S**. **Nothing has been scheduled yet — saving only writes the new numbers into the file.**
5. At the top of the editor, click the dropdown that lists function names and pick **`installAllTriggers`**.
6. Click the **Run** button (the triangle play icon). This is the step that actually tells Google your new schedule. You'll see **"Purge trigger installed: every ..."** in the log when it worked.

> ⚠️ **The trigger will NOT change just by saving the file.** You must run `installAllTriggers` every time you change the schedule. The script reads the saved numbers when that function runs and hands them to Google.

### What if it doesn't run when I expect?

Quick checklist:

1. **Time zone** — the schedule uses **24-hour clock** in the time zone set in `appsscript.json` (`" America/New_York"` by default). `2` means **2 in the morning**, not 2 PM. Use `14` for 2 PM.
2. **Did you run `installAllTriggers`** after saving the new numbers? If not, the old schedule is still active.
3. **Look at the executions** — left sidebar → **Executions** (the clock icon). Each row shows when the script ran and why it ran (e.g. "time-driven").
4. **Apps Script limits** — Google allows only ~90 minutes of total script runtime per **day** for free accounts. Don't set a tiny interval; you'll exhaust the quota.
5. **Permissions** — if you changed `appsscript.json` scopes (rare), run `installAllTriggers` again so Google re-asks for permission.

### Removing the schedule (turning it off)

1. In the Apps Script editor, pick **`removeAllTriggers`** from the function dropdown.
2. Click **Run**. You'll see **"All triggers removed."**

After that, nothing runs automatically. Your settings are still saved — to turn it back on, run `installAllTriggers` again.

---

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
| `maxDeletesPerRun` | `50` | Maximum messages to delete per execution. Set to `0` or `null` for no cap |
| `dateRangeStart` | `null` | Only target messages on or after this date. Set to a `new Date(...)` or `null` for no start limit |
| `dateRangeEnd` | `null` | Only target messages on or before this date. Set to a `new Date(...)` or `null` for no end limit |

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
| `targetQueries` | `['^sent']` | Array of Gmail search queries. The script runs each query and deduplicates results. **Use `from:me` to also catch sent messages uploaded via IMAP** (e.g. emails sent from Outlook or Apple Mail that never lived in Gmail's native Sent mailbox). Use `^sent` for the built-in Sent mailbox only, `label:Name` for custom labels. |
| `targetLabel` | (deprecated) | Single-string version of `targetQueries`. If `targetQueries` is set, this is ignored. Kept for backwards compatibility. |
| `deepSearch` | `true` | When `true`, also searches recent threads (without `older_than`) and checks each message individually. This catches old messages inside threads that have a recent reply. Set to `false` to only purge messages in threads where the ENTIRE thread is older than the cutoff. |
| `batchPageSize` | `150` | Max threads retrieved per Gmail search call (max 500) |
| `skipThreadsWithCustomLabels` | `true` | When `true`, messages in threads with user-applied labels are skipped entirely. This protects conversations you've filed under labels like "Important" or "Legal". Set to `false` to trash old sent messages regardless of thread labels. |
| `allowLabels` | `[]` | Labels that are ALLOWED to be purged even when `skipThreadsWithCustomLabels` is `true`. List exact label names. Example: `allowLabels: ['Sent Messages']` allows purging threads with the "Sent Messages" custom label while still protecting threads with labels like "Personal/Important". |

##### A note on `from:me` vs `^sent` (important for IMAP users)

`^sent` only ever matches messages that live in **Gmail's built-in Sent mailbox**. If you also use an external email client (Outlook, Apple Mail, Thunderbird…) connected to Gmail over IMAP, the sent copies it creates are uploaded to Gmail but are **not** placed in the Sent mailbox — so `^sent` will never find them. `from:me` matches any message whose "From" address is your account, regardless of which folder/label Gmail filed it under. The `skipThreadsWithCustomLabels` setting (see above) keeps threads you've deliberately filed under labels safe.

The default `UserConfig.gs` uses `['from:me']` for this reason. Switch to `['^sent']` only if you exclusively send from the Gmail web interface/mobile app and never connect via IMAP.

#### Summary Email

| Property | Default | Description |
|----------|---------|-------------|
| `sendSummaryEmail` | `true` | Send a summary email after each run |
| `summaryEmailTo` | (script owner email) | Recipient address for the summary email |
| `summaryEmailSubject` | `'Gmail Clean-Up Report — Sent Items Purge'` | Subject line prefix for summary emails |

> If you see the error `Specified permissions are not sufficient to call MailApp.sendEmail`, the `script.send_mail` scope wasn't granted at authorization time. Re-paste the `appsscript.json` contents (Step 4), save, and re-run `installAllTriggers` to be re-prompted for the new permission. If you don't want summary emails at all, set `sendSummaryEmail: false` in `UserConfig.gs`.

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

> See the **"Adjusting Triggers"** section above for a beginner-friendly walkthrough on changing these.

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

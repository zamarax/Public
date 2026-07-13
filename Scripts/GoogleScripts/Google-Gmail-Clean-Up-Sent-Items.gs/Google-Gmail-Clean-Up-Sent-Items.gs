/* eslint-disable */

/**
 *============================================================================
 * Google-Gmail-Clean-Up-Sent-Items
 *============================================================================
 * Automatically purges sent email messages older than a configurable number
 * of days, with optional summary emails, deletion caps, date-range filters,
 * and dry-run simulation mode.
 *
 * Auto-Sync from GitHub:
 *   This script automatically updates itself by pulling the latest version
 *   from a public GitHub repository on a schedule.  Edit the code in the
 *   private repo, push to GitHub, and the sync function pulls it from the
 *   public repo automatically — no clasp or OAuth tokens needed.
 *
 * Configuration:
 *   Default settings live in Config.gs (synced from GitHub).
 *   Personal overrides live in UserConfig.gs (NEVER synced — safe to edit).
 *   The two are merged at runtime — UserConfig values override defaults.
 *
 *   See the README for setup instructions.
 *============================================================================
 */

// ===========================================================================
// CONFIG MERGE — combine defaults with user overrides
// ===========================================================================
// Apps Script does not guarantee file load order, so we cannot merge
// at the top level (DEFAULT_CONFIG may not exist yet).  Instead we
// build CONFIG lazily on first access via getConfig().

var _CONFIG = null

/**
 * Returns the merged config, building it on first call.  All functions
 * should call getConfig() instead of referencing CONFIG directly.
 *
 * @returns {Object}  The merged config object
 */
function getConfig() {
  if (_CONFIG) return _CONFIG

  var defaults = (typeof DEFAULT_CONFIG !== 'undefined') ? DEFAULT_CONFIG : {}
  var user = (typeof USER_CONFIG !== 'undefined') ? USER_CONFIG : {}

  _CONFIG = mergeConfig(defaults, user)
  return _CONFIG
}

/**
 * Deep-merges two config objects.  Values in `user` override values in
 * `defaults`.  Nested objects (like `trigger`) are merged recursively.
 *
 * @param {Object} defaults  The default config (from Config.gs)
 * @param {Object} user      The user overrides (from UserConfig.gs)
 * @returns {Object}         The merged config
 */
function mergeConfig(defaults, user) {
  var result = {}
  var key
  for (key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      result[key] = defaults[key]
    }
  }
  for (key in user) {
    if (user.hasOwnProperty(key)) {
      if (typeof user[key] === 'object' && user[key] !== null && !Array.isArray(user[key]) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = mergeConfig(result[key], user[key])
      } else {
        result[key] = user[key]
      }
    }
  }
  return result
}

// ===========================================================================
// Trigger Management
// ===========================================================================

/**
 * Installs all triggers: the recurring purge trigger AND the GitHub sync
 * trigger.
 *
 * Run this function manually once to install the script:
 *   Apps Script Editor -> select "installAllTriggers" -> click Run.
 */
function installAllTriggers() {
  removeAllTriggers()
  installPurgeTrigger()
  installSyncTrigger()
  console.info('All triggers installed (purge + sync).')
}

/**
 * Removes ALL of the project's triggers.
 * Run this function to completely uninstall the script.
 */
function removeAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i])
  }
  console.info('All triggers removed.')
}

/**
 * Installs the GitHub sync trigger based on getConfig().syncTrigger settings.
 */
function installSyncTrigger() {
  var s = getConfig().syncTrigger
  var builder = ScriptApp.newTrigger('syncFromGitHub').timeBased()

  if (s.type === 'hours') {
    builder.everyHours(s.value)
  } else if (s.type === 'days') {
    builder.everyDays(s.value)
  } else {
    throw new Error('syncTrigger type must be "hours" or "days"')
  }

  builder.create()
  console.info('Sync trigger installed: every ' + s.value + ' ' + s.type)
}

/**
 * Installs the purge trigger based on getConfig().trigger settings.
 */
function installPurgeTrigger() {
  var t = getConfig().trigger
  var triggerBuilder = ScriptApp.newTrigger('purge').timeBased()

  switch (t.type) {
    case 'days':
      triggerBuilder
        .everyDays(t.value)
        .atHour(t.hour || 0)
        .nearMinute(t.minute || 0)
      break
    case 'hours':
      triggerBuilder.everyHours(t.value)
      break
    case 'weeks':
      triggerBuilder
        .everyWeeks(t.value)
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(t.hour || 0)
        .nearMinute(t.minute || 0)
      break
    case 'minutes':
      triggerBuilder.everyMinutes(t.value)
      break
    default:
      throw new Error(
        'Unknown trigger type: ' + t.type +
        '. Use "days", "hours", "weeks", or "minutes".'
      )
  }

  triggerBuilder.create()
  console.info('Purge trigger installed: every ' + t.value + ' ' + t.type +
    (t.type === 'days' || t.type === 'weeks'
      ? ' at ' + (t.hour || 0) + ':' + String(t.minute || 0).padStart(2, '0')
      : ''))
}

/**
 * Creates a one-time continuation trigger that calls purgeMore after the
 * configured delay, allowing batch processing across multiple runs.
 */
function setPurgeMoreTrigger() {
  ScriptApp
    .newTrigger('purgeMore')
    .timeBased()
    .at(new Date(Date.now() + 1000 * 60 * getConfig().purgeMoreDelayMinutes))
    .create()
}

/** Removes all purgeMore continuation triggers. */
function removePurgeMoreTriggers() {
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'purgeMore') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
}

/** Removes all recurring purge triggers (but keeps purgeMore triggers). */
function removePurgeTriggers() {
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'purge') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
}

// ---------------------------------------------------------------------------
// GitHub Sync
// ---------------------------------------------------------------------------

// Files that are synced from GitHub (will be overwritten on update)
var SYNCED_FILES = ['Google-Gmail-Clean-Up-Sent-Items', 'Config']

// Files that are NEVER touched by sync (user's personal settings)
// 'UserConfig' is intentionally excluded from SYNCED_FILES so it's preserved

/**
 * Pulls the latest version of all synced files from GitHub and updates
  * This function is called on a schedule by the sync trigger.
 *
 * Required OAuth scopes (declared in appsscript.json manifest):
 *   script.projects       — call the Apps Script API to read/update files
 *   script.scriptapp      — ScriptApp.getScriptId() / getOAuthToken()
 *   script.external_request — UrlFetchApp.fetch() to GitHub
 */
function syncFromGitHub() {
  var baseUrl = getConfig().githubRawUrl
  var scriptId = ScriptApp.getScriptId()
  var api_url = 'https://scriptmanagement.googleapis.com/v1/projects/' + scriptId + '/content'
  var token = ScriptApp.getOAuthToken()

  // Fetch current project structure from Apps Script API
  var getResp = UrlFetchApp.fetch(api_url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  })

  if (getResp.getResponseCode() !== 200) {
    console.warn('Apps Script API returned HTTP ' + getResp.getResponseCode())
    console.warn(getResp.getContentText())
    return
  }

  var project = JSON.parse(getResp.getContentText())
  var files = project.files || []

  // Debug: list all files in the project
  console.info('Apps Script project files:')
  for (var df = 0; df < files.length; df++) {
    console.info('  [' + files[df].type + '] "' + files[df].name + '" (source length: ' + (files[df].source || '').length + ')')
  }

  // CRITICAL: Find and preserve the appsscript.json manifest file.
  // The updateContent API REPLACES ALL files — if we don't include the
  // manifest, the OAuth scopes get wiped and the script locks itself out.
  var manifestFile = null
  for (var m = 0; m < files.length; m++) {
    if (files[m].type === 'JSON') {
      manifestFile = files[m]
      break
    }
  }

  // Derive the GitHub raw base URL (replace the last segment)
  var lastSlash = baseUrl.lastIndexOf('/')
  var rawBase = baseUrl.substring(0, lastSlash + 1)

  // Track which files need updating
  var updates = {} // fileName -> new source code
  var anyChanged = false

  for (var f = 0; f < SYNCED_FILES.length; f++) {
    var syncName = SYNCED_FILES[f]
    var rawUrl = rawBase + syncName + '.gs'

    console.info('Checking: ' + rawUrl)
    var resp
    try {
      resp = UrlFetchApp.fetch(rawUrl, { muteHttpExceptions: true })
    } catch (e) {
      console.warn('Failed to fetch ' + syncName + ': ' + e.message)
      continue
    }

    if (resp.getResponseCode() !== 200) {
      console.warn('GitHub returned HTTP ' + resp.getResponseCode() + ' for ' + syncName)
      continue
    }

    var newCode = resp.getContentText()

    // Find the matching file in the current project
    var currentFile = null
    var matchName = syncName.toLowerCase()
    for (var i = 0; i < files.length; i++) {
      if (files[i].type === 'SERVER_JS' &&
          files[i].name.toLowerCase() === matchName) {
        currentFile = files[i]
        break
      }
    }

    // Compare — normalize whitespace to avoid false positives
    if (currentFile && currentFile.source.trim() === newCode.trim()) {
      console.info(syncName + '.gs is already up to date.')
      continue
    }

    if (currentFile) {
      updates[currentFile.name] = newCode
    } else {
      // Create a new file if it doesn't exist yet
      updates[syncName] = newCode
    }
    anyChanged = true
    console.info(syncName + '.gs has a new version available.')
  }

  if (!anyChanged) {
    console.info('All files are already up to date.')
    return
  }

  // Build the update payload:
  // - Include the manifest file (appsscript.json) so scopes are preserved
  // - Replace SERVER_JS files that have updates
  // - Preserve all other SERVER_JS files untouched (including UserConfig.gs)
  var updatePayload = { files: [] }
  var wasUpdated = {}

  // FIRST: always include the manifest (appsscript.json)
  if (manifestFile) {
    updatePayload.files.push({
      name: manifestFile.name,
      type: 'JSON',
      source: manifestFile.source
    })
  }

  // SECOND: include updated files
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      var currentFileInfo = null
      for (var k = 0; k < files.length; k++) {
        if (files[k].type === 'SERVER_JS' &&
            files[k].name.toLowerCase() === key.toLowerCase()) {
          currentFileInfo = files[k]
          break
        }
      }

      updatePayload.files.push({
        name: currentFileInfo ? currentFileInfo.name : key,
        type: 'SERVER_JS',
        source: updates[key]
      })
      wasUpdated[key.toLowerCase()] = true
    }
  }

  // THIRD: carry over all non-updated SERVER_JS files (preserves UserConfig.gs)
  for (var j = 0; j < files.length; j++) {
    if (files[j].type === 'JSON') continue  // manifest already included above
    if (wasUpdated[files[j].name.toLowerCase()]) continue
    updatePayload.files.push({
      name: files[j].name,
      type: files[j].type,
      source: files[j].source
    })
  }

  console.info('Updating ' + Object.keys(updates).length + ' file(s) from GitHub...')
  console.info('Preserving: UserConfig.gs and appsscript.json')

  var updateResp = UrlFetchApp.fetch(api_url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(updatePayload),
    muteHttpExceptions: true
  })

  if (updateResp.getResponseCode() === 200) {
    console.info('Script updated successfully from GitHub! ' +
      'Files updated: ' + Object.keys(updates).join(', ') +
      '. UserConfig.gs preserved.')
  } else {
    console.warn('Failed to update script. HTTP ' + updateResp.getResponseCode())
    console.warn(updateResp.getContentText())
  }
}

// ===========================================================================
// Purge Logic
// ===========================================================================

/** Continuation wrapper called by the batch trigger. */
function purgeMore() {
  purge()
}

/**
 * Main purge function.
 *
 * Operates at the MESSAGE level, not the thread level.  Gmail's
 * older_than: operator works on a thread's last message date, so a
 * thread with a recent reply won't match even if it contains very old
 * messages.  Instead, this function:
 *
 *   1. Searches ^sent (optionally with custom label queries too)
 *      WITHOUT older_than — just retrieves sent threads.
 *   2. Iterates every message in every thread.
 *   3. Trashes individual messages that are:
 *        - sent by the account owner (from == this account)
 *        - older than deleteAfterDays
 *        - within the optional date range
 *   4. Optionally skips messages in threads with custom labels.
 *
 * This means a thread from 2020 with a 2021 reply will still have
 * its 2020 messages trashed while leaving the 2021 reply intact.
 */
function purge() {
  removePurgeMoreTriggers()

  var queries = getConfig().targetQueries
  if (!queries) {
    queries = getConfig().targetLabel ? [getConfig().targetLabel] : ['^sent']
  }
  queries = queries.filter(function (q) { return q })

  console.info('Config targetQueries: ' + JSON.stringify(getConfig().targetQueries))
  console.info('Config targetLabel: ' + getConfig().targetLabel)
  console.info('Resolved queries: ' + JSON.stringify(queries))

  console.info('Mode: ' + (getConfig().dryRun ? 'DRY RUN (no deletions)' : 'LIVE'))

  var myEmail = Session.getActiveUser().getEmail().toLowerCase()
  var cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - getConfig().deleteAfterDays)
  console.info('Cutoff date: ' + cutoff.toISOString())

  if (getConfig().dateRangeStart || getConfig().dateRangeEnd) {
    console.info(
      'Date range filter: ' +
      (getConfig().dateRangeStart ? getConfig().dateRangeStart.toISOString() : '*') +
      ' to ' +
      (getConfig().dateRangeEnd ? getConfig().dateRangeEnd.toISOString() : '*')
    )
  }

  // Build search queries WITHOUT older_than — we filter per-message
  var searchBase = 'older_than:' + getConfig().deleteAfterDays + 'd'

  var seenIds = {}
  var threads = []
  var needsContinuation = false

  for (var q = 0; q < queries.length; q++) {
    // Append older_than so we only pull threads that HAVE old messages.
    // Gmail's older_than filters on thread last-message date, so this
    // won't miss threads like "Saddlewood Logo" (last msg 2021-08-13).
    // We then re-check each message individually inside the loop.
    var search = queries[q] + ' ' + searchBase
    console.info('Query: ' + search)
    var pageThreads = GmailApp.search(search, 0, getConfig().batchPageSize)
    console.info('  -> ' + pageThreads.length + ' threads matched')

    if (pageThreads.length === getConfig().batchPageSize) {
      needsContinuation = true
    }

    for (var i = 0; i < pageThreads.length; i++) {
      var id = pageThreads[i].getId()
      if (!seenIds[id]) {
        seenIds[id] = true
        threads.push(pageThreads[i])
      }
    }
  }

  // ALSO search ^sent newer_than:Nd to catch threads like "Saddlewood Logo"
  // where the thread's last message is recent but contains old sent messages.
  // Together with older_than, newer_than covers ALL sent threads:
  //   older_than:Nd  = threads where last message is older than N days
  //   newer_than:Nd  = threads where last message is newer than N days
  // We check each message individually inside the loop.
  if (getConfig().deepSearch) {
    var newerBase = 'newer_than:' + getConfig().deleteAfterDays + 'd'
    var deepPageSize = 500
    for (var q2 = 0; q2 < queries.length; q2++) {
      var broadSearch = queries[q2] + ' ' + newerBase
      console.info('Deep search: ' + broadSearch)
      var moreResults = true
      var pageStart = 0
      while (moreResults) {
        var broadThreads = GmailApp.search(broadSearch, pageStart, deepPageSize)
        console.info('  -> page ' + (pageStart / deepPageSize + 1) + ': ' + broadThreads.length + ' threads')
        for (var j = 0; j < broadThreads.length; j++) {
          var bid = broadThreads[j].getId()
          if (!seenIds[bid]) {
            seenIds[bid] = true
            threads.push(broadThreads[j])
          }
        }
        pageStart += broadThreads.length
        moreResults = (broadThreads.length === deepPageSize)
      }
      console.info('Deep search complete: ' + pageStart + ' total threads fetched')
    }

    // Diagnostic: search for threads with known old sent messages directly
    // to verify they're being found
    var diagSearch = '^sent older_than:1500d'
    console.info('Diagnostic search: ' + diagSearch)
    var diagThreads = GmailApp.search(diagSearch, 0, 50)
    console.info('  -> ' + diagThreads.length + ' threads older than 1500d')
    for (var dt = 0; dt < diagThreads.length; dt++) {
      var dthread = diagThreads[dt]
      var dmsgs = dthread.getMessages()
      var dlabels = dthread.getLabels().map(function (l) { return l.getName() })
      console.info('  DIAG: "' + dthread.getFirstMessageSubject() +
        '" msgCount=' + dmsgs.length +
        ' labels=[' + (dlabels.length ? dlabels.join(', ') : 'none') + ']')
    }
  }

  if (threads.length === 0) {
    console.info('No threads matching — nothing to purge.')
    return
  }

  if (needsContinuation) {
    console.log(
      'Batch page (' + getConfig().batchPageSize + ') fully consumed for at least one query. ' +
      'Scheduling continuation in ' + getConfig().purgeMoreDelayMinutes + ' min.'
    )
    setPurgeMoreTrigger()
  }

  console.info('Threads found (after dedup): ' + threads.length)

  var results = {
    deleted: [],
    skipped: 0,
    failed: [],
    capReached: false
  }

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t]
    var messages = thread.getMessages()
    var labels = thread.getLabels()
    var labelNames = labels.map(function (l) { return l.getName() }).join(', ')

    console.info('Thread: "' + thread.getFirstMessageSubject() +
      '" | messages=' + messages.length +
      (labelNames ? ' labels=[' + labelNames + ']' : ' labels=[none]'))

    // Skip threads with custom labels if configured
    if (getConfig().skipThreadsWithCustomLabels && labels.length > 0) {
      // Check if any label is in the allowLabels list
      var allowed = false
      var allowList = getConfig().allowLabels || []
      for (var al = 0; al < labels.length; al++) {
        if (allowList.indexOf(labels[al].getName()) !== -1) {
          allowed = true
          break
        }
      }

      if (!allowed) {
        console.log('  Skipping entire thread (protected labels): [' + labelNames + ']')
        results.skipped += messages.length
        continue
      } else {
        console.log('  Processing thread (label allowed): [' + labelNames + ']')
      }
    }

    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m]
      var msgDate = msg.getDate()
      var msgFrom = msg.getFrom()

      // Only trash messages sent by this account
      if (msgFrom.toLowerCase().indexOf(myEmail) === -1) {
        continue // not our sent message, skip silently
      }

      // Check age
      if (!msgDate || msgDate >= cutoff) {
        continue // too recent
      }

      // Debug: this message is BOTH sent by us AND old enough to trash
      console.log('  >> OLD SENT msg: date=' + msgDate.toISOString() +
        ' from=' + msgFrom.substring(0, 40) +
        ' subject="' + msg.getSubject() + '"')

      // Date range filters
      if (getConfig().dateRangeStart && msgDate < getConfig().dateRangeStart) {
        results.skipped++
        continue
      }
      if (getConfig().dateRangeEnd && msgDate > getConfig().dateRangeEnd) {
        results.skipped++
        continue
      }

      // Deletion cap
      if (getConfig().maxDeletesPerRun &&
          getConfig().maxDeletesPerRun > 0 &&
          results.deleted.length >= getConfig().maxDeletesPerRun) {
        results.capReached = true
        continue
      }

      var info = {
        subject: msg.getSubject(),
        date: msgDate,
        to: msg.getTo()
      }

      if (getConfig().dryRun) {
        console.log('  [DRY RUN] Would trash message: "' + info.subject +
          '" (' + info.date.toISOString() + ' to: ' + info.to + ')')
        results.deleted.push(info)
      } else {
        try {
          msg.moveToTrash()
          results.deleted.push(info)
          console.log('  Trashed: "' + info.subject + '" (' + info.date.toISOString() + ')')
        } catch (e) {
          console.warn('  Failed to trash message: ' + e.message)
          info.error = e.message
          results.failed.push(info)
        }
      }
    }
  }

  console.info(
    (getConfig().dryRun ? 'Simulated deletions: ' : 'Trashed: ') +
    results.deleted.length +
    ', Skipped: ' + results.skipped +
    ', Failed: ' + results.failed.length +
    (results.capReached ? ', Cap reached (' + getConfig().maxDeletesPerRun + ')' : '')
  )

  if (getConfig().sendSummaryEmail && results.deleted.length > 0) {
    try {
      sendSummary(results)
    } catch (emailErr) {
      console.warn('Failed to send summary email: ' + emailErr.message)
      console.warn('If this is a permissions error, run installAllTriggers in the Apps Script editor to re-authorize with the script.send_mail scope.')
    }
  }
}

// ===========================================================================
// Summary Email
// ===========================================================================

/**
 * Sends a summary email listing the subjects and dates of all messages
 * that were deleted (or would have been deleted in dry-run mode).
 *
 * @param {Object} results  Result object from purge().
 */
function sendSummary(results) {
  var mode = getConfig().dryRun ? '[DRY RUN] ' : ''
  var count = results.deleted.length
  var capNote = results.capReached
    ? '\n\nNote: The per-run deletion cap (' + getConfig().maxDeletesPerRun +
      ') was reached. Remaining messages will be processed in subsequent runs.'
    : ''

  var body = 'Gmail Clean-Up — Sent Items Purge Report\n'
  body += '=========================================\n\n'
  body += 'Mode: ' + (getConfig().dryRun ? 'DRY RUN (simulation — nothing was deleted)' : 'LIVE') + '\n'
  body += 'Date: ' + new Date().toISOString() + '\n'
  body += 'Messages ' + (getConfig().dryRun ? 'simulated' : 'deleted') + ': ' + count + '\n'
  body += 'Messages skipped: ' + results.skipped + '\n'
  if (results.failed.length > 0) {
    body += 'Messages failed: ' + results.failed.length + '\n'
  }
  body += capNote + '\n'
  body += '\n-----------------------------------------\n'
  body += 'Deleted Emails:\n'
  body += '-----------------------------------------\n\n'

  for (var i = 0; i < results.deleted.length; i++) {
    var item = results.deleted[i]
    body += (i + 1) + '. "' + item.subject + '"\n'
    body += '   Date: ' + item.date.toISOString() + '\n'
    if (item.to) {
      body += '   To: ' + item.to + '\n'
    }
    body += '\n'
  }

  if (results.failed.length > 0) {
    body += '\n-----------------------------------------\n'
    body += 'Failed Emails:\n'
    body += '-----------------------------------------\n\n'
    for (var j = 0; j < results.failed.length; j++) {
      var fail = results.failed[j]
      body += (j + 1) + '. "' + fail.subject + '"\n'
      body += '   Date: ' + fail.date.toISOString() + '\n'
      body += '   Error: ' + fail.error + '\n\n'
    }
  }

  MailApp.sendEmail({
    to: getConfig().summaryEmailTo,
    subject: mode + getConfig().summaryEmailSubject + ' — ' +
      new Date().toLocaleDateString(),
    body: body
  })

  console.info('Summary email sent to ' + getConfig().summaryEmailTo)
}

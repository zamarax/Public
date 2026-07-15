/* eslint-disable */

/**
 *============================================================================
 * Google-Drive-Clean-Up-Folders+Files
 *============================================================================
 * Automatically trashes files in specified Google Drive folders once they
 * are older than a configurable number of days, with per-folder and global
 * file-name exclusions, deletion caps, dry-run simulation mode, batch
 * continuation across runs, and post-run summary emails.
 *
 * Auto-Sync from GitHub:
 *   This script automatically updates itself by pulling the latest version
 *   from a public GitHub repository on a schedule. Edit the code in the
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
// at the top level (DEFAULT_CONFIG may not exist yet). Instead we
// build CONFIG lazily on first access via getConfig().

var _CONFIG = null

/**
 * Returns the merged config, building it on first call. All functions
 * should call getConfig() instead of referencing CONFIG directly.
 *
 * @returns {Object} The merged config object
 */
function getConfig() {
  if (_CONFIG) return _CONFIG

  var defaults = (typeof DEFAULT_CONFIG !== 'undefined') ? DEFAULT_CONFIG : {}
  var user = (typeof USER_CONFIG !== 'undefined') ? USER_CONFIG : {}

  _CONFIG = mergeConfig(defaults, user)
  return _CONFIG
}

/**
 * Deep-merges two config objects. Values in `user` override values in
 * `defaults`. Nested objects (like `trigger`) are merged recursively.
 * Arrays (like `targetFolders`) are REPLACED entirely — user arrays
 * do not get merged element-by-element with defaults.
 *
 * @param {Object} defaults The default config (from Config.gs)
 * @param {Object} user     The user overrides (from UserConfig.gs)
 * @returns {Object}        The merged config
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
      var weekdayMap = {
        SUNDAY: ScriptApp.WeekDay.SUNDAY,
        MONDAY: ScriptApp.WeekDay.MONDAY,
        TUESDAY: ScriptApp.WeekDay.TUESDAY,
        WEDNESDAY: ScriptApp.WeekDay.WEDNESDAY,
        THURSDAY: ScriptApp.WeekDay.THURSDAY,
        FRIDAY: ScriptApp.WeekDay.FRIDAY,
        SATURDAY: ScriptApp.WeekDay.SATURDAY
      }
      var weekdayName = (t.weekday || 'MONDAY').toUpperCase()
      var weekdayEnum = weekdayMap[weekdayName]
      if (!weekdayEnum) {
        throw new Error(
          'Unknown weekday: ' + t.weekday +
          '. Use the full English day name, e.g. "WEDNESDAY" or "Wednesday".'
        )
      }
      triggerBuilder
        .everyWeeks(t.value)
        .onWeekDay(weekdayEnum)
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
  var summary = 'every ' + t.value + ' ' + t.type
  if (t.type === 'weeks' && t.weekday) summary += ' on ' + t.weekday
  if (t.type === 'days' || t.type === 'weeks') {
    summary += ' at ' + (t.hour || 0) + ':' + String(t.minute || 0).padStart(2, '0')
  }
  console.info('Purge trigger installed: ' + summary)
}

/**
 * Continuation trigger used by batch processing. Calls purgeMore after
 * the configured delay so large result sets can span multiple runs without
 * exceeding Apps Script's per-execution time limit.
 */
function setPurgeMoreTrigger() {
  var minutes = getConfig().purgeMoreDelayMinutes || 2
  ScriptApp.newTrigger('purgeMore')
    .timeBased()
    .after(minutes * 60 * 1000)
    .create()
  console.info('Continuation trigger set: purgeMore will run in ' + minutes + ' minute(s).')
}

// ===========================================================================
// GitHub Sync
// ===========================================================================

// Files that are synced from GitHub (will be overwritten on update)
var SYNCED_FILES = ['Google-Drive-Clean-Up-Folders+Files', 'Config']

// Files that are NEVER touched by sync (user's personal settings)
// 'UserConfig' is intentionally excluded from SYNCED_FILES so it's preserved

/**
 * Pulls the latest version of all synced files from GitHub and updates
 * the Apps Script project in place.
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

  console.info('Apps Script project files:')
  for (var df = 0; df < files.length; df++) {
    console.info('  [' + files[df].type + '] "' + files[df].name + '" (source length: ' + (files[df].source || '').length + ')')
  }

  // CRITICAL: Find and preserve the appsscript.json manifest file.
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

  var updates = {}
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

    var currentFile = null
    var matchName = syncName.toLowerCase()
    for (var i = 0; i < files.length; i++) {
      if (files[i].type === 'SERVER_JS' &&
          files[i].name.toLowerCase() === matchName) {
        currentFile = files[i]
        break
      }
    }

    if (currentFile && currentFile.source.trim() === newCode.trim()) {
      console.info(syncName + '.gs is already up to date.')
      continue
    }

    if (currentFile) {
      updates[currentFile.name] = newCode
    } else {
      updates[syncName] = newCode
    }
    anyChanged = true
    console.info(syncName + '.gs has a new version available.')
  }

  if (!anyChanged) {
    console.info('All files are already up to date.')
    return
  }

  var updatePayload = { files: [] }
  var wasUpdated = {}

  if (manifestFile) {
    updatePayload.files.push({
      name: manifestFile.name,
      type: 'JSON',
      source: manifestFile.source
    })
  }

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

  for (var j = 0; j < files.length; j++) {
    if (files[j].type === 'JSON') continue
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

/**
 * Continuation wrapper for batch processing. Called automatically (via a
 * one-off trigger) when a purge run hits the maxDeletesPerRun cap and more
 * candidates remain. Safe to call manually too.
 */
function purgeMore() {
  purge(true)
}

/**
 * Main purge function. Walks every targetFolders entry, resolves the folder
 * by ID or name, lists the files it contains (non-recursive — files inside
 * subfolders are NOT processed unless that subfolder is its own entry),
 * applies the entry's deleteAfterDays age filter, applies folder-level
 * excludes, applies global excludes, and trashes the survivors (or logs
 * them in dry-run mode).
 *
 * @param {boolean} isContinuation true when called by purgeMore() for a batch
 */
function purge(isContinuation) {
  var config = getConfig()
  var dryRun = !!config.dryRun
  var targetFolders = config.targetFolders || []
  var globalExcludes = config.globalExcludeFiles || []
  var maxDeletes = config.maxDeletesPerRun || 0

  console.info('=== Drive Cleanup ' + (dryRun ? '[DRY RUN] ' : '') + '===')
  console.info('Target folders configured: ' + targetFolders.length)
  console.info('Global excludes: ' + (globalExcludes.length ? globalExcludes.join(', ') : '(none)'))

  if (!targetFolders.length) {
    console.info('No target folders configured. Nothing to do. (Set targetFolders in UserConfig.gs.)')
    finalizePurge(config, { deleted: [], excluded: [], skipped: [], errors: [] }, isContinuation)
    return
  }

  var stats = { deleted: [], excluded: [], skipped: [], errors: [] }
  var deletedThisRun = 0
  var hitMax = false

  for (var ti = 0; ti < targetFolders.length && !hitMax; ti++) {
    var entry = targetFolders[ti]
    var days = entry.deleteAfterDays

    if (!days || isNaN(days) || days <= 0) {
      console.warn('targetFolders[' + ti + ']: missing or invalid deleteAfterDays (' + days + '). Skipping.')
      stats.errors.push('Folder entry missing deleteAfterDays: ' + describeFolderEntry(entry))
      continue
    }
    if (!entry.id && !entry.name) {
      console.warn('targetFolders[' + ti + ']: has neither id nor name. Skipping.')
      stats.errors.push('Folder entry has no id or name: ' + JSON.stringify(entry))
      continue
    }

    var folder = resolveFolder(entry)
    if (!folder) {
      console.warn('Could not resolve folder: ' + describeFolderEntry(entry) + '. Skipping.')
      stats.errors.push('Folder not found: ' + describeFolderEntry(entry))
      continue
    }

    var cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    var folderExcludes = entry.excludeFiles || []
    console.info('Processing folder "' + folder.getName() + '" (' + folder.getId() + ') — deleting files modified before ' + cutoff.toISOString() + (folderExcludes.length ? ' — exclude: ' + folderExcludes.join(', ') : ''))

    var files
    try {
      files = folder.getFiles()
    } catch (e) {
      console.warn('Failed to list files in "' + folder.getName() + '": ' + e.message)
      stats.errors.push('Failed to list folder "' + folder.getName() + '": ' + e.message)
      continue
    }

    while (files.hasNext() && !hitMax) {
      var file = files.next()
      var name = file.getName()
      var id = file.getId()
      var modified = file.getLastUpdated()

      // Age check
      if (modified >= cutoff) {
        // Not old enough — leave it
        continue
      }

      // Folder-level exclude check
      if (matchesExclude(name, id, folderExcludes)) {
        stats.excluded.push({ name: name, id: id, folder: folder.getName(), reason: 'folder-exclude' })
        console.info('  [FOLDER-EXCLUDE] Skipping "' + name + '" (id: ' + id + ')')
        continue
      }

      // Global exclude check
      if (matchesExclude(name, id, globalExcludes)) {
        stats.excluded.push({ name: name, id: id, folder: folder.getName(), reason: 'global-exclude' })
        console.info('  [GLOBAL-EXCLUDE] Skipping "' + name + '" (id: ' + id + ')')
        continue
      }

      // Candidate for deletion
      if (dryRun) {
        stats.deleted.push({ name: name, id: id, folder: folder.getName(), modified: modified.toISOString() })
        console.info('  [DRY RUN] Would trash "' + name + '" (modified ' + modified.toISOString() + ', id: ' + id + ')')
      } else {
        try {
          file.setTrashed(true)
          stats.deleted.push({ name: name, id: id, folder: folder.getName(), modified: modified.toISOString() })
          console.info('  Trashed "' + name + '" (modified ' + modified.toISOString() + ', id: ' + id + ')')
        } catch (e) {
          stats.errors.push('Failed to trash "' + name + '" (id: ' + id + '): ' + e.message)
          console.warn('  Failed to trash "' + name + '": ' + e.message)
        }
      }

      deletedThisRun++
      if (maxDeletes && deletedThisRun >= maxDeletes) {
        hitMax = true
        console.info('Reached maxDeletesPerRun (' + maxDeletes + '). Remaining candidates will be handled on the next run.')
      }
    }
  }

  finalizePurge(config, stats, isContinuation, hitMax)

  if (hitMax && !dryRun) {
    setPurgeMoreTrigger()
  }
}

/**
 * Sends the summary email (if enabled and there's something to report) and
 * logs a final tally for the run.
 */
function finalizePurge(config, stats, isContinuation, hitMax) {
  var deleted = stats.deleted || []
  var excluded = stats.excluded || []
  var errors = stats.errors || []

  console.info('--- Run summary ' + (isContinuation ? '(continuation) ' : '') + '---')
  console.info('Trashed ' + (config.dryRun ? 'would-trash ' : '') + deleted.length + ' file(s)')
  console.info('Excluded ' + excluded.length + ' file(s)')
  console.info('Errors: ' + errors.length)

  if (config.sendSummaryEmail && deleted.length > 0) {
    sendSummaryEmail(config, stats, isContinuation, hitMax)
  } else if (config.sendSummaryEmail && errors.length > 0 && deleted.length === 0) {
    // On a run with only errors and no deletes, still email so failures surface
    sendSummaryEmail(config, stats, isContinuation, hitMax)
  }
}

/**
 * Builds and sends the summary email for a purge run.
 */
function sendSummaryEmail(config, stats, isContinuation, hitMax) {
  var deleted = stats.deleted || []
  var excluded = stats.excluded || []
  var errors = stats.errors || []

  var modeLine = config.dryRun
    ? 'DRY RUN — nothing was actually trashed. The files below WOULD have been deleted.\n\n'
    : 'LIVE — the files below were moved to Drive Trash.\n\n'

  var lines = []
  lines.push('Google Drive Clean-Up Report')
  lines.push((isContinuation ? '(continuation of previous run) ' : '') + new Date().toString())
  lines.push('')
  lines.push(modeLine)

  lines.push('=== Files ' + (config.dryRun ? 'that would be ' : '') + 'trashed (' + deleted.length + ') ===')
  if (deleted.length) {
    for (var i = 0; i < deleted.length; i++) {
      var d = deleted[i]
      lines.push('  - ' + d.name + '  [folder: ' + d.folder + ', modified: ' + d.modified + ']')
    }
  } else {
    lines.push('  (none)')
  }
  lines.push('')

  lines.push('=== Excluded from this run (' + excluded.length + ') ===')
  if (excluded.length) {
    var byReason = { 'folder-exclude': [], 'global-exclude': [] }
    for (var e = 0; e < excluded.length; e++) {
      var x = excluded[e]
      if (byReason[x.reason]) byReason[x.reason].push(x)
    }
    if (byReason['folder-exclude'].length) {
      lines.push('  Folder-level excludes (' + byReason['folder-exclude'].length + '):')
      for (var fe = 0; fe < byReason['folder-exclude'].length; fe++) {
        var f = byReason['folder-exclude'][fe]
        lines.push('    - ' + f.name + '  [folder: ' + f.folder + ', id: ' + f.id + ']')
      }
    }
    if (byReason['global-exclude'].length) {
      lines.push('  Global excludes (' + byReason['global-exclude'].length + '):')
      for (var ge = 0; ge < byReason['global-exclude'].length; ge++) {
        var g = byReason['global-exclude'][ge]
        lines.push('    - ' + g.name + '  [folder: ' + g.folder + ', id: ' + g.id + ']')
      }
    }
  } else {
    lines.push('  (none)')
  }
  lines.push('')

  lines.push('=== Errors (' + errors.length + ') ===')
  if (errors.length) {
    for (var er = 0; er < errors.length; er++) {
      lines.push('  - ' + errors[er])
    }
  } else {
    lines.push('  (none)')
  }
  lines.push('')

  if (hitMax) {
    lines.push('NOTE: The maxDeletesPerRun cap was reached this run. Remaining')
    lines.push('files will be processed on the automatically-scheduled next run.')
    lines.push('')
  }

  if (config.dryRun) {
    lines.push('You are in dry-run mode. To actually delete files, set')
    lines.push('dryRun: false in UserConfig.gs and re-run purge (or wait for')
    lines.push('the next scheduled run).')
  }

  var body = lines.join('\n')

  try {
    MailApp.sendEmail({
      to: config.summaryEmailTo,
      subject: config.summaryEmailSubject,
      body: body
    })
    console.info('Summary email sent to ' + config.summaryEmailTo)
  } catch (e) {
    console.warn('Could not send summary email: ' + e.message)
    console.warn('If this is a permissions error, run installAllTriggers in the Apps Script editor to re-authorize with the script.send_mail scope.')
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Resolves a targetFolders entry to a Drive Folder. If the entry has an id,
 * uses that directly; otherwise searches by exact name. Name matches are
 * limited to folders you own that are not in anyone's Trash.
 *
 * @param {Object} entry a targetFolders entry with id and/or name
 * @returns {Folder|null} the resolved folder, or null if not found
 */
function resolveFolder(entry) {
  if (entry.id) {
    try {
      var byId = DriveApp.getFolderById(entry.id)
      return byId
    } catch (e) {
      console.warn('getFolderById("' + entry.id + '") failed: ' + e.message)
      return null
    }
  }

  // Search by name
  var name = String(entry.name)
  var it = DriveApp.getFoldersByName(name)
  if (it.hasNext()) {
    var folder = it.next()
    if (it.hasNext()) {
      console.warn('Multiple folders named "' + name + '" found. Using the first one (' + folder.getId() + '). For an unambiguous match, use the folder id instead.')
    }
    return folder
  }
  return null
}

/**
 * Returns true if a file should be protected from deletion based on the
 * provided exclude list. Matching is exact and case-insensitive on file
 * name, and exact on file id.
 *
 * @param {string} name the file's display name
 * @param {string} id   the file's Drive id
 * @param {Array}  list an array of name/id strings to check against
 * @returns {boolean} true if the file matches an entry in list
 */
function matchesExclude(name, id, list) {
  if (!list || !list.length) return false
  var nameLower = String(name).toLowerCase()
  for (var i = 0; i < list.length; i++) {
    var item = String(list[i])
    if (!item) continue
    if (item === id) return true
    if (item.toLowerCase() === nameLower) return true
  }
  return false
}

/**
 * Produces a human-readable description of a targetFolders entry for logs/errors.
 *
 * @param {Object} entry a targetFolders entry
 * @returns {string} description
 */
function describeFolderEntry(entry) {
  if (!entry) return '(empty entry)'
  if (entry.id) return '{ id: "' + entry.id + '"' + (entry.name ? ', name: "' + entry.name + '"' : '') + ' }'
  if (entry.name) return '{ name: "' + entry.name + '" }'
  return JSON.stringify(entry)
}

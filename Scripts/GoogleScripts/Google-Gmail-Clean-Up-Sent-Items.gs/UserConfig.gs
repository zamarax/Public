/* eslint-disable */

/**
 *============================================================================
 * UserConfig.gs — Your Personal Settings (NEVER overwritten by sync)
 *============================================================================
 * This file is YOUR personal configuration.  The sync process from GitHub
 * will NEVER touch this file, so your settings are safe.
 *
 * You only need to include the values you want to CHANGE from the defaults
 * in Config.gs.  Any value you don't include here will use the default.
 *
 * Example: if you only want to change dryRun and maxDeletesPerRun, just
 * set those two and leave everything else out.
 *============================================================================
 */

// Start with an empty object — only add what you want to override
var USER_CONFIG = {

  // --- Examples (uncomment and edit to customize) ---

  // Purge emails older than 90 days instead of the default 1825
  // deleteAfterDays: 90,
  deleteAfterDays: 1825,

  // Delete at most 10 threads per run instead of the default 50
  // maxDeletesPerRun: 10,

  // Only target emails from 2023
  // dateRangeStart: new Date(2023, 0, 1),
  // dateRangeEnd: new Date(2023, 11, 31),

  // Use a custom Gmail label instead of "in:sent"
  // targetLabel: 'label:Sent-Messages',

  // Search multiple labels/queries (default: system Sent mailbox only)
  // Add custom label queries here if you file sent emails under custom labels
  // NOTE: Labels with spaces MUST be quoted: label:"My Label"
  //
  // Using "from:me" instead of "^sent" because "from:me" catches IMAP-uploaded
  // sent messages that ^sent misses (e.g. messages uploaded via Outlook/Apple Mail).
  // Thread-level protection is handled by skipThreadsWithCustomLabels: any thread
  // with a user-applied label is skipped unless that label is in allowLabels.
  targetQueries: ['from:me'],

  // Deep search: also check recent threads for old individual messages
  // (default: true). Set to false to only purge messages in threads where
  // the ENTIRE thread is older than the cutoff.
  // deepSearch: false,

  // DELETE messages even if the thread has custom labels (default: true = skip them)
  // skipThreadsWithCustomLabels: false,

  // Allow purging threads with specific labels even when skipThreadsWithCustomLabels is true
  // Add label names that mirror your Sent folder but are technically custom labels
  // allowLabels: ['Sent Messages'],

  // Turn on dry-run mode for testing (nothing gets deleted)
  dryRun: true,

  // Don't send summary emails
  // sendSummaryEmail: false,

  // Run every 12 hours instead of every day at 2 AM
  // trigger: {
  //   type: 'hours',
  //   value: 12,
  //   hour: 0,
  //   minute: 0
  // },

  // Point to your own fork of the Public repo
  // githubRawUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/Public/main/Scripts/GoogleScripts/Google-Gmail-Clean-Up-Sent-Items.gs/Google-Gmail-Clean-Up-Sent-Items.gs'
}

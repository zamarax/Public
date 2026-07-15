/* eslint-disable */

/**
 *============================================================================
 * UserConfig.gs — YOUR personal settings (NEVER overwritten by sync)
 *============================================================================
 * Override ONLY the values you want to change here. Everything else falls
 * back to the defaults in Config.gs. The script merges the two at runtime;
 * values in USER_CONFIG win.
 *
 * To turn an example below ON, remove the // at the start of each line.
 * To turn it back OFF, add the // back (or delete the lines).
 *
 * NOTE: Saving UserConfig.gs does NOT change when the trigger runs. After
 * editing your schedule you must also run installAllTriggers (function
 * dropdown -> Run) in the Apps Script editor.
 *============================================================================
 */

var USER_CONFIG = {

  // ------------------------------------------------------------------
  // EXAMPLE: "Folder = Shared, delete files older than 90 days, but
  //          exclude file named MyFile.doc from that folder,
  //          AND globally exclude template.docx everywhere."
  // ------------------------------------------------------------------
  //
  // Uncomment the block below and edit to match your folders. You can use
  // a folder ID (recommended) OR an exact folder name.

  // targetFolders: [
  //   {
  //     name: 'Shared',                   // identify folder by exact name
  //     deleteAfterDays: 90,               // trash files modified > 90 days ago
  //     excludeFiles: ['MyFile.doc']       // excluded ONLY from this folder
  //   }
  //   // Add more entries as needed:
  //   // ,
  //   // {
  //   //   id: '1AbCDefGhIjKlMnOpQrStUvWxYz0123456789',  // or use the folder ID
  //   //   deleteAfterDays: 30,
  //   //   excludeFiles: ['Keep-Me.pdf']
  //   // }
  // ],

  // Files to protect across EVERY folder the script touches:
  // globalExcludeFiles: ['template.docx'],

  // ------------------------------------------------------------------
  // EXAMPLE schedules (uncomment ONE — and run installAllTriggers after):
  // ------------------------------------------------------------------

  // Every day at 2 AM (this is the default — only uncomment if editing):
  // trigger: { type: 'days', value: 1, hour: 2, minute: 0 },

  // Every Wednesday at 8 PM (24-hour clock: 20 = 8 PM):
  // trigger: { type: 'weeks', value: 1, weekday: 'WEDNESDAY', hour: 20, minute: 0 },

  // ------------------------------------------------------------------
  // EXAMPLE: dry-run mode (logs what WOULD be deleted, trashes nothing):
  // ------------------------------------------------------------------
  // dryRun: true,

  // ------------------------------------------------------------------
  // EXAMPLE: where to send the summary email (defaults to you):
  // ------------------------------------------------------------------
  // summaryEmailTo: 'my-email@example.com'

}

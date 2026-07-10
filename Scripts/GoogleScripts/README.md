# Google Scripts (GitHub-pulled)

This folder contains Google Apps Script projects that automatically sync from GitHub.

## How It Works

```
Edit .gs in Personal (private) repo → git push → GitHub Actions copies .gs files to Public repo
                                                                              ↓
                                          Google Apps Script pulls latest code on a schedule (every 6 hours)
```

No OAuth tokens, no clasp, no CLI tools, no secrets in Google Apps Script. The script pulls its own code from a public GitHub raw URL.

## Projects

| Folder | Description |
|--------|-------------|
| [Google-Gmail-Clean-Up-Sent-Items.gs](./Google-Gmail-Clean-Up-Sent-Items.gs/) | Automatically purges sent emails older than a configurable number of days |

## Adding a New Project

1. Create a subfolder matching the structure:

   ```
   Scripts/GoogleScripts/<Your-Project-Name>.gs/
     .gitkeep
     Your-Project-Name.gs
     README.md
   ```

2. In the `.gs` file, set `CONFIG.githubRawUrl` to the raw URL on the **Public** repo:

   ```
   https://raw.githubusercontent.com/zamarax/Public/main/Scripts/GoogleScripts/<Your-Project-Name>.gs/<Your-Project-Name>.gs
   ```

3. In Google Apps Script (script.google.com), create a new project, paste the `.gs` code, and run `installAllTriggers()`.

4. Add the project to the table above.

## What Gets Synced to the Public Repo

The GitHub Actions workflow copies **only** `.gs` files and `README.md` files. No `.clasp.json`, `package.json`, `Sync.ps1`, `.gitignore`, or any other config files are transferred. This ensures no credentials or sensitive configuration leak.

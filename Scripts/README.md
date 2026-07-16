# Scripts

All runnable code lives in here. Each **platform** gets its own subfolder, because every
ecosystem ships its own tooling, runtime, conventions, and install flow — keeping them
apart keeps each one self-contained and easy to pick up.

## Platforms

| Subfolder | Platform | What's in it |
|-----------|----------|--------------|
| [GoogleScripts/](./GoogleScripts/) | Google Apps Script | Self-syncing `.gs` projects that pull their own updates from this repo. Gmail, Drive, and similar Google-ecosystem automations. See that folder's [README](./GoogleScripts/) for the project list and the shared auto-sync setup. |

New platform subfolders appear here as their content gets published — each is independent,
so browse directly into the one you care about.

## Layout

```
Scripts/
  <Platform>/          one subfolder per platform/runtime
    README.md          platform index — the list of projects and how they're installed
    <ProjectName>/
      README.md        per-project setup (full walkthrough from scratch)
      ...
```

Start at a platform's `README.md` — it's the entry point for everything under that subfolder.

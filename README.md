# Public

A public collection of scripts, utilities, and small tools I've built across a mix of platforms and
languages. Each platform keeps to its own folder so its setup and conventions stay self-contained —
you don't need to wade through unrelated tooling to find what's relevant to you.

## Repository layout

```
Scripts/
  <Platform>/              e.g. GoogleScripts/
    README.md              platform index — start there for the list of scripts and how they're installed
    <ProjectName>/
      README.md            per-project setup (the full deployer walkthrough)
      ...
```

Pick the platform you care about, open that subfolder's `README.md`, and it lists everything available
there with one-line summaries and links to each project's own setup guide.

## What's available right now

| Subfolder | Platform | Description |
|-----------|----------|-------------|
| [Scripts/GoogleScripts/](./Scripts/GoogleScripts/) | Google Apps Script | Self-updating scripts (Gmail, Drive...) that pull their own code from this repo on a schedule. Open that folder's [README](./Scripts/GoogleScripts/README.md) for the full list and install steps. |

New platforms get added as their own subfolders over time — none of the platform indexes depend on
this root file, so browse directly into the one you want.

## About

Curated by Corey Zamara. Everything here is something I actually use day-to-day; the public mirror
exists so anyone else can run the same tools. Each project's README has the complete, copy-pasteable
setup from scratch — no prior context assumed.


# Bash Scripts

Small POSIX-shell / bash utilities and automations. Each script in here is a
self-contained file — no subfolders per project, just drop the script wherever
you need it and run it.

## Scripts

| Script | What it does |
|--------|--------------|
| [DDNS-Start-CloudFlare](./DDNS-Start-CloudFlare) | Cloudflare Dynamic DNS updater. Fetches the current public IPv4 address (via `checkip.amazonaws.com`), compares against the last-known value cached on disk, and pushes an `A` record update to Cloudflare only when the IP has actually changed. IPv6 support is stubbed out but commented. Designed to run on a router with the Asus `/sbin/ddns_custom_updated` hook (or any box where you can invoke it from cron). |

## Configuring `DDNS-Start-CloudFlare`

Open the script and set the four variables near the top:

```sh
CLOUDFLARE_TOKEN="YOUR_CLOUDFLARE_TOKEN_HERE"
FULL_DOMAIN_NAME="yourdomain.com"  # the A record you want to update
UPDATE_TYPE="both"  # "ipv4", "ipv6", or "both"
LOG_FILE="/tmp/cloudflare_ddns.log"
```

- `CLOUDFLARE_TOKEN` — a Cloudflare API token with permission to edit DNS records
  on the zone. Generate one at
  https://dash.cloudflare.com/profile/api-tokens using the "Edit zone DNS"
  template, scoped to your zone.
- `FULL_DOMAIN_NAME` — the FQDN whose `A` (and/or `AAAA`) record you want to
  keep current. Use `yourdomain.com` for the root, or `www.yourdomain.com` for
  a subdomain. The script derives the Cloudflare **zone** name from this by
  taking the last two dot-separated labels (e.g. `www.yourdomain.com`
  → zone `yourdomain.com`).

> The Private repo keeps the **real** `CLOUDFLARE_TOKEN` and
> `FULL_DOMAIN_NAME` values in this script — they are committed to Private
> git history as-is. The public mirror (in
> [`zamarax/Public`](https://github.com/zamarax/Public/blob/main/Scripts/Bash/))
> ships a redacted copy where those assignments are replaced with placeholders
> by the [`sync-bash-scripts`](../../.github/workflows/sync-bash-scripts.yml)
> workflow. Rotating the token does NOT require touching the workflow — it
> redacts by assignment name, not by literal value.

## Running it

```sh
chmod +x DDNS-Start-CloudFlare
./DDNS-Start-CloudFlare
```

On a router with the Asus custom-DDNS hook, drop this script into the
"custom DDNS" slot so `/sbin/ddns_custom_updated 1` gets called on a successful
update. On a generic host, schedule it from cron, e.g. every 10 minutes:

```cron
*/10 * * * * /path/to/DDNS-Start-CloudFlare >> /var/log/cloudflare_ddns.log 2>&1
```

The script is idempotent within a run — it compares the current public IP
against `/tmp/cloudflare_current_ip` and skips the Cloudflare API call if
nothing changed, so frequent polling is cheap.

## Logging

Each actual API call appends a line to `$LOG_FILE` (default
`/tmp/cloudflare_ddns.log`) with a timestamp and the raw Cloudflare response.
All other output goes to stdout/stderr — redirect them where you want.

## Adding a new Bash script

Just drop the new script file directly into this folder (flat — no per-project
subfolder needed), and add a row to the table above. If you push to `main`, the
[`sync-bash-scripts`](../../.github/workflows/sync-bash-scripts.yml) workflow
copies it into the public mirror (with any assignments to `*_TOKEN`, `*_KEY`,
`*_SECRET`, `*_DOMAIN`, or `FULL_DOMAIN_NAME` redacted to placeholders) so
nothing leaks.

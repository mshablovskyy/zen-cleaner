# Zen Cleaner

Extension for [Zen Browser](https://zen-browser.app) that brings Arc's
auto-archive feature: **unpinned** tabs inactive for **X hours** (configurable)
are closed automatically.

## How it works

Every 15 minutes, the extension checks each tab and closes those that meet
**all** of these conditions:

- not pinned (pinned tabs and Zen **Essentials** are never touched);
- not the active tab of a window;
- not playing audio (music, video calls…);
- not on a domain from the exclusion list;
- inactive for longer than the configured threshold (12 hours by default).

Tabs in **other Zen workspaces** are cleaned too (like Arc's spaces).

After each cleanup, a notification shows how many tabs were closed —
**clicking it restores them**. Restore is also available from the popup.

> Limitation: restored tabs reopen in the current workspace, as the
> WebExtensions API cannot target a specific Zen workspace.

## Usage

- **Popup** (toolbar icon): pause/resume automatic cleanup, "Clean now" button
  (closes every unpinned/inactive/non-audible tab without waiting for the
  threshold), restore the last cleanup, open settings.
- **Settings**: inactivity threshold in hours (1 h / 6 h / 12 h / 24 h presets,
  decimals accepted — `0.05` ≈ 3 min, handy for testing) and excluded domains
  list (one per line, subdomains included).

## Installing in Zen

### For development (temporary, lost on restart)

1. Open `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on…"
3. Select `manifest.json`

### Permanent install

Two options:

1. **Disable signature enforcement** (possible in Zen, unlike Firefox release):
   in `about:config`, set `xpinstall.signatures.required` to `false`, then zip
   the folder (`zip -r zen-cleaner.xpi . -x ".*"`) and open it in Zen.
2. **Sign through AMO**: `npx web-ext sign --channel=unlisted` with
   [addons.mozilla.org API keys](https://addons.mozilla.org/developers/addon/api/key/),
   then install the signed `.xpi`.

## Development

No build step: plain vanilla JavaScript (Manifest V3, Firefox event page).

```sh
npx web-ext lint    # validate manifest and APIs
npx web-ext run     # run in a test Firefox profile
```

## License

[MIT](LICENSE)

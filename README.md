# Zen Tabs Cleaner

Extension for [Zen Browser](https://zen-browser.app) that brings Arc's
auto-archive feature: **unpinned** tabs inactive for **X hours** (configurable)
are closed automatically.

## How it works

At a configurable interval (every 15 minutes by default), the extension
checks each tab and closes those that meet **all** of these conditions:

- not pinned (pinned tabs and Zen **Essentials** are never touched);
- not the active tab of a window;
- not playing audio (music, video calls…);
- not on a domain from the exclusion list;
- inactive for longer than the configured threshold (12 hours by default).

After each cleanup, a notification shows how many tabs were closed —
**clicking it restores them**. Restore is also available from the popup.

### Zen workspaces (spaces)

Current Zen versions only expose the **active space's tabs** to extensions —
tabs in other spaces are invisible to the WebExtensions API (not even as
hidden tabs), so no extension can close them while you are elsewhere. To
compensate, a cleanup check also runs **as soon as you switch space, tab or
window** (throttled to once per 30 s): overdue tabs in a space are closed the
moment you come back to it.

> Other limitation: restored tabs reopen in the current space, as the
> WebExtensions API cannot target a specific Zen space.

## Usage

- **Popup** (toolbar icon): pause/resume automatic cleanup, "Clean now" button
  (closes every unpinned/inactive/non-audible tab without waiting for the
  threshold), restore the last cleanup, open settings.
- **Settings**: inactivity threshold in hours (1 h / 6 h / 12 h / 24 h presets,
  decimals accepted — `0.05` ≈ 3 min, handy for testing), check frequency in
  minutes (1 min minimum, 15 min default), and excluded domains list (one per
  line, subdomains included).

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

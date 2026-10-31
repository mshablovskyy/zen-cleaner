# Publishing on addons.mozilla.org (AMO)

## First submission

1. Sign in / create an account: https://addons.mozilla.org/developers/
2. "Submit a New Add-on" → **On this site** (listed) channel
3. Upload `web-ext-artifacts/zen_cleaner-<version>.zip` (build with `npx web-ext build`)
4. When asked about source code: answer **No** (no build/minification, the zip
   is the source)
5. Fill in the listing with the texts below
6. Submit — automatic signing is immediate, human review happens afterwards

## Updates

⚠️ "Submit a New Add-on" is only for the very first submission — reusing it
fails with "Duplicate add-on ID found", because the add-on ID is already
registered. Note: AMO reserves deleted add-on IDs forever, which is why the
ID was changed from `zen-cleaner@qskkk` to `zen_tabs_cleaner@qskkk`.

For every new version: bump `version` in `manifest.json` →
`npx web-ext build` → https://addons.mozilla.org/developers/addons →
open the add-on → **"Upload New Version"** → upload the zip.

Command-line alternative (API keys at
https://addons.mozilla.org/developers/addon/api/key/):

```sh
npx web-ext sign --channel=listed \
  --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

## Ready-to-paste listing texts

### Name
Zen Tabs Cleaner

### Summary (max 250 characters)
Automatically closes unpinned tabs that have been inactive for a set number
of hours, like Arc's auto-archive. Pinned tabs, Essentials, audible tabs and
excluded domains are never touched. One-click restore after each cleanup.

### Description
Zen Tabs Cleaner brings Arc's auto-archive to Zen Browser and Firefox.

At a configurable interval (15 minutes by default), it checks each tab's
last activity and closes tabs that meet ALL of these conditions:
• not pinned (pinned tabs and Zen Essentials are never touched)
• not the active tab of a window
• not playing audio (music, video calls…)
• not on a domain from your exclusion list
• inactive for longer than your threshold (12 hours by default)

Zen only exposes the active space's tabs to extensions, so tabs in other
spaces are cleaned as soon as you switch back to them — a check also runs on
every space/tab/window switch, not just on the periodic schedule.

After each cleanup, a notification tells you how many tabs were closed —
click it to restore them all. You can also restore from the popup, and turn
notifications off in the settings.

Extras:
• "Clean now" button in the popup (with confirmation)
• Pause toggle to suspend cleaning temporarily
• Configurable threshold with 1h / 6h / 12h / 24h presets
• Configurable check frequency (1 minute minimum)
• Domain exclusion list (subdomains included)
• Optional cleanup notifications

No data collection, no external requests. Open source (MIT):
https://github.com/qskkk/zen-cleaner

### Listing fields

- **Categories**: Tabs
- **License**: MIT
- **Homepage / Support site**: https://github.com/qskkk/zen-cleaner
- **Privacy policy**: This extension does not collect, store or transmit any
  data. All settings stay in your browser's local storage.
- **Notes to reviewer** (optional): Plain vanilla JavaScript, no build step —
  the uploaded zip is the complete source code.

### Screenshots (recommended)

Take 2-3 screenshots: the popup, the settings page, a cleanup notification.
AMO accepts PNG/JPG, ideally 1280×800 or a similar ratio.

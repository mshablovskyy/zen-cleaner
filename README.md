# Zen Tabs Cleaner

Zen-only fork of [qskkk/zen-cleaner](https://github.com/qskkk/zen-cleaner), the
Arc-style auto-archive extension. Set an inactivity threshold for each Zen
space, or turn automatic cleanup off for selected spaces.
This version uses Zen's privileged Experiment API; it cannot be installed from
AMO or used in regular Firefox.

## How it works

At a configurable interval (15 minutes by default), the extension checks tabs
across Zen spaces and closes those that meet **all** of these conditions:

- not pinned (pinned tabs and Zen **Essentials** are never touched);
- not active;
- not playing audio (music, video calls…);
- not on a domain from the exclusion list;
- inactive for longer than that space's threshold (12 hours by default).

The cleaner checks again when you switch tabs or windows. Each space can have
its own threshold or have automatic cleanup turned off. New spaces use the
global threshold until you give them a rule. The global pause toggle still
pauses cleanup everywhere.

After each cleanup, a notification shows how many tabs were closed —
**clicking it restores them**. Restore is also available from the popup, and
notifications can be turned off in the settings.

## Usage

- **Popup** (toolbar icon): pause/resume automatic cleanup, "Clean now" button
  (closes eligible tabs in the active space without waiting for the threshold),
  restore the last cleanup, open settings.
- **Settings**: default inactivity threshold, per-space threshold or automatic
  cleanup toggle, check frequency in minutes, excluded domains (one per line,
  subdomains included), and a toggle for cleanup notifications.
- The manual "Clean now" action still works when automatic cleanup is paused
  or turned off for the active space.
- Private windows are included only if Firefox has granted this extension
  private-window access.

## Install this Zen-only build

This build uses an internal Zen API that may change in future Zen releases. It
is not signed by Mozilla and cannot be distributed through AMO.

1. In Zen, open `about:config` and set `extensions.experiments.enabled` to
   `true`.
2. For a persistent install, set `xpinstall.signatures.required` to `false`
   and `extensions.autoDisableScopes` to `14`.
3. Restart Zen, open `about:addons`, choose **Install Add-on From File…**, and
   select the provided XPI.

To load it temporarily while developing, use `about:debugging#/runtime/this-firefox`
and choose **Load Temporary Add-on…**. The temporary install is removed when Zen
restarts.

## Development

No build step: plain JavaScript and a Firefox Experiment API (Manifest V2).
Build the installable XPI from this directory with:

```sh
zip -r zen-tabs-cleaner-zen-only.xpi manifest.json defaults.js background.js experiment options popup icons
```

## License

[MIT](LICENSE)

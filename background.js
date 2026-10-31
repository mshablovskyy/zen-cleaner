"use strict";

const ALARM_NAME = "zen-cleaner-check";
const NOTIFICATION_ID = "zen-cleaner-cleanup";

async function getSettings() {
  return browser.storage.local.get(DEFAULTS);
}

function isExcluded(url, excludedDomains) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return excludedDomains.some((domain) => {
    const d = domain.trim().toLowerCase();
    return d && (host === d || host.endsWith("." + d));
  });
}

// Zen patches tabs.query in non-standard ways: the unfiltered path can fail or
// drop hidden (other-workspace) tabs (zen-browser/desktop#11210, #12652).
// Filtered queries still work, so query visible and hidden tabs separately.
async function queryAllTabs() {
  const tabs = [];
  for (const filter of [{ hidden: false }, { hidden: true }]) {
    try {
      tabs.push(...(await browser.tabs.query(filter)));
    } catch (error) {
      console.error("[Zen Tabs Cleaner] tabs.query failed for", filter, error);
    }
  }
  if (tabs.length === 0) {
    tabs.push(...(await browser.tabs.query({})));
  }
  const seen = new Set();
  return tabs.filter((tab) => !seen.has(tab.id) && seen.add(tab.id));
}

// Returns why a tab must be spared, or null if it can be closed.
function spareReason(tab, settings, now, thresholdMs, manual) {
  if (tab.pinned) return "pinned";
  if (tab.active) return "active";
  if (tab.audible) return "audible";
  if (isExcluded(tab.url, settings.excludedDomains)) return "excluded";
  if (!manual) {
    // No lastAccessed = inactivity cannot be judged: keep the tab.
    if (typeof tab.lastAccessed !== "number") return "no lastAccessed";
    if (now - tab.lastAccessed <= thresholdMs) return "recent";
  }
  return null;
}

// manual === true: triggered from the popup — bypasses the inactivity
// threshold and pause mode, but still spares pinned/active/audible/excluded tabs.
async function cleanTabs(manual = false, source = "alarm") {
  const settings = await getSettings();
  if (!settings.enabled && !manual) {
    return 0;
  }

  const thresholdMs = settings.thresholdHours * 3600 * 1000;
  const now = Date.now();
  const tabs = await queryAllTabs();

  const toClose = [];
  const sparedReport = [];
  for (const tab of tabs) {
    const reason = spareReason(tab, settings, now, thresholdMs, manual);
    if (reason === null) {
      toClose.push(tab);
    } else {
      sparedReport.push({
        title: (tab.title || tab.url || "").slice(0, 50),
        hidden: tab.hidden,
        inactiveMin:
          typeof tab.lastAccessed === "number"
            ? Math.round((now - tab.lastAccessed) / 60000)
            : null,
        spared: reason,
      });
    }
  }

  const hiddenCount = tabs.filter((tab) => tab.hidden).length;
  console.debug(
    `[Zen Tabs Cleaner] ${manual ? "manual" : source} check: ` +
      `${tabs.length} tabs seen (${hiddenCount} hidden), closing ${toClose.length}`,
  );
  if (sparedReport.length > 0) {
    console.debug("[Zen Tabs Cleaner] spared tabs:", sparedReport);
  }

  // Close tabs one by one: a tab closed by the user in the meantime must not
  // abort the whole cleanup, and lastCleanup must only list actually closed tabs.
  const closedTabs = [];
  for (const tab of toClose) {
    try {
      await browser.tabs.remove(tab.id);
      closedTabs.push({ url: tab.url, title: tab.title });
    } catch {
      // Tab already gone.
    }
  }

  if (closedTabs.length === 0) {
    return 0;
  }

  await browser.storage.local.set({
    lastCleanup: {
      timestamp: now,
      tabs: closedTabs,
    },
  });

  if (settings.notifyOnCleanup) {
    await browser.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/icon-96.png"),
      title: "Zen Tabs Cleaner",
      message:
        closedTabs.length === 1
          ? "1 inactive tab closed — click to restore it."
          : `${closedTabs.length} inactive tabs closed — click to restore them.`,
    });
  }

  return closedTabs.length;
}

async function restoreLastCleanup() {
  const { lastCleanup } = await getSettings();
  if (!lastCleanup || !lastCleanup.tabs.length) {
    return 0;
  }

  let restored = 0;
  for (const tab of lastCleanup.tabs) {
    try {
      await browser.tabs.create({ url: tab.url, active: false });
      restored++;
    } catch {
      // Privileged URL (about:, chrome:, file:) — extensions cannot reopen it.
    }
  }

  await browser.storage.local.set({ lastCleanup: null });
  return restored;
}

async function ensureAlarm() {
  const settings = await getSettings();
  const period = Math.max(1, Number(settings.checkPeriodMinutes) || 15);
  browser.alarms.create(ALARM_NAME, { periodInMinutes: period });
}

browser.runtime.onInstalled.addListener(ensureAlarm);
browser.runtime.onStartup.addListener(ensureAlarm);

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.checkPeriodMinutes) {
    ensureAlarm();
  }
});

// Zen only exposes the current space's tabs to extensions (no hidden tabs, no
// separate windows), so overdue tabs in another space can only be cleaned once
// that space becomes visible. Run an extra check whenever the user switches
// tab or window — throttled just enough to not re-check on rapid tab hops.
const ACTIVITY_CHECK_THROTTLE_MS = 5 * 1000;
let lastActivityCheck = 0;

function onActivity() {
  const now = Date.now();
  if (now - lastActivityCheck < ACTIVITY_CHECK_THROTTLE_MS) {
    return;
  }
  lastActivityCheck = now;
  cleanTabs(false, "activity").catch(console.error);
}

browser.tabs.onActivated.addListener(onActivity);
browser.windows.onFocusChanged.addListener(onActivity);

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanTabs(false).catch(console.error);
  }
});

browser.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === NOTIFICATION_ID) {
    browser.notifications.clear(NOTIFICATION_ID);
    restoreLastCleanup();
  }
});

async function getStats() {
  const settings = await getSettings();
  const thresholdMs = settings.thresholdHours * 3600 * 1000;
  const now = Date.now();
  const tabs = await queryAllTabs();
  return {
    total: tabs.length,
    hidden: tabs.filter((tab) => tab.hidden).length,
    eligible: tabs.filter(
      (tab) => spareReason(tab, settings, now, thresholdMs, false) === null,
    ).length,
  };
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "cleanNow":
      return { closed: await cleanTabs(true) };
    case "restore":
      return { restored: await restoreLastCleanup() };
    case "getStats":
      return getStats();
    default:
      return undefined;
  }
});

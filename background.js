"use strict";

const ALARM_NAME = "zen-cleaner-check";
const CHECK_PERIOD_MINUTES = 15;
const NOTIFICATION_ID = "zen-cleaner-cleanup";

const DEFAULTS = {
  enabled: true,
  thresholdHours: 12,
  excludedDomains: [],
  lastCleanup: null,
};

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

// manual === true: triggered from the popup — bypasses the inactivity
// threshold and pause mode, but still spares pinned/active/audible/excluded tabs.
async function cleanTabs(manual = false) {
  const settings = await getSettings();
  if (!settings.enabled && !manual) {
    return 0;
  }

  const thresholdMs = settings.thresholdHours * 3600 * 1000;
  const now = Date.now();
  const tabs = await browser.tabs.query({});

  const toClose = tabs.filter((tab) => {
    if (tab.pinned || tab.active || tab.audible) return false;
    if (isExcluded(tab.url, settings.excludedDomains)) return false;
    if (!manual) {
      // No lastAccessed = inactivity cannot be judged: keep the tab.
      if (typeof tab.lastAccessed !== "number") return false;
      if (now - tab.lastAccessed <= thresholdMs) return false;
    }
    return true;
  });

  if (toClose.length === 0) {
    return 0;
  }

  await browser.storage.local.set({
    lastCleanup: {
      timestamp: now,
      tabs: toClose.map((tab) => ({ url: tab.url, title: tab.title })),
    },
  });

  await browser.tabs.remove(toClose.map((tab) => tab.id));

  await browser.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon.svg"),
    title: "Zen Tabs Cleaner",
    message:
      toClose.length === 1
        ? "1 inactive tab closed — click to restore it."
        : `${toClose.length} inactive tabs closed — click to restore them.`,
  });

  return toClose.length;
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

function ensureAlarm() {
  browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_PERIOD_MINUTES });
}

browser.runtime.onInstalled.addListener(ensureAlarm);
browser.runtime.onStartup.addListener(ensureAlarm);

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanTabs(false);
  }
});

browser.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === NOTIFICATION_ID) {
    browser.notifications.clear(NOTIFICATION_ID);
    restoreLastCleanup();
  }
});

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "cleanNow":
      return { closed: await cleanTabs(true) };
    case "restore":
      return { restored: await restoreLastCleanup() };
    default:
      return undefined;
  }
});

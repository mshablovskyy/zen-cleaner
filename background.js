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

// manual === true : déclenché depuis le popup — ignore le seuil d'inactivité
// et le mode pause, mais respecte toujours épinglés/actifs/audibles/exclusions.
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
      // lastAccessed absent = onglet dont on ne peut pas juger l'inactivité : on le garde.
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
    title: "Zen Cleaner",
    message:
      toClose.length === 1
        ? "1 onglet inactif fermé — cliquez pour le restaurer."
        : `${toClose.length} onglets inactifs fermés — cliquez pour les restaurer.`,
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
      // URL privilégiée (about:, chrome:, file:) — impossible à rouvrir depuis une extension.
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

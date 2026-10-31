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

function getSpaceRule(settings, spaceId) {
  const rule = settings.workspaceRules?.[spaceId] || {};
  const threshold = Number(rule.thresholdHours);
  return {
    enabled: rule.enabled !== false,
    thresholdHours:
      Number.isFinite(threshold) && threshold > 0
        ? threshold
        : settings.thresholdHours,
  };
}

// Returns why a tab must be spared, or null if it can be closed.
function spareReason(tab, settings, now, thresholdMs, manual) {
  if (tab.pinned) return "pinned";
  if (tab.active) return "active";
  if (tab.audible) return "audible";
  if (isExcluded(tab.url, settings.excludedDomains)) return "excluded";
  if (!manual) {
    // No lastAccessed = inactivity cannot be judged: keep the tab.
    if (typeof tab.lastAccessed !== "number" || tab.lastAccessed <= 0) {
      return "no lastAccessed";
    }
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

  const now = Date.now();
  const [tabs, activeSpaceId] = await Promise.all([
    browser.zenCleaner.getTabs(),
    browser.zenCleaner.getActiveSpaceId(),
  ]);

  const toClose = [];
  const sparedReport = [];
  for (const tab of tabs) {
    if (!tab.spaceId || (manual && tab.spaceId !== activeSpaceId)) continue;
    const rule = getSpaceRule(settings, tab.spaceId);
    if (!manual && !rule.enabled) continue;

    const thresholdMs = rule.thresholdHours * 3600 * 1000;
    const reason = spareReason(tab, settings, now, thresholdMs, manual);
    if (reason === null) {
      toClose.push({ ...tab, spaceName: tab.spaceName });
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

  console.debug(
    `[Zen Tabs Cleaner] ${manual ? "manual" : source} check: ` +
      `${tabs.length} tabs seen across spaces, closing ${toClose.length}`,
  );
  if (sparedReport.length > 0) {
    console.debug("[Zen Tabs Cleaner] spared tabs:", sparedReport);
  }

  // Close tabs one by one: a tab closed by the user in the meantime must not
  // abort the whole cleanup, and lastCleanup must only list actually closed tabs.
  const closedTabs = [];
  for (const tab of toClose) {
    try {
      if (await browser.zenCleaner.closeTab(tab.id)) {
        closedTabs.push({
          url: tab.url,
          title: tab.title,
          spaceId: tab.spaceId,
          spaceName: tab.spaceName,
        });
      }
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

  await browser.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon-96.png"),
    title: "Zen Tabs Cleaner",
    message:
      closedTabs.length === 1
        ? "1 inactive tab closed — click to restore it."
        : `${closedTabs.length} inactive tabs closed — click to restore them.`,
  });

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
      const created = await browser.tabs.create({ url: tab.url, active: false });
      if (tab.spaceId) {
        await browser.zenCleaner.moveTabToSpace(created.id, tab.spaceId);
      }
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

// The Zen Experiment API can see tabs in every space. Check on tab/window
// activity as well as the alarm so a tab that becomes inactive is noticed soon.
// Throttle rapid tab hops to avoid repeating the scan unnecessarily.
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
  const [activeSpaceId, tabs, spaces] = await Promise.all([
    browser.zenCleaner.getActiveSpaceId(),
    browser.zenCleaner.getTabs(),
    browser.zenCleaner.getSpaces(),
  ]);
  const spaceTabs = tabs.filter((tab) => tab.spaceId === activeSpaceId);
  const rule = getSpaceRule(settings, activeSpaceId);
  const thresholdMs = rule.thresholdHours * 3600 * 1000;
  const now = Date.now();
  return {
    total: spaceTabs.length,
    hidden: spaceTabs.filter((tab) => tab.hidden).length,
    eligible: tabs.filter(
      (tab) =>
        tab.spaceId === activeSpaceId &&
        spareReason(tab, settings, now, thresholdMs, false) === null,
    ).length,
    spaceName: spaces.find((space) => space.id === activeSpaceId)?.name || "",
    thresholdHours: rule.thresholdHours,
    globalEnabled: settings.enabled,
    spaceEnabled: rule.enabled,
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

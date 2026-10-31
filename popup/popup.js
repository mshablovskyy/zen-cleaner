"use strict";

const enabledInput = document.getElementById("enabled");
const thresholdHint = document.getElementById("threshold-hint");
const statsLine = document.getElementById("stats");
const cleanNowButton = document.getElementById("clean-now");
const lastCleanupRow = document.getElementById("last-cleanup");
const lastCleanupLabel = document.getElementById("last-cleanup-label");
const restoreButton = document.getElementById("restore");
const openOptionsButton = document.getElementById("open-options");

function formatThreshold(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  return `${hours} h`;
}

function renderLastCleanup(lastCleanup) {
  if (!lastCleanup || !lastCleanup.tabs.length) {
    lastCleanupRow.hidden = true;
    return;
  }
  const count = lastCleanup.tabs.length;
  const time = new Date(lastCleanup.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  lastCleanupLabel.textContent =
    count === 1
      ? `1 tab closed at ${time}`
      : `${count} tabs closed at ${time}`;
  lastCleanupRow.hidden = false;
}

async function refresh() {
  const settings = await browser.storage.local.get(DEFAULTS);
  enabledInput.checked = settings.enabled;
  renderLastCleanup(settings.lastCleanup);

  const stats = await browser.runtime.sendMessage({ type: "getStats" });
  const spaceLabel = stats.spaceName ? ` in ${stats.spaceName}` : "";
  thresholdHint.textContent =
    `Closes unpinned tabs inactive for ${formatThreshold(stats.thresholdHours ?? settings.thresholdHours)}${spaceLabel}.`;
  let text = `Watching ${stats.total} tabs`;
  if (stats.hidden > 0) {
    text += ` (${stats.hidden} hidden)`;
  }
  if (stats.eligible > 0) {
    text += ` — ${stats.eligible} overdue`;
  }
  if (!stats.globalEnabled) {
    text += " — paused";
  } else if (!stats.spaceEnabled) {
    text += ` — cleanup off${spaceLabel}`;
  }
  statsLine.textContent = text + ".";
}

enabledInput.addEventListener("change", () => {
  browser.storage.local.set({ enabled: enabledInput.checked });
});

let confirmPending = false;
cleanNowButton.addEventListener("click", async () => {
  if (!confirmPending) {
    confirmPending = true;
    cleanNowButton.textContent = "Confirm?";
    cleanNowButton.classList.add("danger");
    setTimeout(() => {
      confirmPending = false;
      cleanNowButton.textContent = "Clean now";
      cleanNowButton.classList.remove("danger");
    }, 3000);
    return;
  }
  confirmPending = false;
  cleanNowButton.disabled = true;
  const response = await browser.runtime.sendMessage({ type: "cleanNow" });
  cleanNowButton.disabled = false;
  cleanNowButton.classList.remove("danger");
  cleanNowButton.textContent =
    response.closed === 0
      ? "Nothing to close"
      : response.closed === 1
        ? "1 tab closed"
        : `${response.closed} tabs closed`;
  setTimeout(() => {
    cleanNowButton.textContent = "Clean now";
  }, 2000);
  refresh();
});

restoreButton.addEventListener("click", async () => {
  restoreButton.disabled = true;
  await browser.runtime.sendMessage({ type: "restore" });
  refresh().then(() => {
    restoreButton.disabled = false;
  });
});

openOptionsButton.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

refresh();

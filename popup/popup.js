"use strict";

const DEFAULTS = {
  enabled: true,
  thresholdHours: 12,
  excludedDomains: [],
  lastCleanup: null,
};

const enabledInput = document.getElementById("enabled");
const thresholdHint = document.getElementById("threshold-hint");
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
  const time = new Date(lastCleanup.timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  lastCleanupLabel.textContent =
    count === 1
      ? `1 onglet fermé à ${time}`
      : `${count} onglets fermés à ${time}`;
  lastCleanupRow.hidden = false;
}

async function refresh() {
  const settings = await browser.storage.local.get(DEFAULTS);
  enabledInput.checked = settings.enabled;
  thresholdHint.textContent = `Ferme les onglets non épinglés inactifs depuis ${formatThreshold(settings.thresholdHours)}.`;
  renderLastCleanup(settings.lastCleanup);
}

enabledInput.addEventListener("change", () => {
  browser.storage.local.set({ enabled: enabledInput.checked });
});

let confirmPending = false;
cleanNowButton.addEventListener("click", async () => {
  if (!confirmPending) {
    confirmPending = true;
    cleanNowButton.textContent = "Confirmer ?";
    cleanNowButton.classList.add("danger");
    setTimeout(() => {
      confirmPending = false;
      cleanNowButton.textContent = "Nettoyer maintenant";
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
      ? "Rien à fermer"
      : response.closed === 1
        ? "1 onglet fermé"
        : `${response.closed} onglets fermés`;
  setTimeout(() => {
    cleanNowButton.textContent = "Nettoyer maintenant";
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

"use strict";

const thresholdInput = document.getElementById("threshold");
const checkPeriodInput = document.getElementById("check-period");
const domainsTextarea = document.getElementById("excluded-domains");
const notifyInput = document.getElementById("notify-on-cleanup");
const savedIndicator = document.getElementById("saved-indicator");
const spaceRulesContainer = document.getElementById("space-rules");
const spaceApiWarning = document.getElementById("space-api-warning");
const thresholdPresets = document.querySelectorAll("#threshold-presets button");
const periodPresets = document.querySelectorAll("#period-presets button");
let workspaceRules = {};

let savedTimeout;
function showSaved() {
  savedIndicator.hidden = false;
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => {
    savedIndicator.hidden = true;
  }, 1500);
}

async function load() {
  const settings = await browser.storage.local.get(DEFAULTS);
  thresholdInput.value = settings.thresholdHours;
  checkPeriodInput.value = settings.checkPeriodMinutes;
  domainsTextarea.value = settings.excludedDomains.join("\n");
  notifyInput.checked = settings.notifyOnCleanup;
  workspaceRules = settings.workspaceRules || {};

  try {
    const spaces = await browser.zenCleaner.getSpaces();
    renderSpaceRules(spaces, settings.thresholdHours);
  } catch {
    spaceRulesContainer.hidden = true;
    spaceApiWarning.hidden = false;
  }
}

function saveWorkspaceRule(id, patch) {
  workspaceRules = {
    ...workspaceRules,
    [id]: { ...(workspaceRules[id] || {}), ...patch },
  };
  browser.storage.local.set({ workspaceRules }).then(showSaved);
}

function renderSpaceRules(spaces, defaultHours) {
  spaceRulesContainer.replaceChildren();
  if (!spaces.length) {
    spaceRulesContainer.textContent = "No Zen spaces found.";
    return;
  }

  spaces.forEach((space) => {
    const rule = workspaceRules[space.id] || {};
    const row = document.createElement("div");
    row.className = "space-rule";

    const name = document.createElement("strong");
    name.textContent = space.name || "Space";

    const enabledLabel = document.createElement("label");
    enabledLabel.className = "space-enabled";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = rule.enabled !== false;
    const enabledText = document.createElement("span");
    enabledText.textContent = "Automatic cleanup";
    enabledLabel.append(enabled, enabledText);

    const thresholdLabel = document.createElement("label");
    thresholdLabel.className = "space-threshold";
    thresholdLabel.append(document.createTextNode("Close inactive tabs after"));
    const hours = document.createElement("input");
    hours.type = "number";
    hours.min = "0.05";
    hours.step = "0.05";
    hours.value = rule.thresholdHours ?? defaultHours;
    hours.disabled = !enabled.checked;
    const unit = document.createElement("span");
    unit.textContent = "hours";
    thresholdLabel.append(hours, unit);

    enabled.addEventListener("change", () => {
      hours.disabled = !enabled.checked;
      saveWorkspaceRule(space.id, { enabled: enabled.checked });
    });
    hours.addEventListener("change", () => {
      const value = Number(hours.value);
      if (!Number.isFinite(value) || value <= 0) {
        hours.value = workspaceRules[space.id]?.thresholdHours ?? defaultHours;
        return;
      }
      saveWorkspaceRule(space.id, { thresholdHours: value });
    });

    row.append(name, enabledLabel, thresholdLabel);
    spaceRulesContainer.append(row);
  });
}

function saveThreshold(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return;
  browser.storage.local.set({ thresholdHours: value }).then(showSaved);
}

function saveCheckPeriod(minutes) {
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value) || value < 1) return;
  checkPeriodInput.value = value;
  browser.storage.local.set({ checkPeriodMinutes: value }).then(showSaved);
}

thresholdInput.addEventListener("change", () => {
  saveThreshold(thresholdInput.value);
});

checkPeriodInput.addEventListener("change", () => {
  saveCheckPeriod(checkPeriodInput.value);
});

thresholdPresets.forEach((button) => {
  button.addEventListener("click", () => {
    thresholdInput.value = button.dataset.hours;
    saveThreshold(button.dataset.hours);
  });
});

periodPresets.forEach((button) => {
  button.addEventListener("click", () => {
    saveCheckPeriod(button.dataset.minutes);
  });
});

domainsTextarea.addEventListener("change", () => {
  const excludedDomains = domainsTextarea.value
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  browser.storage.local.set({ excludedDomains }).then(showSaved);
});

notifyInput.addEventListener("change", () => {
  browser.storage.local
    .set({ notifyOnCleanup: notifyInput.checked })
    .then(showSaved);
});

load();

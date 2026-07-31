"use strict";

const DEFAULTS = {
  thresholdHours: 12,
  excludedDomains: [],
};

const thresholdInput = document.getElementById("threshold");
const domainsTextarea = document.getElementById("excluded-domains");
const savedIndicator = document.getElementById("saved-indicator");
const presetButtons = document.querySelectorAll(".presets button");

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
  domainsTextarea.value = settings.excludedDomains.join("\n");
}

function saveThreshold(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return;
  browser.storage.local.set({ thresholdHours: value }).then(showSaved);
}

thresholdInput.addEventListener("change", () => {
  saveThreshold(thresholdInput.value);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    thresholdInput.value = button.dataset.hours;
    saveThreshold(button.dataset.hours);
  });
});

domainsTextarea.addEventListener("change", () => {
  const excludedDomains = domainsTextarea.value
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  browser.storage.local.set({ excludedDomains }).then(showSaved);
});

load();

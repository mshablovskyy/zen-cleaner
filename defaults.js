"use strict";

// Shared settings defaults — must be loaded before any script that uses it.
const DEFAULTS = {
  enabled: true,
  thresholdHours: 12,
  checkPeriodMinutes: 15,
  excludedDomains: [],
  workspaceRules: {},
  lastCleanup: null,
};

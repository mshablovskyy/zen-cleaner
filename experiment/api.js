/* globals ChromeUtils, ExtensionAPI, Services */
"use strict";

this.zenCleaner = class extends ExtensionAPI {
  getAPI(context) {
    function browserWindows() {
      const windows = Services.wm.getEnumerator("navigator:browser");
      const result = [];
      while (windows.hasMoreElements()) {
        const window = windows.getNext();
        if (
          window?.gBrowser &&
          window?.gZenWorkspaces &&
          (context.extension.privateBrowsingAllowed || !isPrivateWindow(window))
        ) {
          result.push(window);
        }
      }
      return result;
    }

    function isPrivateWindow(window) {
      try {
        return window.docShell.QueryInterface(Ci.nsILoadContext).usePrivateBrowsing;
      } catch {
        // If the window's privacy state cannot be checked, do not expose its tabs.
        return true;
      }
    }

    function nativeTab(tabId) {
      try {
        return context.extension.tabManager.get(tabId)?.nativeTab || null;
      } catch {
        return null;
      }
    }

    function windowForTab(tab) {
      return browserWindows().find((window) => window.gBrowser.tabs.includes(tab));
    }

    return {
      zenCleaner: {
        async getSpaces() {
          const spaces = new Map();
          for (const window of browserWindows()) {
            for (const space of window.gZenWorkspaces.getWorkspaces() || []) {
              if (space?.uuid && !spaces.has(space.uuid)) {
                spaces.set(space.uuid, { id: space.uuid, name: space.name || "Space" });
              }
            }
          }
          return [...spaces.values()];
        },

        async getActiveSpaceId() {
          const window = Services.wm.getMostRecentWindow("navigator:browser");
          if (
            !window ||
            (!context.extension.privateBrowsingAllowed && isPrivateWindow(window))
          ) {
            return "";
          }
          return window.gZenWorkspaces?.activeWorkspace || "";
        },

        async getTabs() {
          const tabs = [];
          for (const window of browserWindows()) {
            const spaces = new Map(
              (window.gZenWorkspaces.getWorkspaces() || []).map((space) => [space.uuid, space.name || "Space"]),
            );
            for (const tab of window.document.querySelectorAll(".tabbrowser-tab")) {
              if (tab.closing) continue;
              let id;
              try {
                id = context.extension.tabManager.getWrapper(tab)?.id;
              } catch {
                continue;
              }
              if (!Number.isInteger(id)) continue;

              const spaceId = tab.getAttribute("zen-workspace-id") || "";
              tabs.push({
                id,
                spaceId,
                spaceName: spaces.get(spaceId) || "",
                title: tab.label || "",
                url: tab.linkedBrowser?.currentURI?.spec || "",
                lastAccessed: typeof tab.lastAccessed === "number" ? tab.lastAccessed : -1,
                pinned: !!tab.pinned || tab.hasAttribute("zen-essential"),
                active: !!tab.selected,
                audible: tab.hasAttribute("soundplaying"),
                hidden: !!tab.hidden,
              });
            }
          }
          return tabs;
        },

        async closeTab(tabId) {
          const tab = nativeTab(tabId);
          const window = tab && windowForTab(tab);
          if (
            !window || tab.closing || tab.pinned || tab.hasAttribute("zen-essential") ||
            tab.selected || tab.hasAttribute("soundplaying")
          ) {
            return false;
          }
          try {
            window.gBrowser.removeTab(tab);
            return true;
          } catch {
            return false;
          }
        },

        async moveTabToSpace(tabId, spaceId) {
          const tab = nativeTab(tabId);
          const window = tab && windowForTab(tab);
          if (!window?.gZenWorkspaces?.moveTabsToWorkspace || !spaceId) return false;
          const exists = (window.gZenWorkspaces.getWorkspaces() || [])
            .some((space) => space.uuid === spaceId);
          if (!exists) return false;
          try {
            await window.gZenWorkspaces.moveTabsToWorkspace([tab], spaceId);
            return true;
          } catch {
            return false;
          }
        },
      },
    };
  }
};

import { app } from "electron";
import { JsonStore } from "./json-store";
import { settingsFile } from "./paths";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { DeepPartial, Settings } from "../../shared/types";
import { logger } from "./logger";

const store = new JsonStore<Settings>(settingsFile(), DEFAULT_SETTINGS);

export function getSettings(): Settings {
  return store.get();
}

export function updateSettings(patch: DeepPartial<Settings>): Settings {
  const next = store.update(patch);
  applyLoginItem(next);
  return next;
}

export function resetSettings(): Settings {
  const next = store.reset();
  applyLoginItem(next);
  return next;
}

export function applyLoginItem(settings: Settings): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.launcher.launchAtLogin,
      args: settings.launcher.startMinimized ? ["--hidden"] : [],
    });
  } catch (error) {
    logger.warn("Could not update login item settings", error);
  }
}

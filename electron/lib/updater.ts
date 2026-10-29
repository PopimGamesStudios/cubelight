import { app } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./settings";
import { logger } from "./logger";
import type { Settings, UpdateStatus } from "../../shared/types";

const PLACEHOLDER_OWNER = "your-github-username";

let status: UpdateStatus = { state: "idle" };
let broadcastStatus: (status: UpdateStatus) => void = () => {};
let checkTimer: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;

function releaseNotes(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "note" in entry) {
          return String((entry as { note: unknown }).note ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return undefined;
}

function setStatus(next: UpdateStatus): UpdateStatus {
  status = { ...next, checkedAt: next.checkedAt ?? Date.now() };
  broadcastStatus(status);
  return status;
}

/**
 * A build that still points at the placeholder GitHub repo has no release feed.
 * Skip the automatic check instead of hammering github.com with 404s.
 */
function feedConfigured(): boolean {
  if (getSettings().launcher.updateFeedUrl.trim()) return true;
  try {
    const yml = fs.readFileSync(path.join(process.resourcesPath, "app-update.yml"), "utf8");
    return !yml.includes(PLACEHOLDER_OWNER);
  } catch {
    return true;
  }
}

function applyFeed(settings: Settings): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // electron-updater names the manifest after the channel: "latest.yml" for
  // the default channel, "beta.yml" for beta. Our "stable" setting must map to
  // "latest", otherwise the updater asks GitHub for stable.yml and gets a 404.
  autoUpdater.channel = settings.launcher.updateChannel === "beta" ? "beta" : "latest";
  autoUpdater.allowPrerelease = settings.launcher.updateChannel === "beta";
  // Setting channel re-enables downgrades, so lock it afterwards.
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = logger as never;
  if (settings.launcher.updateFeedUrl.trim()) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: settings.launcher.updateFeedUrl.trim(),
    });
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    return setStatus({
      state: "dev",
      message: "Updates are only available in a packaged build. Use `npm run release` or push a version tag.",
    });
  }
  const settings = getSettings();
  applyFeed(settings);
  if (!feedConfigured()) {
    return setStatus({
      state: "idle",
      message: "Auto-update is not configured. Set publish.owner and publish.repo in electron-builder.yml.",
    });
  }
  setStatus({ state: "checking", message: "Checking for updates…" });
  try {
    await autoUpdater.checkForUpdates();
    return status;
  } catch (error) {
    logger.warn("Update check failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const missingManifest =
      message.includes("ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") || message.includes("404");
    return setStatus({
      state: "error",
      message: missingManifest
        ? "The release feed has no update manifest for the selected channel. Publish a release that includes latest.yml, or set the release channel to Stable in Settings."
        : message,
    });
  }
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (!app.isPackaged) return status;
  if (status.state === "downloaded" || status.state === "downloading") return status;
  setStatus({ ...status, state: "downloading", percent: 0, message: "Downloading update…" });
  try {
    await autoUpdater.downloadUpdate();
    return status;
  } catch (error) {
    logger.warn("Update download failed", error);
    return setStatus({
      state: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function installUpdate(): void {
  if (status.state !== "downloaded") {
    throw new Error("The update has not finished downloading yet.");
  }
  autoUpdater.quitAndInstall(false, true);
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

export function initUpdater(broadcast: (status: UpdateStatus) => void): void {
  broadcastStatus = broadcast;
  const settings = getSettings();

  autoUpdater.on("checking-for-update", () => {
    setStatus({ state: "checking", message: "Checking for updates…" });
  });
  autoUpdater.on("update-available", (info) => {
    setStatus({
      state: "available",
      version: info.version,
      releaseNotes: releaseNotes(info.releaseNotes),
      message: `Cubelight ${info.version} is available.`,
    });
    if (getSettings().launcher.autoDownloadUpdates) {
      void downloadUpdate();
    }
  });
  autoUpdater.on("update-not-available", (info) => {
    setStatus({
      state: "not-available",
      version: info.version,
      message: "You're on the latest version.",
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    setStatus({
      state: "downloading",
      version: status.version,
      percent: Math.round(progress.percent),
      message: `Downloading update… ${Math.round(progress.percent)}%`,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setStatus({
      state: "downloaded",
      version: info.version,
      percent: 100,
      releaseNotes: releaseNotes(info.releaseNotes),
      message: "Update ready. Restart Cubelight to install it.",
    });
  });
  autoUpdater.on("error", (error) => {
    logger.warn("Updater error", error);
    setStatus({ state: "error", message: error.message });
  });

  if (app.isPackaged && settings.launcher.autoCheckUpdates && feedConfigured()) {
    checkTimer = setTimeout(() => {
      void checkForUpdates();
    }, 7_000);
    intervalTimer = setInterval(() => {
      void checkForUpdates();
    }, 4 * 60 * 60_000);
  }
}

export function disposeUpdater(): void {
  if (checkTimer) clearTimeout(checkTimer);
  if (intervalTimer) clearInterval(intervalTimer);
  checkTimer = null;
  intervalTimer = null;
}

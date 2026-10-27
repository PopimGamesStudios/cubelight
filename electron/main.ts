import { app, BrowserWindow, dialog, shell } from "electron";
import path from "node:path";
import { getSettings, applyLoginItem } from "./lib/settings";
import { ensureDirs } from "./lib/paths";
import { ensureDataDirs, killAllGames, launchGame, navigateTo, registerIpc, type IpcContext } from "./lib/ipc";
import { createTray, destroyTray, refreshTray } from "./lib/tray";
import { checkForUpdates, disposeUpdater, initUpdater } from "./lib/updater";
import { initAuth } from "./lib/auth";
import { listInstances } from "./lib/instances";
import { logger } from "./lib/logger";
import type { AppPage } from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let startHidden = false;

app.setName("Cubelight");
app.setAppUserModelId("org.cubelight.launcher");
app.commandLine.appendSwitch("force-color-profile", "srgb");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());

  app.on("before-quit", () => {
    quitting = true;
    killAllGames();
    disposeUpdater();
  });

  app.on("will-quit", () => {
    destroyTray();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !getSettings().launcher.closeToTray) {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow) createWindow();
    showWindow();
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
  });

  app.whenReady().then(async () => {
    ensureDirs();
    ensureDataDirs();
    applyLoginItem(getSettings());
    initAuth();

    const context: IpcContext = {
      getWindow: () => mainWindow,
      broadcast,
      quit: () => {
        quitting = true;
        app.quit();
      },
    };

    registerIpc(context);
    createWindow();

    createTray({
      getInstances: listInstances,
      showWindow,
      hideWindow,
      isVisible: () => Boolean(mainWindow?.isVisible()),
      quit: () => {
        quitting = true;
        app.quit();
      },
      navigate: (page) => {
        showWindow();
        navigateTo(page);
      },
      launchInstance: (id) => {
        showWindow();
        void launchGame(id, context).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn("Tray launch failed", error);
          dialog.showErrorBox("Cubelight could not launch the game", message);
        });
      },
      checkUpdates: () => {
        void checkForUpdates();
      },
    });

    initUpdater((status) => broadcast("updater:status", status));
    refreshTray();
  });
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideWindow(): void {
  mainWindow?.hide();
}

function createWindow(): void {
  if (mainWindow) return;
  const settings = getSettings();
  startHidden = process.argv.includes("--hidden") || settings.launcher.startMinimized;

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(app.getAppPath(), "build", "icon.png");
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    frame: isMac,
    titleBarStyle: isMac ? "hiddenInset" : undefined,
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    backgroundColor: settings.appearance.background,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? "";
    if (url === current) return;
    if (url.startsWith("https://") || url.startsWith("http://")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.once("ready-to-show", () => {
    const latest = getSettings();
    mainWindow?.webContents.setZoomFactor(Math.min(1.4, Math.max(0.8, latest.appearance.uiScale)));
    if (!startHidden) {
      mainWindow?.show();
    }
  });

  mainWindow.on("maximize", () => broadcast("window:maximized", true));
  mainWindow.on("unmaximize", () => broadcast("window:maximized", false));

  mainWindow.on("minimize", () => {
    if (getSettings().launcher.minimizeToTray) {
      mainWindow?.hide();
    }
  });

  mainWindow.on("close", (event) => {
    if (quitting) return;
    if (getSettings().launcher.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

export function openPage(page: AppPage): void {
  showWindow();
  navigateTo(page);
}

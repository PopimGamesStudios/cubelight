import { app, Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import type { AppPage, Instance } from "../../shared/types";

interface TrayOptions {
  getInstances: () => Instance[];
  showWindow: () => void;
  hideWindow: () => void;
  isVisible: () => boolean;
  quit: () => void;
  navigate: (page: AppPage) => void;
  launchInstance: (id: string) => void;
  checkUpdates: () => void;
}

let tray: Tray | null = null;
let options: TrayOptions | null = null;

function iconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "tray.png")
    : path.join(app.getAppPath(), "build", "tray.png");
}

function buildMenu(): Menu {
  const current = options;
  const instances = current?.getInstances() ?? [];
  const launchItems = instances
    .filter((instance) => instance.kind === "client")
    .slice(0, 8)
    .map((instance) => ({
      label: instance.name,
      click: () => current?.launchInstance(instance.id),
    }));

  return Menu.buildFromTemplate([
    {
      label: "Open Cubelight",
      click: () => options?.showWindow(),
    },
    { type: "separator" },
    {
      label: "Quick launch",
      enabled: launchItems.length > 0,
      submenu: launchItems.length
        ? launchItems
        : [{ label: "No client instances yet", enabled: false }],
    },
    {
      label: "Browse mods & plugins",
      click: () => {
        options?.showWindow();
        options?.navigate("mods");
      },
    },
    {
      label: "Settings",
      click: () => {
        options?.showWindow();
        options?.navigate("settings");
      },
    },
    { type: "separator" },
    {
      label: "Check for updates",
      click: () => options?.checkUpdates(),
    },
    { type: "separator" },
    {
      label: "Quit Cubelight",
      click: () => options?.quit(),
    },
  ]);
}

export function createTray(nextOptions: TrayOptions): void {
  options = nextOptions;
  const image = nativeImage.createFromPath(iconPath());
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip("Cubelight, open-source Minecraft launcher");
  tray.setContextMenu(buildMenu());
  tray.on("click", () => {
    if (options?.isVisible()) options.hideWindow();
    else options?.showWindow();
  });
  tray.on("double-click", () => options?.showWindow());
}

export function refreshTray(): void {
  if (!tray) return;
  tray.setContextMenu(buildMenu());
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
  options = null;
}

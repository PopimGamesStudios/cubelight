import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  appearance: {
    preset: "acid",
    accent: "#c8ff3d",
    background: "#08090b",
    surface: "#0f1115",
    text: "#f4f6f8",
    fontFamily: "'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif",
    displayFont: "'Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', sans-serif",
    monoFont: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
    fontSize: 16,
    uiScale: 1,
    radius: 6,
    density: "comfortable",
    reduceMotion: false,
    backgroundPattern: "grid",
    sidebarCollapsed: false,
  },
  launcher: {
    closeToTray: true,
    minimizeToTray: true,
    launchAtLogin: false,
    startMinimized: false,
    minimizeOnLaunch: true,
    showSnapshots: false,
    defaultMemoryMb: 4096,
    javaPath: "",
    gameWindowWidth: 1280,
    gameWindowHeight: 720,
    fullscreen: false,
    autoCheckUpdates: true,
    autoDownloadUpdates: true,
    updateChannel: "stable",
    updateFeedUrl: "",
    curseforgeApiKey: "",
    msClientId: "",
    modrinthUserAgent: "Cubelight/1.0.2 (github.com/PopimGamesStudios/cubelight)",
    maxConcurrentDownloads: 6,
    confirmBeforeDelete: true,
  },
};

export const THEME_PRESETS = [
  {
    id: "acid",
    name: "Acid",
    accent: "#c8ff3d",
    background: "#08090b",
    surface: "#0f1115",
    text: "#f4f6f8",
  },
  {
    id: "ember",
    name: "Ember",
    accent: "#ff6b3d",
    background: "#0b0807",
    surface: "#15100d",
    text: "#f8f1eb",
  },
  {
    id: "violet",
    name: "Violet",
    accent: "#a78bfa",
    background: "#09070f",
    surface: "#12101b",
    text: "#f3f0ff",
  },
  {
    id: "forest",
    name: "Forest",
    accent: "#5eead4",
    background: "#06100d",
    surface: "#0c1a16",
    text: "#ecfdf8",
  },
  {
    id: "ice",
    name: "Ice",
    accent: "#2563eb",
    background: "#eef1f6",
    surface: "#ffffff",
    text: "#0a0c10",
  },
] as const;

export const FONT_OPTIONS = [
  {
    id: "inter",
    name: "Inter",
    value: "'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "space",
    name: "Space Grotesk",
    value: "'Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', sans-serif",
  },
  {
    id: "mono",
    name: "JetBrains Mono",
    value: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
  },
  {
    id: "system",
    name: "System UI",
    value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: "segoe",
    name: "Segoe UI Variable",
    value: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif",
  },
] as const;

export const DISPLAY_FONT_OPTIONS = [
  {
    id: "space",
    name: "Space Grotesk",
    value: "'Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', sans-serif",
  },
  {
    id: "inter",
    name: "Inter Tight",
    value: "'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif",
  },
  {
    id: "mono",
    name: "JetBrains Mono",
    value: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
  },
  {
    id: "system",
    name: "System UI",
    value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
] as const;

export const MONO_FONT_OPTIONS = [
  {
    id: "jetbrains",
    name: "JetBrains Mono",
    value: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
  },
  {
    id: "cascadia",
    name: "Cascadia Code",
    value: "'Cascadia Code', 'JetBrains Mono', ui-monospace, monospace",
  },
  {
    id: "consolas",
    name: "Consolas",
    value: "Consolas, 'JetBrains Mono', ui-monospace, monospace",
  },
] as const;

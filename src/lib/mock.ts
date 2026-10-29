import { DEFAULT_SETTINGS } from "@shared/defaults";
import type {
  AppPage,
  CubelightApi,
  DeviceCodeInfo,
  GameLogEvent,
  GameProgress,
  GameVersion,
  Instance,
  InstalledMod,
  LaunchState,
  ModProgress,
  ModSearchQuery,
  ModSearchResponse,
  ModSearchResult,
  ModType,
  ModVersionInfo,
  PublicAccount,
  Settings,
  UpdateStatus,
} from "@shared/types";
import { deepMerge } from "./merge";

const SETTINGS_KEY = "cubelight.mock.settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    return deepMerge(structuredClone(DEFAULT_SETTINGS), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

let mockSettings = loadSettings();
let mockMaximized = false;
const listeners = {
  gameState: new Set<(event: LaunchState) => void>(),
  gameProgress: new Set<(event: GameProgress) => void>(),
  gameLog: new Set<(event: GameLogEvent) => void>(),
  modProgress: new Set<(event: ModProgress) => void>(),
  updater: new Set<(event: UpdateStatus) => void>(),
  deviceCode: new Set<(info: DeviceCodeInfo) => void>(),
  account: new Set<(account: PublicAccount | null) => void>(),
  authError: new Set<(message: string) => void>(),
  navigate: new Set<(page: AppPage) => void>(),
  maximize: new Set<(value: boolean) => void>(),
};

function subscribe<T>(set: Set<(value: T) => void>, callback: (value: T) => void): () => void {
  set.add(callback);
  return () => set.delete(callback);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Modrinth does not serve /data/<id>/icon.png for every project any more, so
// the mock uses the real CDN URLs returned by the API.
const MOD_ICONS: Record<string, string> = {
  "1bokaNcj": "https://cdn.modrinth.com/data/1bokaNcj/354080f65407e49f486fcf9c4580e82c45ae63b8_96.webp",
  "8oi3bsk5": "https://cdn.modrinth.com/data/8oi3bsk5/1959d924a1088944bbf07a06ba523726112d7e7a_96.webp",
  "9eGKb6K1": "https://cdn.modrinth.com/data/9eGKb6K1/icon.png",
  AANobbMI: "https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp",
  gvQqBUqZ: "https://cdn.modrinth.com/data/gvQqBUqZ/bcc8686c13af0143adf4285d741256af824f70b7_96.webp",
  LNytGWDc: "https://cdn.modrinth.com/data/LNytGWDc/61d716699bcf1ec42ed4926a9e1c7311be6087e2_96.webp",
  mOgUt4GM: "https://cdn.modrinth.com/data/mOgUt4GM/5a20ed1450a0e1e79a1fe04e61bb4e5878bf1d20.png",
  P7dR8mSH: "https://cdn.modrinth.com/data/P7dR8mSH/icon.png",
  YL57xq9U: "https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp",
};

const icon = (project: string): string | undefined => MOD_ICONS[project];

const installed = (
  key: string,
  projectId: string,
  title: string,
  fileName: string,
  versionName: string,
  type: ModType,
  iconUrl?: string,
): InstalledMod => ({
  key,
  projectId,
  provider: "modrinth",
  title,
  fileName,
  versionName,
  type,
  iconUrl,
  enabled: true,
  installedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  websiteUrl: "https://modrinth.com",
});

let mockInstances: Instance[] = [
  {
    id: "demo-fabric",
    name: "Neon Survival",
    mcVersion: "1.21.1",
    loader: "fabric",
    loaderVersion: "0.16.9",
    versionId: "fabric-loader-0.16.9-1.21.1",
    kind: "client",
    color: "#c8ff3d",
    memoryMb: 6144,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 42,
    lastPlayed: Date.now() - 1000 * 60 * 48,
    installed: true,
    installedMods: [
      installed("modrinth:AANobbMI:v1", "AANobbMI", "Sodium", "sodium-fabric-0.6.5.jar", "0.6.5", "mod", icon("AANobbMI")),
      installed("modrinth:YL57xq9U:v1", "YL57xq9U", "Iris Shaders", "iris-fabric-1.8.1.jar", "1.8.1", "mod", icon("YL57xq9U")),
      installed("modrinth:P7dR8mSH:v1", "P7dR8mSH", "Fabric API", "fabric-api-0.110.0.jar", "0.110.0", "mod", icon("P7dR8mSH")),
      installed("modrinth:mOgUt4GM:v1", "mOgUt4GM", "Mod Menu", "modmenu-11.0.3.jar", "11.0.3", "mod", icon("mOgUt4GM")),
      installed("modrinth:1bokaNcj:v1", "1bokaNcj", "Xaero's Minimap", "xaeros-minimap-25.1.0.jar", "25.1.0", "mod", icon("1bokaNcj")),
    ],
  },
  {
    id: "demo-vanilla",
    name: "Vanilla+",
    mcVersion: "1.20.1",
    loader: "vanilla",
    kind: "client",
    color: "#4f8cff",
    memoryMb: 4096,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    lastPlayed: Date.now() - 1000 * 60 * 60 * 30,
    installed: true,
    installedMods: [],
  },
  {
    id: "demo-server",
    name: "SMP Plugins",
    mcVersion: "1.21.4",
    loader: "vanilla",
    kind: "server",
    color: "#ff6b3d",
    memoryMb: 4096,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    installed: true,
    installedMods: [
      installed("modrinth:Vebnzrzj:v1", "Vebnzrzj", "LuckPerms", "LuckPerms-Bukkit-5.4.150.jar", "5.4.150", "plugin"),
      installed("modrinth:WiB9m0X7:v1", "WiB9m0X7", "CoreProtect", "CoreProtect-22.4.jar", "22.4", "plugin"),
    ],
  },
];

let mockAccount: PublicAccount = { mode: "offline", name: "Player", uuid: "8f4e8f6e-3a7b-3b1a-9c2e-6a0f0b6c1d2e" };

const mockVersions: GameVersion[] = [
  ["1.21.5", "2025-03-25"],
  ["1.21.4", "2024-12-03"],
  ["1.21.1", "2024-08-08"],
  ["1.20.6", "2024-04-29"],
  ["1.20.4", "2023-12-07"],
  ["1.20.1", "2023-06-12"],
  ["1.19.2", "2022-08-05"],
  ["1.18.2", "2022-02-28"],
  ["1.16.5", "2021-01-14"],
  ["1.12.2", "2017-09-18"],
  ["1.8.9", "2015-12-09"],
].map(([id, releaseTime]) => ({ id, type: "release", releaseTime }));

const mockJava = [
  {
    path: "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot\\bin\\java.exe",
    version: "21.0.5",
    majorVersion: 21,
    source: "Adoptium",
  },
  {
    path: "C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot\\bin\\java.exe",
    version: "17.0.13",
    majorVersion: 17,
    source: "Adoptium",
  },
  {
    path: "C:\\Program Files\\Java\\jre1.8.0_431\\bin\\java.exe",
    version: "1.8.0_431",
    majorVersion: 8,
    source: "Oracle",
  },
];

const MODS: ModSearchResult[] = [
  {
    id: "AANobbMI",
    provider: "modrinth",
    title: "Sodium",
    slug: "sodium",
    description: "A modern rendering engine for Minecraft that dramatically improves frame rates and reduces micro-stutter.",
    iconUrl: icon("AANobbMI"),
    author: "jellysquid3",
    downloads: 18_400_000,
    followers: 24_100,
    categories: ["optimization"],
    loaders: ["fabric", "neoforge"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.6", "1.20.1"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/sodium",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: "YL57xq9U",
    provider: "modrinth",
    title: "Iris Shaders",
    slug: "iris",
    description: "A modern shader pack loader for Minecraft, built for performance and compatibility with Sodium.",
    iconUrl: icon("YL57xq9U"),
    author: "coderbot",
    downloads: 9_800_000,
    followers: 18_200,
    categories: ["shaders", "optimization"],
    loaders: ["fabric", "neoforge"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.6", "1.20.1"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/iris",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "LNytGWDc",
    provider: "modrinth",
    title: "Create",
    slug: "create",
    description: "Aesthetic technology. Build elaborate contraptions, automate production, and reshape your world.",
    iconUrl: icon("LNytGWDc"),
    author: "simibubi",
    downloads: 7_200_000,
    followers: 31_400,
    categories: ["technology", "decoration"],
    loaders: ["forge", "fabric", "neoforge"],
    gameVersions: ["1.21.1", "1.20.1", "1.19.2", "1.18.2"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/create",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "P7dR8mSH",
    provider: "modrinth",
    title: "Fabric API",
    slug: "fabric-api",
    description: "The essential hooks and interoperability layer for the Fabric mod ecosystem.",
    iconUrl: icon("P7dR8mSH"),
    author: "modmuss50",
    downloads: 32_100_000,
    followers: 9_800,
    categories: ["library"],
    loaders: ["fabric"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.6", "1.20.1"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/fabric-api",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "u6dRKJwZ",
    provider: "modrinth",
    title: "Just Enough Items",
    slug: "jei",
    description: "View recipes and uses for items, blocks and fluids. The definitive recipe browser.",
    author: "mezz",
    downloads: 12_700_000,
    followers: 6_300,
    categories: ["utility"],
    loaders: ["forge", "neoforge", "fabric"],
    gameVersions: ["1.21.1", "1.20.1", "1.19.2", "1.18.2"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/jei",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
  },
  {
    id: "8oi3bsk5",
    provider: "modrinth",
    title: "Terralith",
    slug: "terralith",
    description: "Over 100 new biomes built with vanilla blocks, designed to feel like an official expansion.",
    iconUrl: icon("8oi3bsk5"),
    author: "Starmute",
    downloads: 6_400_000,
    followers: 14_700,
    categories: ["worldgen"],
    loaders: ["fabric", "neoforge", "forge"],
    gameVersions: ["1.21.1", "1.20.1", "1.19.2"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/terralith",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
  {
    id: "9eGKb6K1",
    provider: "modrinth",
    title: "Simple Voice Chat",
    slug: "simple-voice-chat",
    description: "A proximity voice chat mod with a clean in-game UI and server-side support.",
    iconUrl: icon("9eGKb6K1"),
    author: "henkelmax",
    downloads: 4_900_000,
    followers: 8_100,
    categories: ["social", "utility"],
    loaders: ["fabric", "forge", "neoforge"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "mod",
    websiteUrl: "https://modrinth.com/plugin/simple-voice-chat",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "gvQqBUqZ",
    provider: "modrinth",
    title: "Lithium",
    slug: "lithium",
    description: "A no-compromises game logic and performance optimization mod for Fabric.",
    iconUrl: icon("gvQqBUqZ"),
    author: "jellysquid3",
    downloads: 8_300_000,
    followers: 7_600,
    categories: ["optimization"],
    loaders: ["fabric", "neoforge"],
    gameVersions: ["1.21.1", "1.20.1", "1.19.2"],
    type: "mod",
    websiteUrl: "https://modrinth.com/mod/lithium",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
  },
];

const PLUGINS: ModSearchResult[] = [
  {
    id: "Vebnzrzj",
    provider: "modrinth",
    title: "LuckPerms",
    slug: "luckperms",
    description: "A flexible permissions plugin with a web editor, contexts, and support for every major server platform.",
    author: "Luck",
    downloads: 5_600_000,
    categories: ["management", "utility"],
    loaders: ["bukkit", "paper", "spigot", "velocity"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "plugin",
    websiteUrl: "https://modrinth.com/plugin/luckperms",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "WiB9m0X7",
    provider: "modrinth",
    title: "CoreProtect",
    slug: "coreprotect",
    description: "Fast, reliable block logging and rollback. See who changed what, and undo griefing in seconds.",
    author: "Intelli",
    downloads: 3_100_000,
    categories: ["management", "utility"],
    loaders: ["bukkit", "paper", "spigot"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "plugin",
    websiteUrl: "https://modrinth.com/plugin/coreprotect",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "essentialsx",
    provider: "modrinth",
    title: "EssentialsX",
    slug: "essentialsx",
    description: "The essential toolkit for every server: homes, warps, kits, economy, moderation and more.",
    author: "EssentialsX",
    downloads: 4_200_000,
    categories: ["management", "economy"],
    loaders: ["bukkit", "paper", "spigot"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "plugin",
    websiteUrl: "https://modrinth.com/plugin/essentialsx",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: "worldedit",
    provider: "modrinth",
    title: "WorldEdit",
    slug: "worldedit",
    description: "A powerful in-game map editor with brushes, schematics and scripting for builders.",
    author: "EngineHub",
    downloads: 3_800_000,
    categories: ["utility", "decoration"],
    loaders: ["bukkit", "paper", "spigot", "fabric"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "plugin",
    websiteUrl: "https://modrinth.com/plugin/worldedit",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: "viaversion",
    provider: "modrinth",
    title: "ViaVersion",
    slug: "viaversion",
    description: "Allow newer Minecraft clients to connect to older servers, and keep your community together.",
    author: "ViaVersion",
    downloads: 2_900_000,
    categories: ["utility"],
    loaders: ["bukkit", "paper", "velocity", "bungeecord"],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "plugin",
    websiteUrl: "https://modrinth.com/plugin/viaversion",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
];

const RESOURCE_PACKS: ModSearchResult[] = [
  {
    id: "fresh-animations",
    provider: "modrinth",
    title: "Fresh Animations",
    slug: "fresh-animations",
    description: "A detailed animation overhaul for vanilla mobs. Expressive, readable and surprisingly lightweight.",
    author: "FreshLX",
    downloads: 4_400_000,
    categories: ["decoration", "vanilla-like"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "resourcepack",
    websiteUrl: "https://modrinth.com/resourcepack/fresh-animations",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "stay-true",
    provider: "modrinth",
    title: "Stay True",
    slug: "stay-true",
    description: "A vanilla-adjacent resource pack that keeps the original look while adding depth and detail.",
    author: "Yuruze",
    downloads: 1_900_000,
    categories: ["vanilla-like"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "resourcepack",
    websiteUrl: "https://modrinth.com/resourcepack/stay-true",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
  },
  {
    id: "better-leaves",
    provider: "modrinth",
    title: "Better Leaves",
    slug: "better-leaves",
    description: "Fluffy, connected leaves that make forests feel dense without changing the vanilla palette.",
    author: "Motschen",
    downloads: 2_700_000,
    categories: ["decoration"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "resourcepack",
    websiteUrl: "https://modrinth.com/resourcepack/better-leaves",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
  },
];

const SHADERS: ModSearchResult[] = [
  {
    id: "complementary",
    provider: "modrinth",
    title: "Complementary Reimagined",
    slug: "complementary-reimagined",
    description: "A polished, performance-friendly shader with gorgeous lighting, water and atmospheric fog.",
    author: "EminGT",
    downloads: 8_900_000,
    categories: ["realistic", "performance"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "shader",
    websiteUrl: "https://modrinth.com/shader/complementary-reimagined",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: "bsl",
    provider: "modrinth",
    title: "BSL Shaders",
    slug: "bsl-shaders",
    description: "A classic shader with rich colors, soft shadows and a wide range of customization options.",
    author: "capttatsu",
    downloads: 6_100_000,
    categories: ["realistic"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "shader",
    websiteUrl: "https://modrinth.com/shader/bsl-shaders",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "photon",
    provider: "modrinth",
    title: "Photon Shader",
    slug: "photon",
    description: "A vibrant, stylized shader focused on soft light, strong color and clean silhouettes.",
    author: "SixthSurge",
    downloads: 2_300_000,
    categories: ["fantasy", "performance"],
    loaders: [],
    gameVersions: ["1.21.4", "1.21.1", "1.20.1"],
    type: "shader",
    websiteUrl: "https://modrinth.com/shader/photon",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

function sourceFor(type: ModType): ModSearchResult[] {
  if (type === "plugin") return PLUGINS;
  if (type === "resourcepack") return RESOURCE_PACKS;
  if (type === "shader") return SHADERS;
  return MODS;
}

function allMods(): ModSearchResult[] {
  return [...MODS, ...PLUGINS, ...RESOURCE_PACKS, ...SHADERS];
}

function findProject(id: string): ModSearchResult | undefined {
  return allMods().find((item) => item.id === id);
}

function versionList(project: ModSearchResult | undefined, type: ModType): ModVersionInfo[] {
  const base = project?.title ?? "Project";
  const extension = type === "mod" || type === "plugin" ? "jar" : "zip";
  const versions = [
    { suffix: "1.3.2", channel: "release", offset: 0 },
    { suffix: "1.3.1", channel: "release", offset: 3 },
    { suffix: "1.3.0", channel: "release", offset: 9 },
    { suffix: "1.4.0-beta.2", channel: "beta", offset: 1 },
  ];
  return versions.map((entry, index) => ({
    id: `${project?.id ?? "project"}-${index}`,
    name: `${base} ${entry.suffix}`,
    versionNumber: entry.suffix,
    fileName: `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${entry.suffix}.${extension}`,
    downloadUrl: "https://example.invalid/mock-download",
    gameVersions: project?.gameVersions ?? ["1.21.1", "1.20.1"],
    loaders: project?.loaders ?? [],
    downloads: 240_000 - index * 42_000,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (entry.offset + 2)).toISOString(),
    fileSize: 1_800_000 + index * 640_000,
    channel: entry.channel,
  }));
}

function updateMockInstance(id: string, update: (instance: Instance) => Instance): Instance {
  const index = mockInstances.findIndex((instance) => instance.id === id);
  if (index === -1) throw new Error("Instance not found.");
  mockInstances[index] = update(mockInstances[index]);
  return structuredClone(mockInstances[index]);
}

function emitProgress(instanceId: string, stage: string, percent?: number, indeterminate = false): void {
  const event: GameProgress = { instanceId, stage, percent, indeterminate };
  listeners.gameProgress.forEach((callback) => callback(event));
}

function emitState(instanceId: string, state: LaunchState["state"], message?: string, code?: number): void {
  const event: LaunchState = { instanceId, state, message, code };
  listeners.gameState.forEach((callback) => callback(event));
}

let mockUpdate: UpdateStatus = {
  state: "idle",
};

export const mockApi: CubelightApi = {
  app: {
    info: async () => ({
      version: "1.0.0",
      platform: "win32",
      arch: "x64",
      electron: "web preview",
      isPackaged: false,
      dataDir: "C:\\Users\\you\\AppData\\Roaming\\Cubelight",
    }),
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    quit: async () => {},
    showWindow: async () => {},
    onNavigate: (cb) => subscribe(listeners.navigate, cb),
  },
  settings: {
    get: async () => structuredClone(mockSettings),
    update: async (patch) => {
      mockSettings = deepMerge(mockSettings, patch);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(mockSettings));
      } catch {
        // ignore
      }
      return structuredClone(mockSettings);
    },
    reset: async () => {
      mockSettings = structuredClone(DEFAULT_SETTINGS);
      try {
        localStorage.removeItem(SETTINGS_KEY);
      } catch {
        // ignore
      }
      return structuredClone(mockSettings);
    },
    chooseDirectory: async () => null,
    chooseFile: async () => null,
    openPath: async () => {},
  },
  window: {
    minimize: async () => {},
    toggleMaximize: async () => {
      mockMaximized = !mockMaximized;
      listeners.maximize.forEach((callback) => callback(mockMaximized));
      return mockMaximized;
    },
    close: async () => {},
    isMaximized: async () => mockMaximized,
    setZoom: async () => {},
    onMaximizeChange: (cb) => subscribe(listeners.maximize, cb),
  },
  instances: {
    list: async () => structuredClone(mockInstances),
    create: async (input) => {
      const instance: Instance = {
        id: `demo-${Date.now()}`,
        name: input.name,
        mcVersion: input.mcVersion,
        loader: input.loader,
        kind: input.kind,
        color: input.color,
        memoryMb: input.memoryMb,
        createdAt: Date.now(),
        installed: input.kind === "server",
        installedMods: [],
      };
      mockInstances = [instance, ...mockInstances];
      return structuredClone(instance);
    },
    update: async (id, patch) =>
      updateMockInstance(id, (instance) => ({ ...instance, ...patch } as Instance)),
    remove: async (id) => {
      mockInstances = mockInstances.filter((instance) => instance.id !== id);
    },
    openFolder: async () => {},
  },
  game: {
    versions: async () => ({
      versions: mockVersions,
      latest: { release: "1.21.5", snapshot: "25w14a" },
    }),
    java: async () => mockJava,
    install: async (id) => {
      const instance = mockInstances.find((item) => item.id === id);
      if (!instance) throw new Error("Instance not found.");
      emitState(id, "installing");
      const stages = [
        ["Resolving Minecraft", 6],
        ["Downloading Minecraft", 24],
        ["Downloading assets", 58],
        ["Installing loader", 82],
        ["Finalizing instance", 96],
      ] as const;
      for (const [stage, percent] of stages) {
        emitProgress(id, stage, percent);
        await delay(260);
      }
      emitProgress(id, "Ready to play", 100);
      const next = updateMockInstance(id, (current) => ({
        ...current,
        installed: true,
        versionId: current.loader === "vanilla" ? current.mcVersion : `${current.loader}-${current.mcVersion}`,
      }));
      emitState(id, "stopped");
      return next;
    },
    launch: async (id) => {
      const instance = mockInstances.find((item) => item.id === id);
      if (!instance) throw new Error("Instance not found.");
      emitState(id, "launching", "Starting with Java 21");
      listeners.gameLog.forEach((callback) =>
        callback({ instanceId: id, line: `Launching ${instance.name} with Java 21 · ${instance.memoryMb} MB`, stream: "launcher" }),
      );
      await delay(900);
      emitState(id, "running");
      listeners.gameLog.forEach((callback) =>
        callback({ instanceId: id, line: "[Render thread/INFO]: Backend library: LWJGL 3.3.3", stream: "stdout" }),
      );
    },
    stop: async (id) => {
      emitState(id, "stopped", "Game stopped");
    },
    onProgress: (cb) => subscribe(listeners.gameProgress, cb),
    onState: (cb) => subscribe(listeners.gameState, cb),
    onLog: (cb) => subscribe(listeners.gameLog, cb),
  },
  mods: {
    search: async (query: ModSearchQuery): Promise<ModSearchResponse> => {
      if (query.provider === "curseforge" && !mockSettings.launcher.curseforgeApiKey.trim()) {
        throw new Error("Add a CurseForge API key in Settings → Integrations to browse CurseForge.");
      }
      const limit = Math.min(50, query.limit ?? 20);
      const offset = query.offset ?? 0;
      const needle = query.query.trim().toLowerCase();
      let results = sourceFor(query.type).filter((item) => {
        if (!needle) return true;
        return (
          item.title.toLowerCase().includes(needle) ||
          item.description.toLowerCase().includes(needle) ||
          (item.author ?? "").toLowerCase().includes(needle)
        );
      });
      if (query.sort === "downloads") results = [...results].sort((a, b) => b.downloads - a.downloads);
      if (query.sort === "updated" || query.sort === "newest") {
        results = [...results].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
      }
      const total = results.length;
      const page = results.slice(offset, offset + limit).map((item) => {
        if (query.provider !== "curseforge") return item;
        return {
          ...item,
          provider: "curseforge" as const,
          websiteUrl: item.websiteUrl.replace("modrinth.com", "curseforge.com"),
        };
      });
      return { results: page, total, offset, limit };
    },
    versions: async (query) => versionList(findProject(query.projectId), query.type),
    install: async (input) => {
      const instance = mockInstances.find((item) => item.id === input.instanceId);
      if (!instance) throw new Error("Instance not found.");
      if (input.type === "plugin" && instance.kind !== "server") {
        throw new Error("Plugins install into server instances.");
      }
      if ((input.type === "resourcepack" || input.type === "shader") && instance.kind !== "client") {
        throw new Error("Resource packs and shaders install into client instances.");
      }
      const emit = (stage: string, percent: number) => {
        const event: ModProgress = {
          instanceId: input.instanceId,
          projectId: input.projectId,
          title: input.title,
          stage,
          percent,
          indeterminate: false,
        };
        listeners.modProgress.forEach((callback) => callback(event));
      };
      emit("Preparing download", 5);
      await delay(300);
      emit("Downloading", 48);
      await delay(380);
      emit("Finishing", 92);
      await delay(220);
      emit("Finishing", 100);
      const mod: InstalledMod = {
        key: `${input.provider}:${input.projectId}:${input.version.id}`,
        projectId: input.projectId,
        provider: input.provider,
        title: input.title,
        fileName: input.version.fileName,
        versionName: input.version.name,
        type: input.type,
        iconUrl: input.iconUrl,
        enabled: true,
        installedAt: Date.now(),
        websiteUrl: input.websiteUrl,
      };
      updateMockInstance(input.instanceId, (current) => ({
        ...current,
        installedMods: [
          mod,
          ...current.installedMods.filter(
            (item) => !(item.projectId === mod.projectId && item.provider === mod.provider && item.type === mod.type),
          ),
        ],
      }));
      return mod;
    },
    uninstall: async (instanceId, key) => {
      updateMockInstance(instanceId, (instance) => ({
        ...instance,
        installedMods: instance.installedMods.filter((mod) => mod.key !== key),
      }));
    },
    toggle: async (instanceId, key) => {
      let result: InstalledMod | undefined;
      updateMockInstance(instanceId, (instance) => ({
        ...instance,
        installedMods: instance.installedMods.map((mod) => {
          if (mod.key !== key) return mod;
          result = { ...mod, enabled: !mod.enabled };
          return result;
        }),
      }));
      if (!result) throw new Error("Installed item not found.");
      return result;
    },
    installed: async (instanceId) => {
      const instance = mockInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Instance not found.");
      return structuredClone(instance.installedMods);
    },
    onProgress: (cb) => subscribe(listeners.modProgress, cb),
  },
  auth: {
    get: async () => structuredClone(mockAccount),
    offline: async (name) => {
      const trimmed = name.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
        throw new Error("Offline usernames must be 3-16 characters using letters, numbers or underscores.");
      }
      mockAccount = { mode: "offline", name: trimmed, uuid: "8f4e8f6e-3a7b-3b1a-9c2e-6a0f0b6c1d2e" };
      listeners.account.forEach((callback) => callback(mockAccount));
      return structuredClone(mockAccount);
    },
    microsoftStart: async (clientId) => {
      if (!clientId.trim()) {
        throw new Error("Add your Microsoft Azure client ID in Settings → Integrations first.");
      }
      const info: DeviceCodeInfo = {
        userCode: "CUBE-7X4Q",
        verificationUri: "https://microsoft.com/link",
        expiresIn: 900,
        message: "Enter the code shown in the launcher at microsoft.com/link.",
      };
      listeners.deviceCode.forEach((callback) => callback(info));
      return info;
    },
    logout: async () => {
      mockAccount = { mode: "offline", name: "Player", uuid: "8f4e8f6e-3a7b-3b1a-9c2e-6a0f0b6c1d2e" };
      listeners.account.forEach((callback) => callback(mockAccount));
      return structuredClone(mockAccount);
    },
    onDeviceCode: (cb) => subscribe(listeners.deviceCode, cb),
    onAccount: (cb) => subscribe(listeners.account, cb),
    onError: (cb) => subscribe(listeners.authError, cb),
  },
  updater: {
    status: async () => mockUpdate,
    check: async () => {
      mockUpdate = { state: "checking", message: "Checking for updates…" };
      listeners.updater.forEach((callback) => callback(mockUpdate));
      await delay(700);
      mockUpdate = {
        state: "dev",
        message: "Updates are only available in a packaged build. Push a version tag to publish a release.",
      };
      listeners.updater.forEach((callback) => callback(mockUpdate));
      return mockUpdate;
    },
    download: async () => mockUpdate,
    install: async () => {},
    onStatus: (cb) => subscribe(listeners.updater, cb),
  },
};

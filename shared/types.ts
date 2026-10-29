export type ModProvider = "modrinth" | "curseforge";
export type ModType = "mod" | "plugin" | "resourcepack" | "shader";
export type LoaderType = "vanilla" | "fabric" | "forge" | "neoforge";
export type InstanceKind = "client" | "server";
export type UpdateChannel = "stable" | "beta";
export type Density = "comfortable" | "compact";
export type BackgroundPattern = "grid" | "none";

export interface AppearanceSettings {
  preset: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  fontFamily: string;
  displayFont: string;
  monoFont: string;
  fontSize: number;
  uiScale: number;
  radius: number;
  density: Density;
  reduceMotion: boolean;
  backgroundPattern: BackgroundPattern;
  sidebarCollapsed: boolean;
}

export interface LauncherSettings {
  closeToTray: boolean;
  minimizeToTray: boolean;
  launchAtLogin: boolean;
  startMinimized: boolean;
  minimizeOnLaunch: boolean;
  showSnapshots: boolean;
  defaultMemoryMb: number;
  javaPath: string;
  gameWindowWidth: number;
  gameWindowHeight: number;
  fullscreen: boolean;
  autoCheckUpdates: boolean;
  autoDownloadUpdates: boolean;
  updateChannel: UpdateChannel;
  updateFeedUrl: string;
  curseforgeApiKey: string;
  msClientId: string;
  modrinthUserAgent: string;
  maxConcurrentDownloads: number;
  confirmBeforeDelete: boolean;
}

export interface Settings {
  appearance: AppearanceSettings;
  launcher: LauncherSettings;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface InstalledMod {
  key: string;
  projectId: string;
  provider: ModProvider;
  title: string;
  fileName: string;
  versionName: string;
  type: ModType;
  iconUrl?: string;
  enabled: boolean;
  installedAt: number;
  websiteUrl?: string;
}

export interface Instance {
  id: string;
  name: string;
  mcVersion: string;
  loader: LoaderType;
  loaderVersion?: string;
  versionId?: string;
  kind: InstanceKind;
  color: string;
  memoryMb: number;
  javaPath?: string;
  createdAt: number;
  lastPlayed?: number;
  installed: boolean;
  installedMods: InstalledMod[];
  notes?: string;
}

export interface CreateInstanceInput {
  name: string;
  mcVersion: string;
  loader: LoaderType;
  kind: InstanceKind;
  memoryMb: number;
  color: string;
}

export interface GameVersion {
  id: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha" | string;
  releaseTime: string;
}

export interface JavaInfo {
  path: string;
  version: string;
  majorVersion: number;
  source?: string;
}

export interface ModSearchResult {
  id: string;
  provider: ModProvider;
  title: string;
  slug: string;
  description: string;
  iconUrl?: string;
  author?: string;
  downloads: number;
  followers?: number;
  categories: string[];
  loaders: string[];
  gameVersions: string[];
  type: ModType;
  websiteUrl: string;
  updatedAt?: string;
}

export interface ModSearchQuery {
  provider: ModProvider;
  query: string;
  type: ModType;
  gameVersion?: string;
  loader?: string;
  sort?: "relevance" | "downloads" | "updated" | "newest";
  offset?: number;
  limit?: number;
}

export interface ModSearchResponse {
  results: ModSearchResult[];
  total: number;
  offset: number;
  limit: number;
}

export interface ModVersionInfo {
  id: string;
  name: string;
  versionNumber: string;
  fileName: string;
  downloadUrl?: string;
  gameVersions: string[];
  loaders: string[];
  downloads: number;
  publishedAt?: string;
  fileSize?: number;
  channel?: string;
}

export interface ModVersionQuery {
  provider: ModProvider;
  projectId: string;
  type: ModType;
  gameVersion?: string;
  loader?: string;
}

export interface InstallModInput {
  instanceId: string;
  provider: ModProvider;
  projectId: string;
  title: string;
  type: ModType;
  version: ModVersionInfo;
  iconUrl?: string;
  websiteUrl?: string;
}

export interface PublicAccount {
  mode: "offline" | "microsoft";
  name: string;
  uuid: string;
  expiresAt?: number;
  avatarUrl?: string;
}

export interface DeviceCodeInfo {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  message?: string;
}

export interface AppInfo {
  version: string;
  platform: string;
  arch: string;
  electron: string;
  isPackaged: boolean;
  dataDir: string;
}

export type UpdateState =
  | "idle"
  | "dev"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  state: UpdateState;
  version?: string;
  percent?: number;
  message?: string;
  releaseNotes?: string;
  checkedAt?: number;
}

export interface GameProgress {
  instanceId: string;
  stage: string;
  detail?: string;
  percent?: number;
  indeterminate?: boolean;
}

export type LaunchStateName = "installing" | "launching" | "running" | "stopped" | "crashed";

export interface LaunchState {
  instanceId: string;
  state: LaunchStateName;
  message?: string;
  code?: number;
}

export interface GameLogEvent {
  instanceId: string;
  line: string;
  stream: "stdout" | "stderr" | "launcher";
}

export interface ModProgress {
  instanceId: string;
  projectId: string;
  title: string;
  stage: string;
  percent?: number;
  indeterminate?: boolean;
}

export interface DialogFilter {
  name: string;
  extensions: string[];
}

export type AppPage = "home" | "instances" | "mods" | "settings";

export interface CubelightApi {
  app: {
    info: () => Promise<AppInfo>;
    openExternal: (url: string) => Promise<void>;
    quit: () => Promise<void>;
    showWindow: () => Promise<void>;
    onNavigate: (cb: (page: AppPage) => void) => () => void;
  };
  settings: {
    get: () => Promise<Settings>;
    update: (patch: DeepPartial<Settings>) => Promise<Settings>;
    reset: () => Promise<Settings>;
    chooseDirectory: (title?: string) => Promise<string | null>;
    chooseFile: (title?: string, filters?: DialogFilter[]) => Promise<string | null>;
    openPath: (target: string) => Promise<void>;
  };
  window: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    setZoom: (factor: number) => Promise<void>;
    onMaximizeChange: (cb: (maximized: boolean) => void) => () => void;
  };
  instances: {
    list: () => Promise<Instance[]>;
    create: (input: CreateInstanceInput) => Promise<Instance>;
    update: (id: string, patch: DeepPartial<Instance>) => Promise<Instance>;
    remove: (id: string) => Promise<void>;
    openFolder: (id: string) => Promise<void>;
  };
  game: {
    versions: (includeSnapshots: boolean) => Promise<{ versions: GameVersion[]; latest: { release: string; snapshot: string } }>;
    java: () => Promise<JavaInfo[]>;
    install: (id: string) => Promise<Instance>;
    launch: (id: string) => Promise<void>;
    stop: (id: string) => Promise<void>;
    onProgress: (cb: (event: GameProgress) => void) => () => void;
    onState: (cb: (event: LaunchState) => void) => () => void;
    onLog: (cb: (event: GameLogEvent) => void) => () => void;
  };
  mods: {
    search: (query: ModSearchQuery) => Promise<ModSearchResponse>;
    versions: (query: ModVersionQuery) => Promise<ModVersionInfo[]>;
    install: (input: InstallModInput) => Promise<InstalledMod>;
    uninstall: (instanceId: string, key: string) => Promise<void>;
    toggle: (instanceId: string, key: string) => Promise<InstalledMod>;
    installed: (instanceId: string) => Promise<InstalledMod[]>;
    onProgress: (cb: (event: ModProgress) => void) => () => void;
  };
  auth: {
    get: () => Promise<PublicAccount | null>;
    offline: (name: string) => Promise<PublicAccount>;
    microsoftStart: (clientId: string) => Promise<DeviceCodeInfo>;
    logout: () => Promise<PublicAccount>;
    onDeviceCode: (cb: (info: DeviceCodeInfo) => void) => () => void;
    onAccount: (cb: (account: PublicAccount | null) => void) => () => void;
    onError: (cb: (message: string) => void) => () => void;
  };
  updater: {
    status: () => Promise<UpdateStatus>;
    check: () => Promise<UpdateStatus>;
    download: () => Promise<UpdateStatus>;
    install: () => Promise<void>;
    onStatus: (cb: (status: UpdateStatus) => void) => () => void;
  };
}

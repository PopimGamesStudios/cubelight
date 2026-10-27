import { fetchJson } from "./download";
import { getSettings } from "./settings";
import type {
  LoaderType,
  ModSearchQuery,
  ModSearchResponse,
  ModSearchResult,
  ModType,
  ModVersionInfo,
  ModVersionQuery,
} from "../../shared/types";

const BASE = "https://api.curseforge.com/v1";
const GAME_ID = 432;

const CLASS_IDS: Record<ModType, number> = {
  mod: 6,
  plugin: 5,
  resourcepack: 12,
  shader: 6552,
};

const LOADER_IDS: Record<Exclude<LoaderType, "vanilla">, number> = {
  forge: 1,
  fabric: 4,
  neoforge: 6,
};

const LOADER_NAMES: Record<number, string> = {
  1: "forge",
  2: "cauldron",
  3: "liteloader",
  4: "fabric",
  5: "quilt",
  6: "neoforge",
};

const WEBSITE_PATH: Record<ModType, string> = {
  mod: "mc-mods",
  plugin: "bukkit-plugins",
  resourcepack: "texture-packs",
  shader: "shaders",
};

export function hasCurseForgeKey(): boolean {
  return Boolean(getSettings().launcher.curseforgeApiKey.trim());
}

function apiKey(): string {
  const key = getSettings().launcher.curseforgeApiKey.trim();
  if (!key) {
    throw new Error("Add a CurseForge API key in Settings → Integrations to browse CurseForge.");
  }
  return key;
}

function headers(): Record<string, string> {
  return {
    "x-api-key": apiKey(),
    Accept: "application/json",
  };
}

function loaderType(loader?: string): number | undefined {
  if (!loader || loader === "vanilla") return undefined;
  return LOADER_IDS[loader as Exclude<LoaderType, "vanilla">];
}

function sortField(sort: ModSearchQuery["sort"]): number {
  switch (sort) {
    case "downloads":
      return 6;
    case "updated":
      return 3;
    case "newest":
      return 11;
    default:
      return 2;
  }
}

function friendlyError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("(403)")) {
    throw new Error("CurseForge rejected the API key. Check it in Settings → Integrations.");
  }
  if (message.includes("(401)")) {
    throw new Error("CurseForge API key is not authorized. Check it in Settings → Integrations.");
  }
  throw error instanceof Error ? error : new Error(message);
}

interface CurseForgeMod {
  id: number;
  name: string;
  slug: string;
  summary: string;
  downloadCount: number;
  dateModified?: string;
  logo?: { thumbnailUrl?: string; url?: string };
  links?: { websiteUrl?: string };
  authors?: Array<{ name: string }>;
  categories?: Array<{ name: string }>;
  latestFilesIndexes?: Array<{ gameVersion: string; modLoader?: number; filename?: string }>;
}

interface CurseForgeSearchResponse {
  data: CurseForgeMod[];
  pagination: { index: number; pageSize: number; resultCount: number; totalCount: number };
}

function websiteFor(mod: CurseForgeMod, type: ModType): string {
  if (mod.links?.websiteUrl) return mod.links.websiteUrl;
  return `https://www.curseforge.com/minecraft/${WEBSITE_PATH[type]}/${mod.slug}`;
}

function mapMod(mod: CurseForgeMod, type: ModType): ModSearchResult {
  const loaders = new Set<string>();
  const gameVersions = new Set<string>();
  for (const index of mod.latestFilesIndexes ?? []) {
    if (index.gameVersion) gameVersions.add(index.gameVersion);
    if (index.modLoader && LOADER_NAMES[index.modLoader]) loaders.add(LOADER_NAMES[index.modLoader]);
  }
  return {
    id: String(mod.id),
    provider: "curseforge",
    title: mod.name,
    slug: mod.slug,
    description: mod.summary,
    iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url,
    author: mod.authors?.[0]?.name,
    downloads: mod.downloadCount ?? 0,
    categories: (mod.categories ?? []).map((category) => category.name),
    loaders: [...loaders],
    gameVersions: [...gameVersions],
    type,
    websiteUrl: websiteFor(mod, type),
    updatedAt: mod.dateModified,
  };
}

export async function searchCurseForge(query: ModSearchQuery): Promise<ModSearchResponse> {
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const offset = Math.max(0, query.offset ?? 0);
  const params = new URLSearchParams({
    gameId: String(GAME_ID),
    classId: String(CLASS_IDS[query.type]),
    sortField: String(sortField(query.sort)),
    sortOrder: "desc",
    pageSize: String(limit),
    index: String(offset),
  });
  if (query.query.trim()) params.set("searchFilter", query.query.trim());
  if (query.gameVersion) params.set("gameVersion", query.gameVersion);
  if (query.type === "mod") {
    const loader = loaderType(query.loader);
    if (loader) params.set("modLoaderType", String(loader));
  }

  try {
    const data = await fetchJson<CurseForgeSearchResponse>(`${BASE}/mods/search?${params.toString()}`, {
      headers: headers(),
    });
    return {
      results: data.data.map((mod) => mapMod(mod, query.type)),
      total: data.pagination.totalCount,
      offset: data.pagination.index,
      limit: data.pagination.pageSize,
    };
  } catch (error) {
    return friendlyError(error);
  }
}

interface CurseForgeFile {
  id: number;
  displayName: string;
  fileName: string;
  fileDate?: string;
  fileLength?: number;
  releaseType?: number;
  downloadUrl?: string | null;
  gameVersions?: string[];
}

interface CurseForgeFilesResponse {
  data: CurseForgeFile[];
}

function releaseChannel(type?: number): string {
  if (type === 1) return "release";
  if (type === 2) return "beta";
  if (type === 3) return "alpha";
  return "release";
}

export async function getCurseForgeVersions(query: ModVersionQuery): Promise<ModVersionInfo[]> {
  const params = new URLSearchParams({
    pageSize: "50",
    index: "0",
  });
  if (query.gameVersion) params.set("gameVersion", query.gameVersion);
  if (query.type === "mod") {
    const loader = loaderType(query.loader);
    if (loader) params.set("modLoaderType", String(loader));
  }

  try {
    const data = await fetchJson<CurseForgeFilesResponse>(
      `${BASE}/mods/${encodeURIComponent(query.projectId)}/files?${params.toString()}`,
      { headers: headers() },
    );
    return data.data.map((file) => ({
      id: String(file.id),
      name: file.displayName || file.fileName,
      versionNumber: file.displayName || file.fileName,
      fileName: file.fileName,
      downloadUrl: file.downloadUrl ?? undefined,
      gameVersions: file.gameVersions ?? [],
      loaders: [],
      downloads: 0,
      publishedAt: file.fileDate,
      fileSize: file.fileLength,
      channel: releaseChannel(file.releaseType),
    }));
  } catch (error) {
    return friendlyError(error);
  }
}

interface CurseForgeDownloadResponse {
  data: string | null;
}

export async function getCurseForgeDownloadUrl(projectId: string, fileId: string): Promise<string> {
  try {
    const data = await fetchJson<CurseForgeDownloadResponse>(
      `${BASE}/mods/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/download-url`,
      { headers: headers() },
    );
    if (!data.data) {
      throw new Error("The author has disabled third-party downloads for this file. Open it on CurseForge instead.");
    }
    return data.data;
  } catch (error) {
    return friendlyError(error);
  }
}

import { fetchJson } from "./download";
import { getSettings } from "./settings";
import type {
  ModSearchQuery,
  ModSearchResponse,
  ModSearchResult,
  ModType,
  ModVersionInfo,
  ModVersionQuery,
} from "../../shared/types";

const BASE = "https://api.modrinth.com/v2";

function userAgent(): string {
  const configured = getSettings().launcher.modrinthUserAgent?.trim();
  return configured || "Cubelight/1.0.2 (open-source Minecraft launcher)";
}

function projectType(type: ModType): string {
  return type;
}

function indexFor(sort: ModSearchQuery["sort"]): string {
  switch (sort) {
    case "downloads":
      return "downloads";
    case "updated":
      return "updated";
    case "newest":
      return "newest";
    default:
      return "relevance";
  }
}

function websiteFor(slug: string, type: ModType): string {
  return `https://modrinth.com/${projectType(type)}/${slug}`;
}

interface ModrinthHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url?: string | null;
  author?: string;
  downloads: number;
  follows?: number;
  categories?: string[];
  versions?: string[];
  loaders?: string[];
  project_type?: string;
  date_modified?: string;
}

interface ModrinthSearchResponse {
  hits: ModrinthHit[];
  offset: number;
  limit: number;
  total_hits: number;
}

export async function searchModrinth(query: ModSearchQuery): Promise<ModSearchResponse> {
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const offset = Math.max(0, query.offset ?? 0);
  const facets: string[][] = [[`project_type:${projectType(query.type)}`]];
  if (query.gameVersion) facets.push([`versions:${query.gameVersion}`]);
  if (query.type === "mod" && query.loader && query.loader !== "vanilla") {
    facets.push([`categories:${query.loader}`]);
  }

  const params = new URLSearchParams({
    query: query.query ?? "",
    limit: String(limit),
    offset: String(offset),
    index: indexFor(query.sort),
  });
  params.set("facets", JSON.stringify(facets));

  const data = await fetchJson<ModrinthSearchResponse>(`${BASE}/search?${params.toString()}`, {}, { userAgent: userAgent() });
  const results: ModSearchResult[] = data.hits.map((hit) => ({
    id: hit.project_id,
    provider: "modrinth",
    title: hit.title,
    slug: hit.slug,
    description: hit.description,
    iconUrl: hit.icon_url ?? undefined,
    author: hit.author,
    downloads: hit.downloads,
    followers: hit.follows,
    categories: hit.categories ?? [],
    loaders: hit.loaders ?? [],
    gameVersions: hit.versions ?? [],
    type: query.type,
    websiteUrl: websiteFor(hit.slug, query.type),
    updatedAt: hit.date_modified,
  }));

  return {
    results,
    total: data.total_hits,
    offset: data.offset,
    limit: data.limit,
  };
}

interface ModrinthFile {
  url: string;
  filename: string;
  primary?: boolean;
  size?: number;
}

interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  version_type?: string;
  downloads: number;
  game_versions: string[];
  loaders: string[];
  date_published?: string;
  files: ModrinthFile[];
}

export async function getModrinthVersions(query: ModVersionQuery): Promise<ModVersionInfo[]> {
  const params = new URLSearchParams();
  if (query.gameVersion) params.set("game_versions", JSON.stringify([query.gameVersion]));
  if (query.type === "mod" && query.loader && query.loader !== "vanilla") {
    params.set("loaders", JSON.stringify([query.loader]));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const versions = await fetchJson<ModrinthVersion[]>(
    `${BASE}/project/${encodeURIComponent(query.projectId)}/version${suffix}`,
    {},
    { userAgent: userAgent() },
  );

  return versions
    .map((version): ModVersionInfo | null => {
      const file = version.files.find((item) => item.primary) ?? version.files[0];
      if (!file) return null;
      return {
        id: version.id,
        name: version.name || version.version_number,
        versionNumber: version.version_number,
        fileName: file.filename,
        downloadUrl: file.url,
        gameVersions: version.game_versions ?? [],
        loaders: version.loaders ?? [],
        downloads: version.downloads ?? 0,
        publishedAt: version.date_published,
        fileSize: file.size,
        channel: version.version_type,
      };
    })
    .filter((version): version is ModVersionInfo => version !== null);
}

export function modrinthProjectUrl(slug: string, type: ModType): string {
  return websiteFor(slug, type);
}

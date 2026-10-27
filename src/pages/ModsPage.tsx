import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Blocks,
  Check,
  Download,
  FolderOpen,
  Image,
  KeyRound,
  Package,
  Puzzle,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { InstalledMod, ModProvider, ModSearchResult, ModType, ModVersionInfo } from "@shared/types";
import { api, errorMessage } from "@/lib/api";
import {
  classNames,
  formatNumber,
  loaderLabel,
  modTypeLabel,
  providerLabel,
  timeAgo,
} from "@/lib/format";
import { useApp } from "@/store/app";
import { ModDrawer } from "@/components/ModDrawer";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Panel,
  Segmented,
  Select,
  Spinner,
  Toggle,
} from "@/components/ui";

type Sort = "relevance" | "downloads" | "updated" | "newest";

const TYPE_OPTIONS: Array<{ value: ModType; label: string; icon: ReactNode }> = [
  { value: "mod", label: "Mods", icon: <Puzzle size={14} /> },
  { value: "plugin", label: "Plugins", icon: <Server size={14} /> },
  { value: "resourcepack", label: "Resource packs", icon: <Image size={14} /> },
  { value: "shader", label: "Shaders", icon: <Sparkles size={14} /> },
];

export function ModsPage() {
  const instances = useApp((state) => state.instances);
  const modTargetId = useApp((state) => state.modTargetId);
  const setModTarget = useApp((state) => state.setModTarget);
  const openMod = useApp((state) => state.openMod);
  const setOpenMod = useApp((state) => state.setOpenMod);
  const installMod = useApp((state) => state.installMod);
  const uninstallMod = useApp((state) => state.uninstallMod);
  const toggleMod = useApp((state) => state.toggleMod);
  const toast = useApp((state) => state.toast);
  const navigate = useApp((state) => state.navigate);
  const curseforgeKey = useApp((state) => state.settings.launcher.curseforgeApiKey);
  const confirmBeforeDelete = useApp((state) => state.settings.launcher.confirmBeforeDelete);

  const [provider, setProvider] = useState<ModProvider>("modrinth");
  const [type, setType] = useState<ModType>("mod");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<Sort>("relevance");
  const [results, setResults] = useState<ModSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingRemove, setPendingRemove] = useState<InstalledMod | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const compatible = useMemo(
    () =>
      instances.filter((instance) => (type === "plugin" ? instance.kind === "server" : instance.kind === "client")),
    [instances, type],
  );
  const target = compatible.find((instance) => instance.id === modTargetId) ?? compatible[0] ?? null;
  const keyMissing = provider === "curseforge" && !curseforgeKey.trim();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 320);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let alive = true;
    if (keyMissing) {
      setResults([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    setError(null);
    api.mods
      .search({
        provider,
        query: debounced,
        type,
        gameVersion: target?.mcVersion,
        loader: type === "mod" && target && target.loader !== "vanilla" ? target.loader : undefined,
        sort,
        offset: 0,
        limit: 24,
      })
      .then((response) => {
        if (!alive) return;
        setResults(response.results);
        setTotal(response.total);
      })
      .catch((issue) => {
        if (!alive) return;
        setResults([]);
        setTotal(0);
        setError(errorMessage(issue));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [provider, type, debounced, sort, target?.mcVersion, target?.loader, refreshKey, keyMissing]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await api.mods.search({
        provider,
        query: debounced,
        type,
        gameVersion: target?.mcVersion,
        loader: type === "mod" && target && target.loader !== "vanilla" ? target.loader : undefined,
        sort,
        offset: results.length,
        limit: 24,
      });
      setResults((current) => [...current, ...response.results]);
      setTotal(response.total);
    } catch (issue) {
      toast({ title: "Could not load more", message: errorMessage(issue), tone: "error" });
    } finally {
      setLoadingMore(false);
    }
  };

  const installProject = async (project: ModSearchResult) => {
    if (!target) {
      toast({
        title: `No ${type === "plugin" ? "server" : "client"} instance`,
        message: "Create or select an instance first.",
        tone: "info",
      });
      return;
    }
    setInstallingId(project.id);
    try {
      const versions: ModVersionInfo[] = await api.mods.versions({
        provider: project.provider,
        projectId: project.id,
        type: project.type,
        gameVersion: target.mcVersion,
        loader: project.type === "mod" && target.loader !== "vanilla" ? target.loader : undefined,
      });
      const version = versions[0];
      if (!version) {
        throw new Error(`No compatible version for ${target.mcVersion}.`);
      }
      await installMod({
        instanceId: target.id,
        provider: project.provider,
        projectId: project.id,
        title: project.title,
        type: project.type,
        version,
        iconUrl: project.iconUrl,
        websiteUrl: project.websiteUrl,
      });
    } catch (issue) {
      toast({ title: "Install failed", message: errorMessage(issue), tone: "error" });
    } finally {
      setInstallingId(null);
    }
  };

  const isInstalled = (project: ModSearchResult) =>
    Boolean(
      target?.installedMods.some(
        (item) => item.projectId === project.id && item.provider === project.provider && item.type === project.type,
      ),
    );

  const targetInstalled = target?.installedMods ?? [];
  const enabledCount = targetInstalled.filter((item) => item.enabled).length;

  const requestRemove = (mod: InstalledMod) => {
    if (confirmBeforeDelete) setPendingRemove(mod);
    else if (target) void uninstallMod(target.id, mod.key);
  };

  const confirmRemove = async () => {
    if (!target || !pendingRemove) return;
    setRemoveBusy(true);
    try {
      await uninstallMod(target.id, pendingRemove.key);
      setPendingRemove(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div className="page page--mods">
      <header className="page-head">
        <div>
          <span className="eyebrow">Content</span>
          <h1 className="page-title">Mods & plugins</h1>
          <p className="page-sub">
            Search Modrinth and CurseForge, then drop files directly into the selected instance.
          </p>
        </div>
        <div className="page-head-actions">
          <div className="provider-tabs">
            {(["modrinth", "curseforge"] as ModProvider[]).map((value) => (
              <button
                key={value}
                type="button"
                className={classNames("provider-tab", provider === value && "is-active")}
                onClick={() => setProvider(value)}
              >
                {providerLabel(value)}
                {value === "curseforge" && !curseforgeKey.trim() ? <KeyRound size={11} /> : null}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Refresh
          </Button>
        </div>
      </header>

      <div className="mods-toolbar">
        <Segmented value={type} onChange={setType} ariaLabel="Content type" options={TYPE_OPTIONS} />

        <div className="search-box search-box--wide">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${modTypeLabel(type).toLowerCase()}s on ${providerLabel(provider)}…`}
            aria-label="Search projects"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={13} />
            </button>
          ) : null}
        </div>

        <div className="toolbar-spacer" />

        <div className="target-select">
          <span className="target-select-label">Install to</span>
          <Select
            value={target?.id ?? ""}
            onChange={(value) => setModTarget(value)}
            ariaLabel="Target instance"
            options={
              compatible.length
                ? compatible.map((instance) => ({
                    value: instance.id,
                    label: `${instance.name} · ${instance.mcVersion}`,
                  }))
                : [{ value: "", label: `No ${type === "plugin" ? "server" : "client"} instance` }]
            }
            disabled={!compatible.length}
          />
        </div>

        <Select
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          ariaLabel="Sort projects"
          options={[
            { value: "relevance", label: "Relevance" },
            { value: "downloads", label: "Most downloads" },
            { value: "updated", label: "Recently updated" },
            { value: "newest", label: "Newest" },
          ]}
        />
      </div>

      {keyMissing ? (
        <div className="callout callout--warn">
          <div className="callout-head">
            <KeyRound size={14} />
            <strong>CurseForge needs an API key</strong>
          </div>
          <p>
            CurseForge does not allow anonymous API access. Add a free key from the CurseForge developer console in
            Settings → Integrations.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("settings")}>
            Open integrations
          </Button>
        </div>
      ) : null}

      <div className="mods-layout">
        <section className="panel mods-results">
          <header className="panel-head">
            <div className="panel-heading">
              <span className="panel-eyebrow">{providerLabel(provider)}</span>
              <h2 className="panel-title">
                {type === "mod" ? "Mods" : type === "plugin" ? "Plugins" : type === "resourcepack" ? "Resource packs" : "Shaders"}
              </h2>
            </div>
            <div className="panel-actions">
              <Chip>{loading ? "Searching…" : `${formatNumber(total)} results`}</Chip>
              {target ? <Chip tone="accent">{target.mcVersion}</Chip> : null}
            </div>
          </header>

          {loading ? (
            <div className="results-loading">
              <Spinner size={18} />
              <span>Querying {providerLabel(provider)}…</span>
            </div>
          ) : error ? (
            <div className="results-error">
              <EmptyState
                icon={<Blocks size={22} />}
                title="Search failed"
                description={error}
                action={
                  <Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>
                    Try again
                  </Button>
                }
              />
            </div>
          ) : results.length === 0 ? (
            <div className="results-error">
              <EmptyState
                icon={<Package size={22} />}
                title="Nothing found"
                description={`No ${modTypeLabel(type).toLowerCase()} projects matched this search. Try a broader query or another version.`}
              />
            </div>
          ) : (
            <div className="mod-list">
              {results.map((project) => {
                const installed = isInstalled(project);
                return (
                  <article
                    key={`${project.provider}:${project.id}`}
                    className="mod-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenMod(project)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpenMod(project);
                      }
                    }}
                  >
                    <span className="mod-icon">
                      {project.iconUrl ? (
                        <img src={project.iconUrl} alt="" loading="lazy" />
                      ) : (
                        <span>{project.title.slice(0, 1)}</span>
                      )}
                    </span>

                    <div className="mod-copy">
                      <div className="mod-title-line">
                        <strong>{project.title}</strong>
                        <Chip>{providerLabel(project.provider)}</Chip>
                        {installed ? (
                          <Chip tone="success">
                            <Check size={11} /> Installed
                          </Chip>
                        ) : null}
                      </div>
                      <span className="mod-author">by {project.author ?? "Unknown"}</span>
                      <p className="mod-description">{project.description}</p>
                      <div className="mod-tags">
                        {project.categories.slice(0, 3).map((category) => (
                          <span key={category}>{category}</span>
                        ))}
                        {project.loaders.slice(0, 3).map((loader) => (
                          <span key={loader}>{loader}</span>
                        ))}
                        {project.gameVersions.slice(0, 2).map((version) => (
                          <span key={version}>{version}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mod-side">
                      <div className="mod-stats">
                        <span>
                          <Download size={12} /> {formatNumber(project.downloads)}
                        </span>
                        <span>{timeAgo(project.updatedAt ? new Date(project.updatedAt).getTime() : undefined)}</span>
                      </div>
                      <Button
                        variant={installed ? "outline" : "primary"}
                        size="sm"
                        icon={installed ? <Check size={13} /> : <Download size={13} />}
                        loading={installingId === project.id}
                        disabled={!target || Boolean(installingId)}
                        onClick={(event) => {
                          event.stopPropagation();
                          void installProject(project);
                        }}
                      >
                        {installed ? "Reinstall" : "Install"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && !error && results.length > 0 && results.length < total ? (
            <div className="load-more">
              <Button variant="outline" onClick={() => void loadMore()} loading={loadingMore}>
                Load more
              </Button>
              <span>
                {results.length} of {formatNumber(total)}
              </span>
            </div>
          ) : null}
        </section>

        <aside className="mods-rail">
          <Panel
            eyebrow="Selected instance"
            title={target ? target.name : "No instance"}
            actions={
              target ? (
                <IconButton
                  label="Open instance folder"
                  size="sm"
                  onClick={() => void api.instances.openFolder(target.id)}
                >
                  <FolderOpen size={14} />
                </IconButton>
              ) : null
            }
          >
            {target ? (
              <>
                <div className="target-summary">
                  <span className="target-icon" style={{ background: target.color }}>
                    {target.icon}
                  </span>
                  <div className="target-copy">
                    <strong>
                      {target.mcVersion} · {target.kind === "server" ? "Server" : loaderLabel(target.loader)}
                    </strong>
                    <span>
                      {target.installedMods.length} files · {enabledCount} enabled
                    </span>
                  </div>
                </div>

                <div className="installed-head">
                  <span>Installed files</span>
                  <Chip>{target.installedMods.length}</Chip>
                </div>

                {targetInstalled.length ? (
                  <div className="installed-list">
                    {[...targetInstalled]
                      .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.title.localeCompare(b.title))
                      .map((mod) => (
                        <div className={classNames("installed-row", !mod.enabled && "is-disabled")} key={mod.key}>
                          <span className="installed-icon">
                            {mod.iconUrl ? <img src={mod.iconUrl} alt="" loading="lazy" /> : <span>{mod.title.slice(0, 1)}</span>}
                          </span>
                          <div className="installed-copy">
                            <strong>{mod.title}</strong>
                            <span>
                              {modTypeLabel(mod.type)} · {mod.versionName}
                            </span>
                          </div>
                          <Toggle
                            checked={mod.enabled}
                            onChange={() => void toggleMod(target.id, mod.key)}
                            label={`Toggle ${mod.title}`}
                          />
                          <IconButton
                            label={`Remove ${mod.title}`}
                            size="sm"
                            tone="danger"
                            onClick={() => requestRemove(mod)}
                          >
                            <Trash2 size={13} />
                          </IconButton>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="installed-empty">
                    <Package size={18} />
                    <span>No {type === "plugin" ? "plugins" : "content"} installed yet.</span>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Server size={20} />}
                title={`No ${type === "plugin" ? "server" : "client"} instance`}
                description={`Create a ${type === "plugin" ? "server" : "client"} instance to install content.`}
                action={
                  <Button variant="outline" size="sm" onClick={() => navigate("instances")}>
                    Create instance
                  </Button>
                }
              />
            )}
          </Panel>

          <div className="rail-tip">
            <Sparkles size={14} />
            <p>
              {type === "plugin"
                ? "Plugins install into the instance's plugins/ folder and load on your server."
                : type === "resourcepack"
                  ? "Resource packs install into resourcepacks/ and appear in Minecraft's pack menu."
                  : type === "shader"
                    ? "Shaders install into shaderpacks/ and need Iris or OptiFine to load."
                    : "Mods install into mods/ and are enabled by default. Toggle them off without deleting files."}
            </p>
          </div>
        </aside>
      </div>

      <ModDrawer mod={openMod} onClose={() => setOpenMod(null)} />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title={`Remove ${pendingRemove?.title ?? "file"}?`}
        message="The file is deleted from the instance folder. You can reinstall it at any time."
        confirmLabel="Remove file"
        danger
        busy={removeBusy}
        onConfirm={() => void confirmRemove()}
        onClose={() => setPendingRemove(null)}
      />
    </div>
  );
}

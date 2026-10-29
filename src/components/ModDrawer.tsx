import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  HardDriveDownload,
  Server,
  X,
} from "lucide-react";
import type { ModSearchResult, ModVersionInfo } from "@shared/types";
import { api, errorMessage } from "@/lib/api";
import {
  contrastInk,
  formatBytes,
  formatDate,
  formatNumber,
  loaderLabel,
  modTypeLabel,
  initials,
  providerLabel,
  timeAgo,
} from "@/lib/format";
import { useApp } from "@/store/app";
import { Button, Chip, ProgressBar, Select, Spinner } from "./ui";

interface ModDrawerProps {
  mod: ModSearchResult | null;
  onClose: () => void;
}

export function ModDrawer({ mod, onClose }: ModDrawerProps) {
  const instances = useApp((state) => state.instances);
  const modTargetId = useApp((state) => state.modTargetId);
  const setModTarget = useApp((state) => state.setModTarget);
  const installMod = useApp((state) => state.installMod);
  const navigate = useApp((state) => state.navigate);
  const modProgress = useApp((state) => state.modProgress);
  const [versions, setVersions] = useState<ModVersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const compatible = mod
    ? instances.filter((instance) => (mod.type === "plugin" ? instance.kind === "server" : instance.kind === "client"))
    : [];
  const target = compatible.find((instance) => instance.id === modTargetId) ?? compatible[0] ?? null;
  const installed = mod
    ? target?.installedMods.find(
        (item) => item.projectId === mod.id && item.provider === mod.provider && item.type === mod.type,
      )
    : undefined;

  useEffect(() => {
    if (!mod) return;
    let alive = true;
    setVersions([]);
    setError(null);
    setLoading(true);
    api.mods
      .versions({
        provider: mod.provider,
        projectId: mod.id,
        type: mod.type,
        gameVersion: target?.mcVersion,
        loader: target && target.loader !== "vanilla" ? target.loader : undefined,
      })
      .then((result) => {
        if (alive) setVersions(result);
      })
      .catch((issue) => {
        if (alive) setError(errorMessage(issue));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mod, target?.id, target?.mcVersion, target?.loader]);

  useEffect(() => {
    if (!mod) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mod, onClose]);

  if (!mod) return null;

  const progress = modProgress.find(
    (item) => item.projectId === mod.id && target && item.instanceId === target.id,
  );

  const install = async (version: ModVersionInfo) => {
    if (!target) return;
    setInstallingId(version.id);
    try {
      await installMod({
        instanceId: target.id,
        provider: mod.provider,
        projectId: mod.id,
        title: mod.title,
        type: mod.type,
        version,
        iconUrl: mod.iconUrl,
        websiteUrl: mod.websiteUrl,
      });
    } catch {
      // handled by the store toast
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${mod.title} details`}>
        <header className="drawer-head">
          <span className="panel-eyebrow">Project details</span>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close details">
            <X size={17} />
          </button>
        </header>

        <div className="drawer-body">
          <div className="project-head">
            <div className="project-icon">
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" />
              ) : (
                <span>{mod.title.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="project-heading">
              <h2>{mod.title}</h2>
              <p>
                by <strong>{mod.author ?? "Unknown"}</strong>
              </p>
              <div className="project-chips">
                <Chip tone="accent">{modTypeLabel(mod.type)}</Chip>
                <Chip>{providerLabel(mod.provider)}</Chip>
                {installed ? (
                  <Chip tone="success">
                    <Check size={11} /> Installed
                  </Chip>
                ) : null}
              </div>
            </div>
          </div>

          <p className="project-description">{mod.description}</p>

          <div className="project-stats">
            <div>
              <span>Downloads</span>
              <strong>{formatNumber(mod.downloads)}</strong>
            </div>
            <div>
              <span>Followers</span>
              <strong>{mod.followers ? formatNumber(mod.followers) : "-"}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{timeAgo(mod.updatedAt ? new Date(mod.updatedAt).getTime() : undefined)}</strong>
            </div>
          </div>

          <div className="project-section">
            <div className="project-section-head">
              <h3>Install target</h3>
              {compatible.length ? (
                <Select
                  value={target?.id ?? ""}
                  onChange={setModTarget}
                  ariaLabel="Install target instance"
                  options={compatible.map((instance) => ({
                    value: instance.id,
                    label: `${instance.name} · ${instance.mcVersion}`,
                  }))}
                />
              ) : null}
            </div>

            {target ? (
              <div className="target-card">
                <span className="target-icon" style={{ background: target.color, color: contrastInk(target.color) }}>
                  {initials(target.name)}
                </span>
                <div className="target-copy">
                  <strong>{target.name}</strong>
                  <span>
                    {target.mcVersion} · {target.kind === "server" ? "Server" : loaderLabel(target.loader)} ·{" "}
                    {target.installedMods.length} {target.kind === "server" ? "plugins" : "mods"}
                  </span>
                </div>
                <Chip>{mod.type === "plugin" ? "plugins/" : mod.type === "resourcepack" ? "resourcepacks/" : mod.type === "shader" ? "shaderpacks/" : "mods/"}</Chip>
              </div>
            ) : (
              <div className="callout callout--warn">
                <strong>No {mod.type === "plugin" ? "server" : "client"} instance yet</strong>
                <p>
                  {mod.type === "plugin"
                    ? "Plugins are installed into server instances. Create one to continue."
                    : "Create a client instance to install this project."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Server size={13} />}
                  onClick={() => {
                    onClose();
                    navigate("instances");
                  }}
                >
                  Go to instances
                </Button>
              </div>
            )}
          </div>

          <div className="project-section">
            <div className="project-section-head">
              <h3>Versions</h3>
              <span className="project-section-meta">
                {loading ? "Loading…" : `${versions.length} available`}
              </span>
            </div>

            {progress ? (
              <div className="version-progress">
                <div className="version-progress-head">
                  <span>{progress.stage}</span>
                  <span>{progress.indeterminate ? "" : `${Math.round(progress.percent ?? 0)}%`}</span>
                </div>
                <ProgressBar value={progress.percent} indeterminate={progress.indeterminate} />
              </div>
            ) : null}

            {loading ? (
              <div className="versions-loading">
                <Spinner size={16} />
                <span>Fetching versions from {providerLabel(mod.provider)}…</span>
              </div>
            ) : error ? (
              <div className="callout callout--error">
                <strong>Could not load versions</strong>
                <p>{error}</p>
              </div>
            ) : versions.length ? (
              <div className="version-list">
                {versions.map((version) => {
                  const compatibleVersion = !target || version.gameVersions.includes(target.mcVersion);
                  return (
                    <div className="version-row" key={version.id}>
                      <div className="version-copy">
                        <div className="version-title">
                          <strong>{version.name || version.versionNumber}</strong>
                          {version.channel && version.channel !== "release" ? (
                            <Chip tone="accent">{version.channel}</Chip>
                          ) : null}
                          {!compatibleVersion ? <Chip tone="danger">Mismatch</Chip> : null}
                        </div>
                        <div className="version-meta">
                          <span>{formatDate(version.publishedAt)}</span>
                          <span className="meta-sep" />
                          <span>{formatNumber(version.downloads)} downloads</span>
                          <span className="meta-sep" />
                          <span>{formatBytes(version.fileSize)}</span>
                        </div>
                        <div className="version-tags">
                          {version.gameVersions.slice(0, 4).map((value) => (
                            <span key={value}>{value}</span>
                          ))}
                          {version.loaders.slice(0, 3).map((value) => (
                            <span key={value}>{value}</span>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant={installed?.key === `${mod.provider}:${mod.id}:${version.id}` ? "outline" : "primary"}
                        size="sm"
                        icon={<Download size={13} />}
                        loading={installingId === version.id}
                        disabled={!target || Boolean(installingId)}
                        onClick={() => void install(version)}
                      >
                        {installed?.versionName === (version.name || version.versionNumber) ? "Reinstall" : "Install"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="callout callout--warn">
                <strong>No compatible versions</strong>
                <p>
                  {target
                    ? `Nothing published for ${target.mcVersion}${target.loader !== "vanilla" ? ` on ${loaderLabel(target.loader)}` : ""}.`
                    : "Select an instance to see compatible versions."}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="project-link"
            onClick={() => void api.app.openExternal(mod.websiteUrl)}
          >
            <ArrowUpRight size={14} />
            View on {providerLabel(mod.provider)}
          </button>
        </div>

        <footer className="drawer-foot">
          <span className="drawer-foot-note">
            <HardDriveDownload size={13} />
            Files download straight into your instance folder.
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </aside>
    </>
  );
}

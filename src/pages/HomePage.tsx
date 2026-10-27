import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  CheckCircle2,
  Cpu,
  Download,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ModSearchResult } from "@shared/types";
import { api, errorMessage } from "@/lib/api";
import {
  classNames,
  formatMemory,
  formatNumber,
  initials,
  loaderLabel,
  timeAgo,
} from "@/lib/format";
import { useApp } from "@/store/app";
import { Logo } from "@/components/Logo";
import { InstanceCard } from "@/components/InstanceCard";
import { Button, Chip, EmptyState, Panel, ProgressBar, Spinner, Stat } from "@/components/ui";

export function HomePage() {
  const instances = useApp((state) => state.instances);
  const account = useApp((state) => state.account);
  const java = useApp((state) => state.java);
  const javaLoaded = useApp((state) => state.javaLoaded);
  const loadJava = useApp((state) => state.loadJava);
  const launchStates = useApp((state) => state.launchStates);
  const gameProgress = useApp((state) => state.gameProgress);
  const launchInstance = useApp((state) => state.launchInstance);
  const stopInstance = useApp((state) => state.stopInstance);
  const navigate = useApp((state) => state.navigate);
  const openSettings = useApp((state) => state.openSettings);
  const browseMods = useApp((state) => state.browseMods);
  const setOpenMod = useApp((state) => state.setOpenMod);
  const openAccount = useApp((state) => state.openAccount);
  const update = useApp((state) => state.update);
  const checkUpdates = useApp((state) => state.checkUpdates);
  const downloadUpdate = useApp((state) => state.downloadUpdate);
  const installUpdate = useApp((state) => state.installUpdate);
  const settings = useApp((state) => state.settings);

  const [discover, setDiscover] = useState<ModSearchResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  useEffect(() => {
    void loadJava();
  }, [loadJava]);

  useEffect(() => {
    let alive = true;
    setDiscoverLoading(true);
    api.mods
      .search({ provider: "modrinth", query: "", type: "mod", sort: "downloads", limit: 4 })
      .then((result) => {
        if (!alive) return;
        setDiscover(result.results);
        setDiscoverError(null);
      })
      .catch((error) => {
        if (alive) setDiscoverError(errorMessage(error));
      })
      .finally(() => {
        if (alive) setDiscoverLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const clients = instances.filter((instance) => instance.kind === "client");
  const featured = [...clients].sort((a, b) => (b.lastPlayed ?? b.createdAt) - (a.lastPlayed ?? a.createdAt))[0];
  const recent = [...clients].sort((a, b) => (b.lastPlayed ?? b.createdAt) - (a.lastPlayed ?? a.createdAt)).slice(0, 3);
  const totalMods = instances.reduce((sum, instance) => sum + instance.installedMods.length, 0);
  const totalMemory = instances.reduce((sum, instance) => sum + instance.memoryMb, 0);
  const featuredState = featured ? launchStates[featured.id] : undefined;
  const featuredProgress = featured ? gameProgress[featured.id] : undefined;
  const featuredRunning = featuredState?.state === "running";

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Still awake";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const updateLabel = (() => {
    switch (update.state) {
      case "dev":
        return "Dev build";
      case "checking":
        return "Checking…";
      case "available":
        return `v${update.version ?? "new"} available`;
      case "downloading":
        return `Downloading ${Math.round(update.percent ?? 0)}%`;
      case "downloaded":
        return `v${update.version ?? ""} ready`;
      case "not-available":
        return "Up to date";
      case "error":
        return "Check failed";
      default:
        return "Not checked";
    }
  })();

  return (
    <div className="page page--home">
      <header className="page-head">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="page-title">
            {greeting}, {account?.name ?? "Player"}
          </h1>
          <p className="page-sub">Your worlds, mods and runtimes in one place. Pick up where you left off.</p>
        </div>
        <div className="page-head-actions">
          <span className="date-chip">{today}</span>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => navigate("instances")}>
            New instance
          </Button>
        </div>
      </header>

      {featured ? (
        <section className="hero">
          <div className="hero-main">
            <span className="hero-eyebrow">
              <span className="pulse-dot" />
              {featuredRunning ? "Running now" : "Ready to play"}
            </span>
            <h2>{featured.name}</h2>
            <div className="hero-meta">
              <Chip tone="accent">{featured.mcVersion}</Chip>
              <Chip>{loaderLabel(featured.loader)}</Chip>
              <Chip>{formatMemory(featured.memoryMb)}</Chip>
              <Chip>
                {featured.installedMods.length} {featured.installedMods.length === 1 ? "mod" : "mods"}
              </Chip>
            </div>
            <p className="hero-note">
              {featured.lastPlayed
                ? `Last played ${timeAgo(featured.lastPlayed)}.`
                : "First launch will install the runtime."}{" "}
              {featured.installed ? "Everything is installed and ready." : "Install it before launching."}
            </p>

            <div className="hero-actions">
              <Button
                variant="primary"
                size="lg"
                icon={
                  featuredRunning ? undefined : <Rocket size={15} fill="currentColor" />
                }
                loading={featuredState?.state === "launching" || featuredState?.state === "installing"}
                onClick={() =>
                  featuredRunning ? void stopInstance(featured.id) : void launchInstance(featured.id)
                }
                disabled={featuredState?.state === "installing" || featuredState?.state === "launching"}
              >
                {featuredRunning
                  ? "Stop game"
                  : featuredState?.state === "installing"
                    ? "Installing"
                    : featuredState?.state === "launching"
                      ? "Launching"
                      : featured.installed
                        ? "Launch"
                        : "Install & launch"}
              </Button>
              <Button variant="outline" size="lg" icon={<Blocks size={14} />} onClick={() => browseMods(featured.id)}>
                Manage mods
              </Button>
            </div>

            {featuredProgress ? (
              <div className="hero-progress">
                <div className="hero-progress-head">
                  <span>{featuredProgress.stage}</span>
                  <span>{featuredProgress.percent !== undefined ? `${Math.round(featuredProgress.percent)}%` : ""}</span>
                </div>
                <ProgressBar
                  value={featuredProgress.percent}
                  indeterminate={featuredProgress.indeterminate || featuredProgress.percent === undefined}
                />
              </div>
            ) : null}
          </div>

          <div className="hero-visual">
            <div className="orbit orbit--outer" />
            <div className="orbit orbit--inner" />
            <div className="hero-cube" style={{ color: featured.color }}>
              <Logo size={190} />
            </div>
            <span className="hero-corner hero-corner--tl">MC/{featured.mcVersion}</span>
            <span className="hero-corner hero-corner--br">
              {featured.loader.toUpperCase()}/{featured.installed ? "READY" : "NEW"}
            </span>
            <span className="hero-index">{String(instances.indexOf(featured) + 1).padStart(2, "0")}</span>
          </div>
        </section>
      ) : (
        <section className="hero hero--empty">
          <EmptyState
            icon={<Sparkles size={26} />}
            title="No instances yet"
            description="Create a client instance, pick a Minecraft version and a loader, then Cubelight handles the rest."
            action={
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => navigate("instances")}>
                Create your first instance
              </Button>
            }
          />
        </section>
      )}

      <div className="stat-grid">
        <Stat label="Instances" value={instances.length} hint={`${clients.length} client · ${instances.length - clients.length} server`} />
        <Stat label="Managed files" value={totalMods} hint="mods, plugins, packs & shaders" />
        <Stat label="Allocated memory" value={formatMemory(totalMemory)} hint={`${formatMemory(settings.launcher.defaultMemoryMb)} default`} />
        <Stat
          label="Update"
          value={update.state === "available" || update.state === "downloaded" ? "Ready" : update.state === "dev" ? "Dev" : update.state === "not-available" ? "Current" : "—"}
          hint={update.version ? `v${update.version}` : "Auto-update via GitHub"}
          accent={update.state === "available" || update.state === "downloaded"}
        />
      </div>

      <div className="home-columns">
        <div className="home-main">
          <section className="section">
            <div className="section-head">
              <div>
                <span className="section-kicker">Library</span>
                <h2>Recent instances</h2>
              </div>
              <Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={13} />} onClick={() => navigate("instances")}>
                All instances
              </Button>
            </div>
            {recent.length ? (
              <div className="instance-grid instance-grid--home">
                {recent.map((instance) => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    compact
                    onEdit={() => navigate("instances")}
                    onDelete={() => navigate("instances")}
                    onLogs={() => navigate("instances")}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-inline">No client instances yet.</div>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <div>
                <span className="section-kicker">Discover</span>
                <h2>Trending on Modrinth</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                trailingIcon={<ArrowUpRight size={13} />}
                onClick={() => browseMods()}
              >
                Browse all
              </Button>
            </div>

            {discoverLoading ? (
              <div className="discover-loading">
                <Spinner size={16} />
                <span>Fetching popular projects…</span>
              </div>
            ) : discoverError ? (
              <div className="empty-inline">{discoverError}</div>
            ) : (
              <div className="discover-grid">
                {discover.map((mod) => (
                  <button
                    key={`${mod.provider}:${mod.id}`}
                    type="button"
                    className="discover-card"
                    onClick={() => {
                      setOpenMod(mod);
                      navigate("mods");
                    }}
                  >
                    <div className="discover-icon">
                      {mod.iconUrl ? <img src={mod.iconUrl} alt="" /> : <span>{mod.title.slice(0, 1)}</span>}
                    </div>
                    <div className="discover-copy">
                      <strong>{mod.title}</strong>
                      <span>{mod.author ?? "Modrinth"}</span>
                      <p>{mod.description}</p>
                    </div>
                    <div className="discover-foot">
                      <span className="discover-downloads">
                        <Download size={12} /> {formatNumber(mod.downloads)}
                      </span>
                      <ArrowUpRight size={13} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="home-rail">
          <Panel
            eyebrow="Profile"
            title="Account"
            actions={
              <Button variant="ghost" size="sm" onClick={openAccount}>
                Manage
              </Button>
            }
          >
            <div className="rail-account">
              <span className="avatar avatar--md">
                {account?.avatarUrl ? (
                  <img src={account.avatarUrl} alt="" />
                ) : (
                  <span>{initials(account?.name ?? "Player")}</span>
                )}
              </span>
              <div className="rail-account-copy">
                <strong>{account?.name ?? "Player"}</strong>
                <span>
                  {account?.mode === "microsoft" ? "Microsoft · licensed" : "Offline profile"}
                </span>
              </div>
              <Chip tone={account?.mode === "microsoft" ? "success" : "default"}>
                {account?.mode === "microsoft" ? <CheckCircle2 size={11} /> : <UserRound size={11} />}
                {account?.mode === "microsoft" ? "Online" : "Offline"}
              </Chip>
            </div>
            <code className="rail-uuid">{account?.uuid ?? "No UUID yet"}</code>
          </Panel>

          <Panel
            eyebrow="Runtime"
            title="Java & system"
            actions={
              <Button variant="ghost" size="sm" onClick={() => openSettings("launch")}>
                Settings
              </Button>
            }
          >
            {!javaLoaded ? (
              <div className="rail-loading">
                <Spinner size={14} />
                <span>Scanning for Java…</span>
              </div>
            ) : java.length ? (
              <div className="java-list">
                {java.slice(0, 3).map((entry) => (
                  <div className="java-row" key={entry.path}>
                    <span className="java-icon">
                      <Cpu size={13} />
                    </span>
                    <div className="java-copy">
                      <strong>Java {entry.majorVersion}</strong>
                      <span>{entry.source ?? entry.version}</span>
                    </div>
                    <Chip tone={entry.majorVersion >= 21 ? "accent" : "default"}>
                      {entry.majorVersion >= 21 ? "Modern" : "Legacy"}
                    </Chip>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                No Java runtime found. Install Java 21 from adoptium.net.
              </div>
            )}
            <div className="rail-divider" />
            <div className="rail-kv">
              <span>Default memory</span>
              <strong>{formatMemory(settings.launcher.defaultMemoryMb)}</strong>
            </div>
            <div className="rail-kv">
              <span>Game window</span>
              <strong>
                {settings.launcher.fullscreen
                  ? "Fullscreen"
                  : `${settings.launcher.gameWindowWidth} × ${settings.launcher.gameWindowHeight}`}
              </strong>
            </div>
          </Panel>

          <Panel eyebrow="Release" title="Updates">
            <div className="update-card">
              <span className={classNames("update-icon", (update.state === "available" || update.state === "downloaded") && "is-ready")}>
                <RefreshCw size={15} />
              </span>
              <div className="update-copy">
                <strong>{updateLabel}</strong>
                <span>{update.message ?? "Checked against GitHub Releases."}</span>
              </div>
            </div>
            {update.state === "downloading" ? <ProgressBar value={update.percent} className="update-progress" /> : null}
            <div className="rail-actions">
              {update.state === "downloaded" ? (
                <Button variant="primary" size="sm" onClick={() => void installUpdate()}>
                  Restart & install
                </Button>
              ) : update.state === "available" ? (
                <Button variant="primary" size="sm" onClick={() => void downloadUpdate()}>
                  Download update
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={13} />}
                  onClick={() => void checkUpdates()}
                  loading={update.state === "checking"}
                >
                  Check for updates
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => openSettings("updates")}>
                Details
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

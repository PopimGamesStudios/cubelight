import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Github,
  Globe,
  Info,
  KeyRound,
  Palette,
  Plug,
  RefreshCw,
  RotateCcw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { DISPLAY_FONT_OPTIONS, FONT_OPTIONS, MONO_FONT_OPTIONS, THEME_PRESETS } from "@shared/defaults";
import type { AppearanceSettings, UpdateState } from "@shared/types";
import { api, isDesktop } from "@/lib/api";
import {
  ADOPTIUM_URL,
  AZURE_APPS_URL,
  CURSEFORGE_CONSOLE_URL,
  GITHUB_URL,
  ISSUES_URL,
  LICENSE_URL,
  MODRINTH_URL,
} from "@/lib/links";
import {
  classNames,
  formatDate,
  formatMemory,
  shortPath,
} from "@/lib/format";
import { useApp, type SettingsTab } from "@/store/app";
import { Logo } from "@/components/Logo";
import {
  Button,
  Chip,
  ConfirmDialog,
  Field,
  Panel,
  Segmented,
  Select,
  Slider,
  Toggle,
} from "@/components/ui";

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof Palette }> = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "launch", label: "Launch & Java", icon: Rocket },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "updates", label: "Updates", icon: RefreshCw },
  { id: "about", label: "About", icon: Info },
];

export function SettingsPage() {
  const tab = useApp((state) => state.settingsTab);
  const setTab = useApp((state) => state.setSettingsTab);

  return (
    <div className="page page--settings">
      <header className="page-head">
        <div>
          <span className="eyebrow">Preferences</span>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Tune the interface, launcher behavior, integrations and updates. Changes save instantly.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={classNames("settings-nav-item", tab === item.id && "is-active")}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={1.7} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="settings-nav-foot">
            <span>Settings file</span>
            <code>settings.json</code>
          </div>
        </nav>

        <div className="settings-content">
          {tab === "appearance" ? <AppearanceSection /> : null}
          {tab === "launch" ? <LaunchSection /> : null}
          {tab === "integrations" ? <IntegrationsSection /> : null}
          {tab === "updates" ? <UpdatesSection /> : null}
          {tab === "about" ? <AboutSection /> : null}
        </div>
      </div>
    </div>
  );
}

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .slice(1)
      .split("")
      .map((char) => char + char)
      .join("")}`;
  }
  return "#000000";
}

function ColorControl({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="color-control">
      <div className="color-control-copy">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <label className="color-swatch" style={{ background: value }}>
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color`}
        />
      </label>
      <input
        className="input mono color-hex"
        value={draft}
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(event.target.value.trim())) {
            onChange(event.target.value.trim());
          }
        }}
        onBlur={() => setDraft(value)}
        aria-label={`${label} hex value`}
      />
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onCommit,
  suffix,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (value: number) => void;
  suffix?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.min(max, Math.max(min, Math.round(parsed)));
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <span className="number-input">
      <input
        className="input mono"
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
      />
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}

function AppearanceSection() {
  const appearance = useApp((state) => state.settings.appearance);
  const patchSettings = useApp((state) => state.patchSettings);

  const update = (value: Partial<AppearanceSettings>) => patchSettings({ appearance: value });

  return (
    <div className="settings-section">
      <Panel
        eyebrow="Interface"
        title="Live preview"
        description="Every control updates the launcher immediately. Nothing needs a restart."
      >
        <div className="preview-window">
          <div className="preview-topbar">
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-title">cubelight / preview</span>
          </div>
          <div className="preview-body">
            <div className="preview-main">
              <span className="preview-eyebrow">Ready to play</span>
              <h3>Neon Survival</h3>
              <p>Fabric 1.21.1 with Sodium, Iris and five hand-picked mods.</p>
              <div className="preview-chips">
                <span>1.21.1</span>
                <span>Fabric</span>
                <span>6 GB</span>
              </div>
              <div className="preview-actions">
                <span className="preview-button">Launch</span>
                <span className="preview-button preview-button--ghost">Manage</span>
              </div>
              <div className="preview-progress">
                <span />
              </div>
            </div>
            <div className="preview-side">
              <span className="preview-side-label">Runtime</span>
              <strong>Java 21</strong>
              <span className="preview-side-meta">Temurin · detected</span>
              <span className="preview-side-label">Memory</span>
              <strong>{formatMemory(useApp.getState().settings.launcher.defaultMemoryMb)}</strong>
              <span className="preview-side-meta">Default allocation</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Palette" title="Theme presets" description="Start from a curated palette, then fine-tune individual colors.">
        <div className="theme-presets">
          {THEME_PRESETS.map((preset) => {
            const active = appearance.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={classNames("theme-preset", active && "is-active")}
                onClick={() =>
                  update({
                    preset: preset.id,
                    accent: preset.accent,
                    background: preset.background,
                    surface: preset.surface,
                    text: preset.text,
                  })
                }
              >
                <span className="preset-preview" style={{ background: preset.background }}>
                  <span className="preset-surface" style={{ background: preset.surface }} />
                  <span className="preset-accent" style={{ background: preset.accent }} />
                </span>
                <span className="preset-name">
                  {preset.name}
                  {active ? <Check size={12} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel eyebrow="Colors" title="Custom palette">
        <div className="color-grid">
          <ColorControl
            label="Accent"
            hint="Primary actions, focus rings and highlights."
            value={appearance.accent}
            onChange={(value) => update({ accent: value, preset: "custom" })}
          />
          <ColorControl
            label="Background"
            hint="The base canvas behind every surface."
            value={appearance.background}
            onChange={(value) => update({ background: value, preset: "custom" })}
          />
          <ColorControl
            label="Surface"
            hint="Cards, panels and the sidebar."
            value={appearance.surface}
            onChange={(value) => update({ surface: value, preset: "custom" })}
          />
          <ColorControl
            label="Text"
            hint="Primary reading color for the whole UI."
            value={appearance.text}
            onChange={(value) => update({ text: value, preset: "custom" })}
          />
        </div>
      </Panel>

      <Panel eyebrow="Type" title="Typography">
        <div className="form-grid">
          <Field label="Interface font" hint="Used for body copy, labels and controls.">
            <Select
              value={appearance.fontFamily}
              onChange={(value) => update({ fontFamily: value })}
              ariaLabel="Interface font"
              options={FONT_OPTIONS.map((font) => ({ value: font.value, label: font.name }))}
            />
          </Field>
          <Field label="Display font" hint="Headlines, instance names and large numbers.">
            <Select
              value={appearance.displayFont}
              onChange={(value) => update({ displayFont: value })}
              ariaLabel="Display font"
              options={DISPLAY_FONT_OPTIONS.map((font) => ({ value: font.value, label: font.name }))}
            />
          </Field>
          <Field label="Monospace font" hint="Version tags, logs, paths and metrics.">
            <Select
              value={appearance.monoFont}
              onChange={(value) => update({ monoFont: value })}
              ariaLabel="Monospace font"
              options={MONO_FONT_OPTIONS.map((font) => ({ value: font.value, label: font.name }))}
            />
          </Field>
          <Field label="Base size" hint="Root font size for the whole launcher.">
            <div className="slider-row">
              <Slider
                value={appearance.fontSize}
                min={13}
                max={20}
                step={1}
                onChange={(value) => update({ fontSize: value })}
                ariaLabel="Base font size"
              />
              <span className="slider-value">{appearance.fontSize}px</span>
            </div>
          </Field>
          <Field label="UI scale" hint="Scales the entire window. Useful for 4K displays.">
            <div className="slider-row">
              <Slider
                value={appearance.uiScale}
                min={0.8}
                max={1.4}
                step={0.05}
                onChange={(value) => update({ uiScale: value })}
                ariaLabel="UI scale"
              />
              <span className="slider-value">{Math.round(appearance.uiScale * 100)}%</span>
            </div>
          </Field>
        </div>
      </Panel>

      <Panel eyebrow="Layout" title="Shape & motion">
        <div className="form-grid">
          <Field label="Corner radius" hint="0 keeps everything razor sharp.">
            <div className="slider-row">
              <Slider
                value={appearance.radius}
                min={0}
                max={20}
                step={1}
                onChange={(value) => update({ radius: value })}
                ariaLabel="Corner radius"
              />
              <span className="slider-value">{appearance.radius}px</span>
            </div>
          </Field>
          <Field label="Density" hint="Compact trims padding across lists and cards.">
            <Segmented
              value={appearance.density}
              onChange={(value) => update({ density: value })}
              ariaLabel="Density"
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </Field>
          <Field label="Background pattern" hint="A faint technical grid behind the interface.">
            <Segmented
              value={appearance.backgroundPattern}
              onChange={(value) => update({ backgroundPattern: value })}
              ariaLabel="Background pattern"
              options={[
                { value: "grid", label: "Grid" },
                { value: "none", label: "Plain" },
              ]}
            />
          </Field>
        </div>

        <div className="setting-list">
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Collapse sidebar</strong>
              <span>Show icons only to give the content more room.</span>
            </div>
            <Toggle
              checked={appearance.sidebarCollapsed}
              onChange={(value) => update({ sidebarCollapsed: value })}
              label="Collapse sidebar"
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Reduce motion</strong>
              <span>Disable transitions, floating cubes and page animations.</span>
            </div>
            <Toggle
              checked={appearance.reduceMotion}
              onChange={(value) => update({ reduceMotion: value })}
              label="Reduce motion"
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function LaunchSection() {
  const launcher = useApp((state) => state.settings.launcher);
  const patchSettings = useApp((state) => state.patchSettings);
  const java = useApp((state) => state.java);
  const javaLoaded = useApp((state) => state.javaLoaded);
  const loadJava = useApp((state) => state.loadJava);
  const toast = useApp((state) => state.toast);

  useEffect(() => {
    void loadJava();
  }, [loadJava]);

  const update = (value: Partial<typeof launcher>) => patchSettings({ launcher: value });

  const chooseJava = async () => {
    const path = await api.settings.chooseFile("Choose java.exe", [
      { name: "Java executable", extensions: ["exe", "bin", "*"] },
    ]);
    if (path) update({ javaPath: path });
  };

  return (
    <div className="settings-section">
      <Panel eyebrow="Window" title="Behavior">
        <div className="setting-list">
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Close to tray</strong>
              <span>Keep Cubelight running in the system tray when the window closes.</span>
            </div>
            <Toggle checked={launcher.closeToTray} onChange={(value) => update({ closeToTray: value })} label="Close to tray" />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Minimize to tray</strong>
              <span>Hide the window instead of minimizing it.</span>
            </div>
            <Toggle checked={launcher.minimizeToTray} onChange={(value) => update({ minimizeToTray: value })} label="Minimize to tray" />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Launch at computer startup</strong>
              <span>Start Cubelight when you sign in to Windows, macOS or Linux.</span>
            </div>
            <Toggle checked={launcher.launchAtLogin} onChange={(value) => update({ launchAtLogin: value })} label="Launch at startup" />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Start minimized</strong>
              <span>Boot straight into the tray without showing the window.</span>
            </div>
            <Toggle checked={launcher.startMinimized} onChange={(value) => update({ startMinimized: value })} label="Start minimized" />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Minimize when a game starts</strong>
              <span>Get out of the way as soon as Minecraft is running.</span>
            </div>
            <Toggle checked={launcher.minimizeOnLaunch} onChange={(value) => update({ minimizeOnLaunch: value })} label="Minimize on launch" />
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Performance" title="Memory & downloads">
        <div className="setting-list">
          <div className="setting-row setting-row--stack">
            <div className="setting-copy">
              <strong>Default instance memory</strong>
              <span>Pre-filled when creating a new instance. Each instance can override it.</span>
            </div>
            <div className="slider-row slider-row--wide">
              <Slider
                value={launcher.defaultMemoryMb}
                min={1024}
                max={16384}
                step={512}
                onChange={(value) => update({ defaultMemoryMb: value })}
                ariaLabel="Default memory"
              />
              <span className="slider-value">{formatMemory(launcher.defaultMemoryMb)}</span>
            </div>
          </div>
          <div className="setting-row setting-row--stack">
            <div className="setting-copy">
              <strong>Concurrent downloads</strong>
              <span>Parallel file downloads during installs. Higher is faster but heavier on bandwidth.</span>
            </div>
            <div className="slider-row slider-row--wide">
              <Slider
                value={launcher.maxConcurrentDownloads}
                min={1}
                max={12}
                step={1}
                onChange={(value) => update({ maxConcurrentDownloads: value })}
                ariaLabel="Concurrent downloads"
              />
              <span className="slider-value">{launcher.maxConcurrentDownloads}</span>
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Confirm before deleting</strong>
              <span>Ask before removing instances or installed files.</span>
            </div>
            <Toggle
              checked={launcher.confirmBeforeDelete}
              onChange={(value) => update({ confirmBeforeDelete: value })}
              label="Confirm before deleting"
            />
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="Java"
        title="Runtime"
        description="Cubelight auto-detects installed JDKs. Leave the path empty to let it pick the right major version."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => void loadJava(true)}>
            Rescan
          </Button>
        }
      >
        <div className="java-picker">
          <div className="java-picker-row">
            <div className="java-picker-copy">
              <strong>Custom Java path</strong>
              <span className="mono">{launcher.javaPath ? shortPath(launcher.javaPath, 60) : "Auto-detect (recommended)"}</span>
            </div>
            <div className="java-picker-actions">
              <Button variant="outline" size="sm" onClick={() => void chooseJava()}>
                Browse
              </Button>
              {launcher.javaPath ? (
                <Button variant="ghost" size="sm" onClick={() => update({ javaPath: "" })}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {!javaLoaded ? (
            <div className="rail-loading">Scanning for Java runtimes…</div>
          ) : java.length ? (
            <div className="java-runtimes">
              <button
                type="button"
                className={classNames("java-runtime", !launcher.javaPath && "is-active")}
                onClick={() => update({ javaPath: "" })}
              >
                <span className="java-runtime-icon">
                  <Sparkles size={14} />
                </span>
                <span className="java-runtime-copy">
                  <strong>Auto-detect</strong>
                  <span>Pick the best runtime for each Minecraft version</span>
                </span>
                {!launcher.javaPath ? <Check size={14} /> : null}
              </button>
              {java.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  className={classNames("java-runtime", launcher.javaPath === entry.path && "is-active")}
                  onClick={() => update({ javaPath: entry.path })}
                >
                  <span className="java-runtime-icon">
                    <Cpu size={14} />
                  </span>
                  <span className="java-runtime-copy">
                    <strong>
                      Java {entry.majorVersion} · {entry.version}
                    </strong>
                    <span>{shortPath(entry.path, 54)}</span>
                  </span>
                  <Chip tone={entry.majorVersion >= 21 ? "accent" : "default"}>{entry.source ?? "Detected"}</Chip>
                  {launcher.javaPath === entry.path ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="callout callout--warn">
              <strong>No Java runtime found</strong>
              <p>Install Temurin 21 (or newer) so Cubelight can launch modern Minecraft versions.</p>
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink size={13} />}
                onClick={() => void api.app.openExternal(ADOPTIUM_URL)}
              >
                Get Java from Adoptium
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel eyebrow="Display" title="Game window">
        <div className="form-grid">
          <Field label="Window width">
            <NumberInput
              value={launcher.gameWindowWidth}
              min={640}
              max={7680}
              onCommit={(value) => update({ gameWindowWidth: value })}
              suffix="px"
              ariaLabel="Game window width"
            />
          </Field>
          <Field label="Window height">
            <NumberInput
              value={launcher.gameWindowHeight}
              min={480}
              max={4320}
              onCommit={(value) => update({ gameWindowHeight: value })}
              suffix="px"
              ariaLabel="Game window height"
            />
          </Field>
        </div>
        <div className="setting-list">
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Fullscreen</strong>
              <span>Ignore the window size and launch Minecraft in fullscreen.</span>
            </div>
            <Toggle checked={launcher.fullscreen} onChange={(value) => update({ fullscreen: value })} label="Fullscreen" />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Show snapshots</strong>
              <span>Include weekly snapshots in version pickers. They can break mods.</span>
            </div>
            <Toggle checked={launcher.showSnapshots} onChange={(value) => update({ showSnapshots: value })} label="Show snapshots" />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function IntegrationsSection() {
  const launcher = useApp((state) => state.settings.launcher);
  const patchSettings = useApp((state) => state.patchSettings);
  const account = useApp((state) => state.account);
  const openAccount = useApp((state) => state.openAccount);
  const toast = useApp((state) => state.toast);
  const [showKey, setShowKey] = useState(false);

  const update = (value: Partial<typeof launcher>) => patchSettings({ launcher: value });

  return (
    <div className="settings-section">
      <Panel
        eyebrow="Modrinth"
        title="Open API"
        description="No key required. Cubelight identifies itself with the user agent below."
      >
        <Field label="User agent" hint="Modrinth asks clients to send a descriptive user agent. Include a contact or repository link.">
          <input
            className="input mono"
            value={launcher.modrinthUserAgent}
            spellCheck={false}
            onChange={(event) => update({ modrinthUserAgent: event.target.value })}
          />
        </Field>
        <div className="inline-links">
          <button type="button" className="link-button" onClick={() => void api.app.openExternal(MODRINTH_URL)}>
            modrinth.com <ArrowUpRight size={12} />
          </button>
          <span className="inline-note">Browsing, versions and downloads work out of the box.</span>
        </div>
      </Panel>

      <Panel
        eyebrow="CurseForge"
        title="API key"
        description="CurseForge requires an approved API key for third-party clients. It stays on this machine."
      >
        <Field label="CurseForge API key" hint="Get a key from the CurseForge developer console, then paste it here.">
          <div className="input-with-action">
            <input
              className="input mono"
              type={showKey ? "text" : "password"}
              value={launcher.curseforgeApiKey}
              spellCheck={false}
              placeholder="$2a$10$…"
              onChange={(event) => update({ curseforgeApiKey: event.target.value })}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
        <div className="inline-links">
          <button
            type="button"
            className="link-button"
            onClick={() => void api.app.openExternal(CURSEFORGE_CONSOLE_URL)}
          >
            CurseForge developer console <ArrowUpRight size={12} />
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void navigator.clipboard.writeText(launcher.curseforgeApiKey).then(
                () => toast({ title: "API key copied", tone: "success" }),
                () => toast({ title: "Could not copy the key", tone: "error" }),
              );
            }}
            disabled={!launcher.curseforgeApiKey}
          >
            Copy key
          </button>
          <span className="inline-note">
            <KeyRound size={12} /> Stored as plain text in your local settings file.
          </span>
        </div>
      </Panel>

      <Panel
        eyebrow="Microsoft"
        title="Minecraft account"
        description="Sign in with a licensed Microsoft account for online servers and skins."
      >
        <div className="integration-account">
          <div className="integration-account-copy">
            <strong>{account?.name ?? "No profile"}</strong>
            <span>
              {account?.mode === "microsoft" ? "Microsoft account connected" : "Offline profile active"}
            </span>
            <code>{account?.uuid ?? "No UUID"}</code>
          </div>
          <Chip tone={account?.mode === "microsoft" ? "success" : "default"}>
            {account?.mode === "microsoft" ? <ShieldCheck size={11} /> : null}
            {account?.mode === "microsoft" ? "Licensed" : "Offline"}
          </Chip>
          <Button variant="outline" size="sm" onClick={openAccount}>
            Manage account
          </Button>
        </div>

        <div className="form-grid">
          <Field
            label="Azure application (client) ID"
            hint="Cubelight ships without a bundled client ID. Create a public client app, enable public client flows, and paste the ID."
            className="span-2"
          >
            <input
              className="input mono"
              value={launcher.msClientId}
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) => update({ msClientId: event.target.value })}
            />
          </Field>
        </div>
        <div className="inline-links">
          <button type="button" className="link-button" onClick={() => void api.app.openExternal(AZURE_APPS_URL)}>
            Azure app registrations <ArrowUpRight size={12} />
          </button>
          <span className="inline-note">
            Redirect URI is not required — Cubelight uses the device code flow.
          </span>
        </div>
      </Panel>
    </div>
  );
}

const UPDATE_LABELS: Record<UpdateState, string> = {
  idle: "Idle",
  dev: "Development build",
  checking: "Checking",
  available: "Update available",
  "not-available": "Up to date",
  downloading: "Downloading",
  downloaded: "Ready to install",
  error: "Error",
};

function UpdatesSection() {
  const launcher = useApp((state) => state.settings.launcher);
  const patchSettings = useApp((state) => state.patchSettings);
  const update = useApp((state) => state.update);
  const checkUpdates = useApp((state) => state.checkUpdates);
  const downloadUpdate = useApp((state) => state.downloadUpdate);
  const installUpdate = useApp((state) => state.installUpdate);
  const appInfo = useApp((state) => state.appInfo);

  const updateLauncher = (value: Partial<typeof launcher>) => patchSettings({ launcher: value });

  const tone =
    update.state === "available" || update.state === "downloaded"
      ? "success"
      : update.state === "error"
        ? "danger"
        : update.state === "downloading" || update.state === "checking"
          ? "accent"
          : "default";

  return (
    <div className="settings-section">
      <Panel eyebrow="Release" title={`Cubelight ${appInfo?.version ?? "1.0.0"}`}>
        <div className="update-status">
          <div className="update-status-main">
            <Chip tone={tone}>{UPDATE_LABELS[update.state]}</Chip>
            <h3>
              {update.state === "available" || update.state === "downloaded"
                ? `Version ${update.version ?? "unknown"}`
                : update.state === "not-available"
                  ? "You are on the latest release"
                  : update.state === "dev"
                    ? "Auto-updates run in packaged builds"
                    : update.state === "error"
                      ? "Update check failed"
                      : "GitHub Releases"}
            </h3>
            <p>{update.message ?? "Updates are published from GitHub Releases and installed by electron-updater."}</p>
            {update.checkedAt ? <span className="update-checked">Checked {formatDate(new Date(update.checkedAt).toISOString())}</span> : null}
          </div>
          <div className="update-status-actions">
            {update.state === "downloaded" ? (
              <Button variant="primary" icon={<Rocket size={14} />} onClick={() => void installUpdate()}>
                Restart & install
              </Button>
            ) : update.state === "available" ? (
              <Button variant="primary" onClick={() => void downloadUpdate()}>
                Download update
              </Button>
            ) : (
              <Button
                variant="outline"
                icon={<RefreshCw size={14} />}
                onClick={() => void checkUpdates()}
                loading={update.state === "checking"}
              >
                Check now
              </Button>
            )}
            <span className="update-note">
              {isDesktop ? "Packaged builds update silently in the background." : "Web preview does not download updates."}
            </span>
          </div>
        </div>
        {update.state === "downloading" ? (
          <div className="update-progress">
            <div className="update-progress-head">
              <span>Downloading update</span>
              <span>{Math.round(update.percent ?? 0)}%</span>
            </div>
            <div className="progress">
              <span style={{ width: `${Math.max(0, Math.min(100, update.percent ?? 0))}%` }} />
            </div>
          </div>
        ) : null}
        {update.releaseNotes ? (
          <div className="release-notes">
            <span>Release notes</span>
            <pre>{update.releaseNotes}</pre>
          </div>
        ) : null}
      </Panel>

      <Panel eyebrow="Policy" title="Update behavior">
        <div className="setting-list">
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Check automatically</strong>
              <span>Look for a new release when Cubelight starts.</span>
            </div>
            <Toggle
              checked={launcher.autoCheckUpdates}
              onChange={(value) => updateLauncher({ autoCheckUpdates: value })}
              label="Check for updates automatically"
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Download automatically</strong>
              <span>Fetch updates in the background, then ask before restarting.</span>
            </div>
            <Toggle
              checked={launcher.autoDownloadUpdates}
              onChange={(value) => updateLauncher({ autoDownloadUpdates: value })}
              label="Download updates automatically"
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Release channel</strong>
              <span>Stable receives tagged releases. Beta also receives pre-releases.</span>
            </div>
            <Select
              value={launcher.updateChannel}
              onChange={(value) => updateLauncher({ updateChannel: value as typeof launcher.updateChannel })}
              ariaLabel="Release channel"
              options={[
                { value: "stable", label: "Stable" },
                { value: "beta", label: "Beta" },
              ]}
            />
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Advanced" title="Custom feed">
        <Field
          label="Update feed URL"
          hint="Leave empty to use the GitHub repository baked into the build. Set a URL only for self-hosted feeds."
        >
          <input
            className="input mono"
            value={launcher.updateFeedUrl}
            spellCheck={false}
            placeholder="https://github.com/owner/repo/releases"
            onChange={(event) => updateLauncher({ updateFeedUrl: event.target.value })}
          />
        </Field>
        <div className="callout callout--info">
          <div className="callout-head">
            <Info size={14} />
            <strong>How releases roll out</strong>
          </div>
          <p>
            Push a tag like <code>v1.2.0</code>. The GitHub Actions release workflow builds installers, publishes them
            to GitHub Releases, and electron-updater serves that release to every running launcher.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function AboutSection() {
  const appInfo = useApp((state) => state.appInfo);
  const resetSettings = useApp((state) => state.resetSettings);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const doReset = async () => {
    setResetBusy(true);
    try {
      await resetSettings();
      setConfirmReset(false);
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="settings-section">
      <Panel eyebrow="About" title="Cubelight">
        <div className="about-hero">
          <span className="about-logo">
            <Logo size={64} />
          </span>
          <div className="about-copy">
            <h3>Cubelight</h3>
            <p>
              A fully open-source Minecraft launcher built with Electron, React and TypeScript. Modrinth and
              CurseForge content installs straight into isolated instance folders.
            </p>
            <div className="about-chips">
              <Chip tone="accent">MIT license</Chip>
              <Chip>v{appInfo?.version ?? "1.0.0"}</Chip>
              <Chip>Open source</Chip>
            </div>
          </div>
        </div>

        <div className="about-grid">
          <div className="about-kv">
            <span>Version</span>
            <strong>{appInfo?.version ?? "—"}</strong>
          </div>
          <div className="about-kv">
            <span>Electron</span>
            <strong>{appInfo?.electron ?? "—"}</strong>
          </div>
          <div className="about-kv">
            <span>Platform</span>
            <strong>
              {appInfo ? `${appInfo.platform} · ${appInfo.arch}` : "—"}
            </strong>
          </div>
          <div className="about-kv">
            <span>Build</span>
            <strong>{appInfo?.isPackaged ? "Packaged" : "Development"}</strong>
          </div>
        </div>

        <div className="about-path">
          <div>
            <span>Data directory</span>
            <code>{appInfo?.dataDir ?? "—"}</code>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<FolderOpen size={13} />}
            disabled={!appInfo?.dataDir}
            onClick={() => appInfo && void api.settings.openPath(appInfo.dataDir)}
          >
            Open folder
          </Button>
        </div>
      </Panel>

      <Panel eyebrow="Community" title="Links & support">
        <div className="link-grid">
          <button type="button" className="link-card" onClick={() => void api.app.openExternal(GITHUB_URL)}>
            <Github size={18} />
            <span>
              <strong>Source code</strong>
              <small>{GITHUB_URL.replace("https://", "")}</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button type="button" className="link-card" onClick={() => void api.app.openExternal(ISSUES_URL)}>
            <Globe size={18} />
            <span>
              <strong>Report an issue</strong>
              <small>Bugs, feature requests and translations</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button type="button" className="link-card" onClick={() => void api.app.openExternal(LICENSE_URL)}>
            <ShieldCheck size={18} />
            <span>
              <strong>MIT license</strong>
              <small>Fork it, remix it, ship it</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button type="button" className="link-card" onClick={() => void api.app.openExternal(MODRINTH_URL)}>
            <Sparkles size={18} />
            <span>
              <strong>Modrinth</strong>
              <small>mods, plugins, packs and shaders</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </Panel>

      <Panel eyebrow="Danger zone" title="Reset everything" className="panel--danger">
        <div className="danger-row">
          <div className="setting-copy">
            <strong>Reset settings</strong>
            <span>Restore the default theme, behavior and integrations. Instances and mods are not touched.</span>
          </div>
          <Button variant="danger" icon={<RotateCcw size={13} />} onClick={() => setConfirmReset(true)}>
            Reset settings
          </Button>
        </div>
        <div className="danger-row">
          <div className="setting-copy">
            <strong>Installed content</strong>
            <span>Remove mods, plugins and packs from individual instances in the Mods page.</span>
          </div>
          <Button variant="ghost" icon={<Trash2 size={13} />} onClick={() => useApp.getState().navigate("mods")}>
            Manage content
          </Button>
        </div>
      </Panel>

      <p className="about-footer">
        Cubelight is not affiliated with Mojang or Microsoft. Minecraft is a trademark of Mojang Synergies AB.
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all settings?"
        message="Your theme, launch behavior, API keys and account integration will return to defaults. Instances, worlds and installed content are untouched."
        confirmLabel="Reset settings"
        danger
        busy={resetBusy}
        onConfirm={() => void doReset()}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}

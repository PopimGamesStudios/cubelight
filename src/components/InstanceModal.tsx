import { useEffect, useMemo, useState } from "react";
import { Monitor, Server } from "lucide-react";
import type { GameVersion, Instance, InstanceKind, LoaderType } from "@shared/types";
import { api, errorMessage } from "@/lib/api";
import { classNames, contrastInk, formatMemory } from "@/lib/format";
import { useApp } from "@/store/app";
import { Button, Field, Modal, Segmented, Select, Slider, Toggle } from "./ui";

const ICONS = ["◆", "▣", "▤", "✦", "▲", "●", "⬢", "⚡"];
const COLORS = ["#c8ff3d", "#4f8cff", "#ff6b3d", "#a78bfa", "#5eead4", "#f472b6", "#facc15", "#94a3b8"];
const FALLBACK_VERSIONS = ["1.21.5", "1.21.4", "1.21.1", "1.20.6", "1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2", "1.8.9"];

interface InstanceModalProps {
  open: boolean;
  instance?: Instance | null;
  onClose: () => void;
}

export function InstanceModal({ open, instance, onClose }: InstanceModalProps) {
  const createInstance = useApp((state) => state.createInstance);
  const updateInstance = useApp((state) => state.updateInstance);
  const showSnapshots = useApp((state) => state.settings.launcher.showSnapshots);
  const defaultMemory = useApp((state) => state.settings.launcher.defaultMemoryMb);

  const editing = Boolean(instance);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [kind, setKind] = useState<InstanceKind>("client");
  const [loader, setLoader] = useState<LoaderType>("fabric");
  const [mcVersion, setMcVersion] = useState("1.21.1");
  const [memory, setMemory] = useState(4096);
  const [installNow, setInstallNow] = useState(true);
  const [versions, setVersions] = useState<string[]>(FALLBACK_VERSIONS);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    if (instance) {
      setName(instance.name);
      setIcon(instance.icon);
      setColor(instance.color);
      setKind(instance.kind);
      setLoader(instance.loader);
      setMcVersion(instance.mcVersion);
      setMemory(instance.memoryMb);
    } else {
      setName("");
      setIcon(ICONS[0]);
      setColor(COLORS[0]);
      setKind("client");
      setLoader("fabric");
      setMemory(defaultMemory);
      setInstallNow(true);
    }
  }, [open, instance, defaultMemory]);

  useEffect(() => {
    if (!open || instance) return;
    let alive = true;
    setLoadingVersions(true);
    api.game
      .versions(showSnapshots)
      .then((result) => {
        if (!alive) return;
        const list = result.versions.map((entry: GameVersion) => entry.id);
        setVersions(list.length ? list : FALLBACK_VERSIONS);
        setMcVersion((current) => (list.includes(current) ? current : (result.latest.release ?? list[0] ?? current)));
      })
      .catch(() => {
        if (alive) setVersions(FALLBACK_VERSIONS);
      })
      .finally(() => {
        if (alive) setLoadingVersions(false);
      });
    return () => {
      alive = false;
    };
  }, [open, instance, showSnapshots]);

  const versionOptions = useMemo(
    () => versions.map((version) => ({ value: version, label: version })),
    [versions],
  );

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this instance a name.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (instance) {
        await updateInstance(instance.id, { name: trimmed, icon, color, memoryMb: memory });
      } else {
        await createInstance(
          {
            name: trimmed,
            icon,
            color,
            kind,
            loader: kind === "server" ? "vanilla" : loader,
            mcVersion,
            memoryMb: memory,
          },
          kind === "client" && installNow,
        );
      }
      onClose();
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={editing ? "Edit instance" : "New instance"}
      title={editing ? instance?.name ?? "Instance" : "Create an instance"}
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {editing ? "Save changes" : "Create instance"}
          </Button>
        </>
      }
    >
      <div className="instance-preview">
        <span className="instance-preview-icon" style={{ background: color, color: contrastInk(color) }}>
          {icon}
        </span>
        <div className="instance-preview-copy">
          <strong>{name.trim() || "Untitled instance"}</strong>
          <span>
            {kind === "server" ? "Server folder" : `${mcVersion} · ${loader === "vanilla" ? "Vanilla" : loader}`} ·{" "}
            {formatMemory(memory)}
          </span>
        </div>
        {editing ? (
          <span className="instance-preview-state">{instance?.installed ? "Installed" : "Not installed"}</span>
        ) : null}
      </div>

      <div className="form-grid">
        <Field label="Instance name" className="span-2">
          <input
            className="input"
            value={name}
            maxLength={48}
            autoFocus
            placeholder="Neon Survival"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </Field>

        {!editing ? (
          <>
            <Field label="Type">
              <Segmented
                value={kind}
                onChange={(value) => {
                  setKind(value);
                  if (value === "server") setLoader("vanilla");
                }}
                ariaLabel="Instance type"
                options={[
                  { value: "client", label: "Client", icon: <Monitor size={14} /> },
                  { value: "server", label: "Server", icon: <Server size={14} /> },
                ]}
              />
            </Field>

            <Field label="Minecraft version">
              <Select
                value={mcVersion}
                onChange={setMcVersion}
                options={versionOptions}
                ariaLabel="Minecraft version"
                disabled={loadingVersions}
              />
            </Field>

            {kind === "client" ? (
              <Field label="Mod loader">
                <Select
                  value={loader}
                  onChange={(value) => setLoader(value as LoaderType)}
                  ariaLabel="Mod loader"
                  options={[
                    { value: "vanilla", label: "Vanilla" },
                    { value: "fabric", label: "Fabric" },
                    { value: "forge", label: "Forge" },
                    { value: "neoforge", label: "NeoForge" },
                  ]}
                />
              </Field>
            ) : (
              <Field label="Server note">
                <div className="inline-note">
                  Server instances are folder-only. Cubelight creates <code>mods/</code>, <code>plugins/</code> and{" "}
                  <code>config/</code> for you.
                </div>
              </Field>
            )}
          </>
        ) : (
          <div className="inline-note span-2">
            Loader and Minecraft version are locked after creation. Create a new instance if you need a different
            runtime.
          </div>
        )}

        <Field label="Memory" hint={`${formatMemory(memory)} allocated to this instance`} className="span-2">
          <div className="slider-row">
            <Slider value={memory} min={1024} max={16384} step={512} onChange={setMemory} ariaLabel="Memory" />
            <span className="slider-value">{formatMemory(memory)}</span>
          </div>
        </Field>

        <Field label="Icon">
          <div className="icon-picker">
            {ICONS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                className={classNames("icon-choice", symbol === icon && "is-active")}
                onClick={() => setIcon(symbol)}
                aria-label={`Icon ${symbol}`}
                aria-pressed={symbol === icon}
              >
                {symbol}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Accent">
          <div className="color-picker">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className={classNames("color-choice", value === color && "is-active")}
                style={{ background: value }}
                onClick={() => setColor(value)}
                aria-label={`Color ${value}`}
                aria-pressed={value === color}
              />
            ))}
          </div>
        </Field>

        {!editing && kind === "client" ? (
          <div className="setting-inline span-2">
            <div>
              <strong>Install after creating</strong>
              <p>Download Minecraft, assets and the loader right away.</p>
            </div>
            <Toggle checked={installNow} onChange={setInstallNow} label="Install after creating" />
          </div>
        ) : null}
      </div>

      {error ? <div className="callout callout--error">{error}</div> : null}
    </Modal>
  );
}

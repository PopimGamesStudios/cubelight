import {
  Blocks,
  FolderOpen,
  Pencil,
  Play,
  RotateCw,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import type { Instance } from "@shared/types";
import { api } from "@/lib/api";
import { classNames, contrastInk, formatMemory, loaderLabel, timeAgo } from "@/lib/format";
import { useApp } from "@/store/app";
import { Button, Chip, IconButton, ProgressBar, Spinner } from "./ui";

interface InstanceCardProps {
  instance: Instance;
  compact?: boolean;
  onEdit: (instance: Instance) => void;
  onDelete: (instance: Instance) => void;
  onLogs: (instance: Instance) => void;
}

export function InstanceCard({ instance, compact, onEdit, onDelete, onLogs }: InstanceCardProps) {
  const launchStates = useApp((state) => state.launchStates);
  const gameProgress = useApp((state) => state.gameProgress);
  const launchInstance = useApp((state) => state.launchInstance);
  const stopInstance = useApp((state) => state.stopInstance);
  const browseMods = useApp((state) => state.browseMods);
  const navigate = useApp((state) => state.navigate);

  const state = launchStates[instance.id]?.state;
  const progress = gameProgress[instance.id];
  const running = state === "running";
  const installing = state === "installing";
  const launching = state === "launching";
  const busy = running || installing || launching;
  const itemLabel = instance.kind === "server" ? "plugin" : "mod";

  const primary = () => {
    if (running) {
      void stopInstance(instance.id);
      return;
    }
    if (installing || launching) return;
    void launchInstance(instance.id);
  };

  const primaryLabel = () => {
    if (running) return "Stop";
    if (installing) return "Installing";
    if (launching) return "Launching";
    if (!instance.installed) return "Install";
    return "Play";
  };

  return (
    <article className={classNames("instance-card", compact && "instance-card--compact", running && "is-running")}>
      <div className="instance-card-top">
        <span
          className="instance-icon"
          style={{ background: instance.color, color: contrastInk(instance.color) }}
        >
          {instance.icon}
        </span>
        <div className="instance-heading">
          <div className="instance-name-row">
            <h3>{instance.name}</h3>
            {running ? (
              <span className="live-pill">
                <span /> Live
              </span>
            ) : null}
          </div>
          <div className="instance-tags">
            <Chip tone="accent">{instance.mcVersion}</Chip>
            <Chip>{instance.kind === "server" ? "Server" : loaderLabel(instance.loader)}</Chip>
            {instance.kind === "client" && !instance.installed ? <Chip tone="danger">Not installed</Chip> : null}
          </div>
        </div>
      </div>

      <div className="instance-meta">
        <span>{formatMemory(instance.memoryMb)}</span>
        <span className="meta-sep" />
        <button type="button" className="meta-link" onClick={() => browseMods(instance.id)}>
          {instance.installedMods.length} {itemLabel}
          {instance.installedMods.length === 1 ? "" : "s"}
        </button>
        <span className="meta-sep" />
        <span>{instance.lastPlayed ? `Played ${timeAgo(instance.lastPlayed)}` : "Never played"}</span>
      </div>

      {installing || launching ? (
        <div className="instance-progress">
          <div className="instance-progress-head">
            <span>{progress?.stage ?? (installing ? "Preparing install" : "Starting game")}</span>
            <span>{progress?.percent !== undefined ? `${Math.round(progress.percent)}%` : ""}</span>
          </div>
          <ProgressBar
            value={progress?.percent}
            indeterminate={progress?.indeterminate || progress?.percent === undefined}
          />
        </div>
      ) : null}

      <div className="instance-actions">
        {instance.kind === "server" ? (
          <Button variant="primary" icon={<Blocks size={14} />} onClick={() => browseMods(instance.id)}>
            Plugins
          </Button>
        ) : (
          <Button
            variant={running ? "outline" : "primary"}
            icon={
              installing || launching ? undefined : running ? (
                <Square size={13} fill="currentColor" />
              ) : instance.installed ? (
                <Play size={13} fill="currentColor" />
              ) : (
                <RotateCw size={13} />
              )
            }
            onClick={primary}
            disabled={installing || launching}
          >
            {installing || launching ? <Spinner size={13} /> : null}
            {primaryLabel()}
          </Button>
        )}

        {compact ? (
          <Button variant="ghost" size="sm" onClick={() => navigate("instances")}>
            Manage
          </Button>
        ) : (
          <>
            {instance.kind !== "server" ? (
              <Button variant="ghost" size="sm" icon={<Blocks size={13} />} onClick={() => browseMods(instance.id)}>
                Mods
              </Button>
            ) : null}
            <span className="instance-actions-spacer" />
            <div className="instance-icon-actions">
              <IconButton
                label="Open folder"
                size="sm"
                onClick={() => void api.instances.openFolder(instance.id)}
              >
                <FolderOpen size={13} />
              </IconButton>
              <IconButton label="View logs" size="sm" onClick={() => onLogs(instance)}>
                <Terminal size={13} />
              </IconButton>
              <IconButton label="Edit instance" size="sm" onClick={() => onEdit(instance)}>
                <Pencil size={13} />
              </IconButton>
              <IconButton label="Delete instance" size="sm" tone="danger" onClick={() => onDelete(instance)}>
                <Trash2 size={13} />
              </IconButton>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

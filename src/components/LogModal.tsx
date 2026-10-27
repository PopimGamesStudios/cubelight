import { useEffect, useRef, useState } from "react";
import { Clipboard, FolderOpen, Terminal } from "lucide-react";
import type { Instance } from "@shared/types";
import { api } from "@/lib/api";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";
import { Button, Chip, EmptyState, Modal } from "./ui";

interface LogModalProps {
  instance: Instance | null;
  open: boolean;
  onClose: () => void;
}

export function LogModal({ instance, open, onClose }: LogModalProps) {
  const logs = useApp((state) => (instance ? state.logs[instance.id] : undefined));
  const state = useApp((state) => (instance ? state.launchStates[instance.id] : undefined));
  const [follow, setFollow] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!follow || !open) return;
    const node = bodyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [logs, follow, open]);

  const lines = logs ?? [];

  const copy = async () => {
    if (!instance) return;
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <Modal
      open={open && Boolean(instance)}
      onClose={onClose}
      eyebrow="Game output"
      title={instance ? `${instance.name} logs` : "Logs"}
      width={860}
      className="modal--logs"
      footer={
        <>
          <label className="check-inline">
            <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
            Follow output
          </label>
          <span className="modal-foot-spacer" />
          <Button
            variant="ghost"
            size="sm"
            icon={<FolderOpen size={13} />}
            onClick={() => instance && void api.instances.openFolder(instance.id)}
          >
            Folder
          </Button>
          <Button variant="outline" size="sm" icon={<Clipboard size={13} />} onClick={() => void copy()}>
            Copy
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="log-status">
        <Chip tone={state?.state === "running" ? "success" : state?.state === "crashed" ? "danger" : "default"}>
          {state?.state ?? "idle"}
        </Chip>
        <span>{state?.message ?? "No active process. Launch the instance to stream output here."}</span>
        <span className="log-count">{lines.length} lines</span>
      </div>

      <div className={classNames("log-view", !lines.length && "log-view--empty")} ref={bodyRef}>
        {lines.length ? (
          lines.map((line, index) => (
            <div
              key={`${index}-${line.slice(0, 12)}`}
              className={classNames(
                "log-line",
                /error|exception|fatal/i.test(line) && "is-error",
                /warn/i.test(line) && "is-warn",
              )}
            >
              <span className="log-index">{String(index + 1).padStart(3, "0")}</span>
              <span className="log-text">{line}</span>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Terminal size={22} />}
            title="No output yet"
            description="Game and launcher logs appear here while an instance is starting or running."
          />
        )}
      </div>
    </Modal>
  );
}

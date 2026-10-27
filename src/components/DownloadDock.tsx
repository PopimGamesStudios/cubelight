import { ArrowDownToLine, X } from "lucide-react";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";
import { ProgressBar } from "./ui";

export function DownloadDock() {
  const modProgress = useApp((state) => state.modProgress);
  const clearModProgress = useApp((state) => state.clearModProgress);

  if (!modProgress.length) return null;

  return (
    <div className="download-dock">
      <header className="download-dock-head">
        <span className="download-dock-title">
          <ArrowDownToLine size={13} />
          Downloads
        </span>
        <span className="download-dock-count">{modProgress.length}</span>
      </header>
      <div className="download-dock-list">
        {modProgress.map((item) => {
          const done = (item.percent ?? 0) >= 100;
          return (
            <div
              key={`${item.instanceId}:${item.projectId}`}
              className={classNames("download-item", done && "is-done")}
            >
              <div className="download-item-head">
                <span className="download-item-title">{item.title}</span>
                <button
                  type="button"
                  aria-label={`Dismiss ${item.title}`}
                  onClick={() => clearModProgress(item.projectId, item.instanceId)}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="download-item-meta">
                <span>{item.stage}</span>
                <span>{item.indeterminate ? "" : `${Math.round(item.percent ?? 0)}%`}</span>
              </div>
              <ProgressBar value={item.percent} indeterminate={item.indeterminate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

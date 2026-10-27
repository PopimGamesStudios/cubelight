import { useEffect, useState } from "react";
import { ArrowDownToLine, Maximize2, Minimize2, Minus, RefreshCw, X } from "lucide-react";
import { api, isDesktop } from "@/lib/api";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";
import { Logo } from "./Logo";

const PAGE_LABELS: Record<string, string> = {
  home: "Dashboard",
  instances: "Instances",
  mods: "Mods & plugins",
  settings: "Settings",
};

export function TitleBar() {
  const page = useApp((state) => state.page);
  const appInfo = useApp((state) => state.appInfo);
  const update = useApp((state) => state.update);
  const maximized = useApp((state) => state.maximized);
  const openSettings = useApp((state) => state.openSettings);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setChecking(update.state === "checking");
  }, [update.state]);

  const isMac = appInfo?.platform === "darwin";
  const showUpdate =
    update.state === "available" ||
    update.state === "downloading" ||
    update.state === "downloaded" ||
    update.state === "checking";

  const updateLabel = () => {
    if (update.state === "checking") return "Checking";
    if (update.state === "downloading") return `Downloading ${Math.round(update.percent ?? 0)}%`;
    if (update.state === "downloaded") return "Restart to update";
    if (update.state === "available") return `Update ${update.version ?? ""}`.trim();
    return "";
  };

  return (
    <header
      className={classNames("titlebar", isMac && "titlebar--mac")}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        void api.window.toggleMaximize();
      }}
    >
      <div className="titlebar-brand">
        <span className="brand-mark">
          <Logo size={17} />
        </span>
        <span className="brand-name">CUBELIGHT</span>
        <span className="brand-version">v{appInfo?.version ?? "1.0.0"}</span>
      </div>

      <div className="titlebar-divider" />

      <div className="titlebar-context">
        <span className="titlebar-dot" />
        {PAGE_LABELS[page] ?? page}
      </div>

      <div className="titlebar-spacer" />

      {!isDesktop ? (
        <span className="preview-pill" title="This browser tab renders the UI with mock data. Run `npm run dev` for the desktop app.">
          Browser preview · mock data
        </span>
      ) : null}

      {showUpdate ? (
        <button
          type="button"
          className={classNames("update-pill", update.state === "downloaded" && "is-ready")}
          onClick={() => openSettings("updates")}
        >
          {update.state === "checking" ? (
            <RefreshCw size={12} className="spin" />
          ) : (
            <ArrowDownToLine size={12} />
          )}
          <span>{updateLabel()}</span>
        </button>
      ) : null}

      {!isMac ? (
        <div className="window-controls">
          <button type="button" aria-label="Minimize" title="Minimize" onClick={() => void api.window.minimize()}>
            <Minus size={15} />
          </button>
          <button
            type="button"
            aria-label={maximized ? "Restore" : "Maximize"}
            title={maximized ? "Restore" : "Maximize"}
            onClick={() => void api.window.toggleMaximize()}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            className="window-close"
            aria-label="Close"
            title="Close"
            onClick={() => void api.window.close()}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {checking ? <span className="sr-only">Checking for updates</span> : null}
    </header>
  );
}

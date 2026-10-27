import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "@/store/app";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { Toasts } from "@/components/Toasts";
import { AccountModal } from "@/components/AccountModal";
import { DownloadDock } from "@/components/DownloadDock";
import { Logo } from "@/components/Logo";
import { HomePage } from "@/pages/HomePage";
import { InstancesPage } from "@/pages/InstancesPage";
import { ModsPage } from "@/pages/ModsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  const ready = useApp((state) => state.ready);
  const page = useApp((state) => state.page);
  const collapsed = useApp((state) => state.settings.appearance.sidebarCollapsed);
  const setOpenMod = useApp((state) => state.setOpenMod);

  useEffect(() => {
    void useApp.getState().init();
  }, []);

  useEffect(() => {
    if (page !== "mods") setOpenMod(null);
  }, [page, setOpenMod]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const map: Record<string, "home" | "instances" | "mods" | "settings"> = {
        "1": "home",
        "2": "instances",
        "3": "mods",
        "4": "settings",
      };
      const next = map[event.key];
      if (next) {
        event.preventDefault();
        useApp.getState().navigate(next);
      }
      if (event.key === ",") {
        event.preventDefault();
        useApp.getState().openSettings();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) {
    return (
      <div className="splash">
        <div className="splash-cube">
          <Logo size={86} />
        </div>
        <span className="splash-brand">CUBELIGHT</span>
        <span className="splash-status">
          <Loader2 size={13} className="spin" />
          Preparing launcher
        </span>
      </div>
    );
  }

  return (
    <div className="app" data-collapsed={collapsed}>
      <TitleBar />
      <div className="shell">
        <Sidebar />
        <main className="content" key={page}>
          {page === "home" ? <HomePage /> : null}
          {page === "instances" ? <InstancesPage /> : null}
          {page === "mods" ? <ModsPage /> : null}
          {page === "settings" ? <SettingsPage /> : null}
        </main>
      </div>
      <Toasts />
      <DownloadDock />
      <AccountModal />
    </div>
  );
}

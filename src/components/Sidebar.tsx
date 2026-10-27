import {
  Blocks,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Settings2,
} from "lucide-react";
import type { AppPage } from "@shared/types";
import { classNames, contrastInk, initials, loaderLabel } from "@/lib/format";
import { useApp } from "@/store/app";
import { Logo } from "./Logo";

const NAV: Array<{ page: AppPage; label: string; icon: typeof LayoutDashboard; group: string }> = [
  { page: "home", label: "Dashboard", icon: LayoutDashboard, group: "Play" },
  { page: "instances", label: "Instances", icon: Boxes, group: "Play" },
  { page: "mods", label: "Mods & plugins", icon: Blocks, group: "Play" },
  { page: "settings", label: "Settings", icon: Settings2, group: "System" },
];

export function Sidebar() {
  const page = useApp((state) => state.page);
  const navigate = useApp((state) => state.navigate);
  const instances = useApp((state) => state.instances);
  const account = useApp((state) => state.account);
  const collapsed = useApp((state) => state.settings.appearance.sidebarCollapsed);
  const toggleSidebar = useApp((state) => state.toggleSidebar);
  const launchInstance = useApp((state) => state.launchInstance);
  const openAccount = useApp((state) => state.openAccount);
  const launchStates = useApp((state) => state.launchStates);

  const recent = [...instances]
    .filter((instance) => instance.kind === "client")
    .sort((a, b) => (b.lastPlayed ?? b.createdAt) - (a.lastPlayed ?? a.createdAt))[0];
  const recentState = recent ? launchStates[recent.id]?.state : undefined;
  const recentBusy = recentState === "running" || recentState === "launching" || recentState === "installing";

  const groups = ["Play", "System"];

  return (
    <aside className={classNames("sidebar", collapsed && "sidebar--collapsed")}>
      {recent ? (
        <button
          type="button"
          className="quick-launch"
          onClick={() => void launchInstance(recent.id)}
          disabled={recentBusy}
          title={`Launch ${recent.name}`}
        >
          <span className="quick-launch-icon" style={{ background: recent.color, color: contrastInk(recent.color) }}>
            <span>{recent.icon}</span>
          </span>
          <span className="quick-launch-copy">
            <span className="quick-launch-label">{recentBusy ? "In progress" : "Continue"}</span>
            <span className="quick-launch-name">{recent.name}</span>
            <span className="quick-launch-meta">
              {recent.mcVersion} · {loaderLabel(recent.loader)}
            </span>
          </span>
          <span className="quick-launch-play">
            <Play size={12} fill="currentColor" />
          </span>
        </button>
      ) : (
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <Logo size={22} />
          </span>
          <span className="sidebar-brand-copy">
            <strong>Cubelight</strong>
            <small>Launch platform</small>
          </span>
        </div>
      )}

      <nav className="nav">
        {groups.map((group) => (
          <div className="nav-group" key={group}>
            <span className="nav-group-label">{group}</span>
            {NAV.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon;
              const active = page === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  className={classNames("nav-item", active && "is-active")}
                  onClick={() => navigate(item.page)}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {item.page === "instances" && instances.length > 0 ? (
                    <span className="nav-badge">{instances.length}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="account-chip" onClick={openAccount} title="Manage account">
          <span className="avatar">
            {account?.avatarUrl ? (
              <img src={account.avatarUrl} alt="" />
            ) : (
              <span>{initials(account?.name ?? "Player")}</span>
            )}
            <span className={classNames("avatar-status", account?.mode === "microsoft" && "is-online")} />
          </span>
          <span className="account-meta">
            <strong>{account?.name ?? "Not signed in"}</strong>
            <small>{account?.mode === "microsoft" ? "Microsoft account" : "Offline profile"}</small>
          </span>
          <ChevronRight size={14} className="account-chevron" />
        </button>

        <button
          type="button"
          className="sidebar-collapse"
          onClick={toggleSidebar}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className="nav-label">Collapse</span>
        </button>

        <div className="sidebar-legal">
          <span>OPEN SOURCE</span>
          <span className="sidebar-legal-dot" />
          <span>MIT</span>
        </div>
      </div>
    </aside>
  );
}

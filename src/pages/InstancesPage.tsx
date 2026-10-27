import { useMemo, useState } from "react";
import { Boxes, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Instance } from "@shared/types";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";
import { InstanceCard } from "@/components/InstanceCard";
import { InstanceModal } from "@/components/InstanceModal";
import { LogModal } from "@/components/LogModal";
import { Button, ConfirmDialog, EmptyState, Segmented, Select } from "@/components/ui";

type Filter = "all" | "client" | "server";
type Sort = "recent" | "name" | "created" | "memory";

export function InstancesPage() {
  const instances = useApp((state) => state.instances);
  const removeInstance = useApp((state) => state.removeInstance);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instance | null>(null);
  const [logsFor, setLogsFor] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState<Instance | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = instances.filter((instance) => {
      if (filter !== "all" && instance.kind !== filter) return false;
      if (!needle) return true;
      return (
        instance.name.toLowerCase().includes(needle) ||
        instance.mcVersion.toLowerCase().includes(needle) ||
        instance.loader.toLowerCase().includes(needle)
      );
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "memory") return b.memoryMb - a.memoryMb;
      return (b.lastPlayed ?? b.createdAt) - (a.lastPlayed ?? a.createdAt);
    });
  }, [instances, filter, query, sort]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (instance: Instance) => {
    setEditing(instance);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await removeInstance(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page page--instances">
      <header className="page-head">
        <div>
          <span className="eyebrow">Library</span>
          <h1 className="page-title">Instances</h1>
          <p className="page-sub">
            Isolated Minecraft installations. Each one keeps its own versions, mods, worlds and settings.
          </p>
        </div>
        <div className="page-head-actions">
          <Button variant="primary" icon={<Plus size={14} />} onClick={openCreate}>
            New instance
          </Button>
        </div>
      </header>

      <div className="toolbar">
        <Segmented
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter instances"
          options={[
            { value: "all", label: `All ${instances.length}` },
            { value: "client", label: `Clients ${instances.filter((item) => item.kind === "client").length}` },
            { value: "server", label: `Servers ${instances.filter((item) => item.kind === "server").length}` },
          ]}
        />
        <div className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search instances…"
            aria-label="Search instances"
            spellCheck={false}
          />
        </div>
        <div className="toolbar-spacer" />
        <Select
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          ariaLabel="Sort instances"
          options={[
            { value: "recent", label: "Recently played" },
            { value: "name", label: "Name A–Z" },
            { value: "created", label: "Newest" },
            { value: "memory", label: "Most memory" },
          ]}
        />
        <span className="toolbar-count">
          <SlidersHorizontal size={12} />
          {filtered.length} shown
        </span>
      </div>

      {instances.length === 0 ? (
        <div className="empty-panel">
          <EmptyState
            icon={<Boxes size={26} />}
            title="Your library is empty"
            description="Create a client instance to play, or a server instance to manage plugins and folders."
            action={
              <Button variant="primary" icon={<Plus size={14} />} onClick={openCreate}>
                Create an instance
              </Button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className={classNames("empty-panel", "empty-panel--slim")}>
          <EmptyState
            icon={<Search size={22} />}
            title="No matching instances"
            description="Try a different filter or clear the search."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="instance-grid">
          {filtered.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onEdit={openEdit}
              onDelete={setDeleting}
              onLogs={setLogsFor}
            />
          ))}
        </div>
      )}

      <InstanceModal open={modalOpen} instance={editing} onClose={() => setModalOpen(false)} />
      <LogModal instance={logsFor} open={Boolean(logsFor)} onClose={() => setLogsFor(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name ?? "instance"}?`}
        message={
          <>
            This removes the instance folder and everything inside it, including worlds and installed mods. This cannot
            be undone.
          </>
        }
        confirmLabel="Delete instance"
        danger
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, History, Redo2, Undo2, Upload } from "lucide-react";

import type { AppDefinition } from "@bettertool/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useApp, useUpdateApp } from "@/lib/queries";

import { AppEditor, useAppEditorStore, useEditorHistory } from "@/editor/AppEditor";
import { exportAppDefinition, importAppDefinition } from "@/editor/import-export";
import { RevisionsDialog } from "@/editor/RevisionsDialog";
import { useEditorStore } from "@/editor/editor-store";

function definitionEqual(a: AppDefinition, b: AppDefinition): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function AppEditorPageInner({ appId }: { appId: string }) {
  const { data: app, isLoading, isError, error } = useApp(appId);
  const updateApp = useUpdateApp();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  const store = useAppEditorStore(app?.definition);
  const history = useEditorHistory(store);

  // Track the last saved definition to compute dirty state. The working
  // definition is the live store state; we subscribe so the dirty flag
  // updates as the user edits.
  const lastSavedRef = useRef<AppDefinition | null>(null);
  const workingDefinition = useEditorStore(store, (s) => s.definition);
  const [dirtyTick, forceDirty] = useState(0);

  useEffect(() => {
    if (app?.definition) {
      // The store normalizes the incoming definition; mirror that for the
      // baseline so we compare apples to apples.
      lastSavedRef.current = store.getState().definition;
      history.reset(store.getState().definition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  useEffect(() => {
    if (app) setName(app.name);
  }, [app]);

  const isDirty = useMemo(() => {
    const saved = lastSavedRef.current;
    if (!saved) return false;
    return !definitionEqual(saved, workingDefinition);
  }, [workingDefinition, dirtyTick]);

  useEffect(() => {
    if (isDirty) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [isDirty]);

  const handleSaveName = async () => {
    if (!appId || !app) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === app.name) {
      setEditingName(false);
      setName(app.name);
      return;
    }
    try {
      await updateApp.mutateAsync({ id: appId, name: trimmed });
      toast.success("Name updated");
    } catch (err) {
      toast.error("Failed to update name", { description: (err as Error).message });
    } finally {
      setEditingName(false);
    }
  };

  const handleSaveDefinition = async () => {
    if (!appId || !app) return;
    try {
      const definition = store.getState().definition;
      await updateApp.mutateAsync({ id: appId, definition });
      lastSavedRef.current = definition;
      forceDirty((n) => n + 1);
      toast.success("Saved");
    } catch (err) {
      toast.error("Failed to save", { description: (err as Error).message });
    }
  };

  // Keyboard shortcuts: undo/redo, save, delete, duplicate.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      const editing = tag === "input" || tag === "textarea" || tag === "select" || (document.activeElement as HTMLElement)?.isContentEditable;

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveDefinition();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const sel = store.getState().selectedComponentId;
        if (sel) store.getState().duplicateComponent(sel);
        return;
      }
      if (mod && e.key.toLowerCase() !== "z") return;
      if ((e.key === "Delete" || e.key === "Backspace") && !editing) {
        const sel = store.getState().selectedComponentId;
        if (sel) store.getState().removeComponent(sel);
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        history.redo();
      } else {
        e.preventDefault();
        history.undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, handleSaveDefinition, store]);

  const handleExport = useCallback(() => {
    const definition = store.getState().definition;
    const safeName = (app?.name ?? "app").replace(/[^a-z0-9-_]+/gi, "_");
    exportAppDefinition(definition, `${safeName}.bettertool.json`);
  }, [store, app?.name]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input so selecting the same file again re-triggers.
      e.target.value = "";
      if (!file) return;
      try {
        const imported = await importAppDefinition(file);
        store.getState().replaceDefinition(imported);
        lastSavedRef.current = imported;
        history.reset(imported);
        forceDirty((n) => n + 1);
        toast.success("App imported");
      } catch (err) {
        toast.error("Import failed", { description: (err as Error).message });
      }
    },
    [store, history],
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const handleRestoreRevision = useCallback(
    (def: AppDefinition) => {
      // Restoring an old revision makes the working definition dirty vs the
      // last save — intentionally do NOT update lastSavedRef, so the user
      // must Save to persist the restored version.
      store.getState().replaceDefinition(def);
      history.reset(def);
      forceDirty((n) => n + 1);
    },
    [store, history],
  );

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading app...</div>;
  }
  if (isError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load app: {(error as Error).message}
      </div>
    );
  }
  if (!app) {
    return <div className="py-12 text-center text-muted-foreground">App not found</div>;
  }

  const saving = updateApp.isPending;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/apps">
              <ArrowLeft />
              Back to apps
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          {editingName ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setName(app.name);
                }
              }}
              autoFocus
              className="h-8 max-w-xs"
            />
          ) : (
            <button
              className="text-lg font-semibold tracking-tight hover:underline"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {app.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={history.undo}
            disabled={!history.canUndo}
            title="Undo (Cmd/Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={history.redo}
            disabled={!history.canRedo}
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={handleImportClick} title="Import app definition">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} title="Export app definition">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            title="Revision history"
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/apps/${app.id}`}>
              <Eye />
              View
            </Link>
          </Button>
          <Button size="sm" onClick={handleSaveDefinition} disabled={saving || !isDirty}>
            {saving ? "Saving..." : isDirty ? "Save" : "Saved"}
          </Button>
          {isDirty && !saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <RevisionsDialog
        appId={appId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestore={handleRestoreRevision}
      />

      <AppEditor store={store} />
    </div>
  );
}

export function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  if (!appId) {
    return <div className="py-12 text-center text-muted-foreground">No app id.</div>;
  }
  return <AppEditorPageInner appId={appId} />;
}

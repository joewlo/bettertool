import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";

import type { EngineState } from "@bettertool/reactive";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Runtime } from "@/lowcode/Runtime";
import { cn } from "@/lib/utils";

import { EditorNodeWrapper } from "./EditorNodeWrapper";
import { useEditorStore, type EditorStore } from "./editor-store";

function CanvasRoot({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root", data: { type: "root" } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[60vh] flex-1 flex-col gap-3 rounded-lg border border-dashed p-4 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

function PageTabs({ store }: { store: EditorStore }) {
  const definition = useEditorStore(store, (s) => s.definition);
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5">
      {definition.pages.map((p) => (
        <div
          key={p.id}
          className={cn(
            "group flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs",
            p.id === currentPageId
              ? "bg-accent font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          {editingId === p.id ? (
            <Input
              autoFocus
              className="h-6 w-28 px-1 text-xs"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                store.getState().renamePage(p.id, draftName.trim() || p.name);
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  store.getState().renamePage(p.id, draftName.trim() || p.name);
                  setEditingId(null);
                }
                if (e.key === "Escape") setEditingId(null);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => store.getState().setCurrentPage(p.id)}
              onDoubleClick={() => {
                setEditingId(p.id);
                setDraftName(p.name);
              }}
            >
              {p.name}
            </button>
          )}
          {definition.pages.length > 1 && (
            <button
              type="button"
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={() => store.getState().removePage(p.id)}
              aria-label="Remove page"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2"
        onClick={() => {
          const n = definition.pages.length + 1;
          store.getState().addPage(`Page ${n}`);
        }}
      >
        <Plus />
        Page
      </Button>
    </div>
  );
}

export function EditorCanvas({ store, onEngine }: { store: EditorStore; onEngine?: (engine: EngineState) => void }) {
  const definition = useEditorStore(store, (s) => s.definition);
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);
  const selectedComponentId = useEditorStore(store, (s) => s.selectedComponentId);

  const page = definition.pages.find((p) => p.id === currentPageId) ?? null;

  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No page. Create one to start building.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageTabs store={store} />
      <ScrollArea className="flex-1">
        <div className="p-4">
          <CanvasRoot>
            {page.components.length === 0 ? (
              <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
                Drag a component from the left panel to start building.
              </div>
            ) : (
              <Runtime
                key={page.id}
                definition={definition}
                page={page}
                mode="edit"
                nodeWrapper={EditorNodeWrapper}
                selectedId={selectedComponentId}
                onSelect={(id) => store.getState().selectComponent(id)}
                onRemove={(id) => store.getState().removeComponent(id)}
                onEngine={onEngine}
              />
            )}
          </CanvasRoot>
        </div>
      </ScrollArea>
    </div>
  );
}

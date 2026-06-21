import { DndContext } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { AppDefinition } from "@bettertool/shared";
import type { EngineState } from "@bettertool/reactive";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ComponentPalette } from "./ComponentPalette";
import { BindingDebuggerPanel } from "./BindingDebuggerPanel";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { QueriesPanel } from "./QueriesPanel";
import { useCanvasDnd } from "./dnd-utils";
import { createEditorStore, useEditorStore, type EditorStore } from "./editor-store";
import { History } from "./undo";

export function AppEditor({ store }: { store: EditorStore }) {
  const { sensors, onDragEnd, collisionDetection } = useCanvasDnd(store);
  const [engine, setEngine] = useState<EngineState | null>(null);

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={collisionDetection}>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col border-r">
          <Tabs defaultValue="components" className="flex flex-1 flex-col overflow-hidden">
            <div className="px-3 pt-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="queries">Queries</TabsTrigger>
                <TabsTrigger value="debug">Debug</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="components" className="mt-3 min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 pt-0">
                  <ComponentPalette />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="queries" className="mt-3 min-h-0 flex-1 overflow-hidden">
              <QueriesPanel store={store} />
            </TabsContent>
            <TabsContent value="debug" className="mt-3 min-h-0 flex-1 overflow-hidden">
              <BindingDebuggerPanel store={store} engine={engine} />
            </TabsContent>
          </Tabs>
        </aside>

        <EditorCanvas store={store} onEngine={setEngine} />

        <aside className="flex w-80 shrink-0 flex-col border-l">
          <div className="border-b px-3 py-2 text-sm font-semibold">Inspector</div>
          <Separator />
          <div className="min-h-0 flex-1">
            <Inspector store={store} engine={engine} />
          </div>
        </aside>
      </div>
    </DndContext>
  );
}

export function useAppEditorStore(definition: unknown): EditorStore {
  return useMemo(() => createEditorStore(definition), [definition]);
}

export function useEditorDefinition(store: EditorStore): AppDefinition {
  return useEditorStore(store, (s) => s.definition);
}

export interface EditorHistory {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (def: AppDefinition) => void;
}

export function useEditorHistory(store: EditorStore): EditorHistory {
  const historyRef = useRef<History<AppDefinition> | null>(null);
  if (historyRef.current === null) {
    historyRef.current = new History(store.getState().definition);
  }
  const history = historyRef.current;

  const applyingRef = useRef(false);
  const lastDefRef = useRef<AppDefinition>(store.getState().definition);
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    return store.subscribe((s) => {
      const prev = lastDefRef.current;
      const next = s.definition;
      if (prev === next) return;
      lastDefRef.current = next;
      if (applyingRef.current) {
        // Undo/redo drove this change — sync present without pushing.
        history.replacePresent(next);
      } else {
        const sel = s.selectedComponentId;
        history.set(next, { coalesce: true, coalesceKey: sel ? `edit:${sel}` : undefined });
      }
      force();
    });
  }, [store, history]);

  const undo = useCallback(() => {
    const prev = history.undo();
    if (prev !== null) {
      applyingRef.current = true;
      store.getState().replaceDefinition(prev);
      applyingRef.current = false;
      force();
    }
  }, [history, store]);

  const redo = useCallback(() => {
    const next = history.redo();
    if (next !== null) {
      applyingRef.current = true;
      store.getState().replaceDefinition(next);
      applyingRef.current = false;
      force();
    }
  }, [history, store]);

  const reset = useCallback(
    (def: AppDefinition) => {
      history.reset(def);
      lastDefRef.current = def;
      applyingRef.current = false;
      force();
    },
    [history],
  );

  return { undo, redo, canUndo: history.canUndo(), canRedo: history.canRedo(), reset };
}

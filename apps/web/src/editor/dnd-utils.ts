import { type DragEndEvent, useSensor, useSensors, PointerSensor, pointerWithin } from "@dnd-kit/core";

import type { ComponentNode } from "@bettertool/shared";

import { findComponentParent, type EditorStore } from "./editor-store";

function findNodeById(components: unknown[], id: string): ComponentNode | undefined {
  for (const n of components as ComponentNode[]) {
    if (n.id === id) return n;
    const f = findNodeById(n.children, id);
    if (f) return f;
  }
  return undefined;
}

function containsId(components: unknown[], id: string): boolean {
  for (const n of components as ComponentNode[]) {
    if (n.id === id) return true;
    if (containsId(n.children, id)) return true;
  }
  return false;
}

function isDescendant(components: unknown[], ancestorId: string, targetId: string): boolean {
  const ancestor = findNodeById(components, ancestorId);
  if (!ancestor) return false;
  return containsId(ancestor.children, targetId);
}

function resolveDropTarget(
  overId: string,
  components: unknown[],
): { parentId: string | null; index: number | undefined } {
  if (overId === "root") return { parentId: null, index: undefined };
  if (overId.startsWith("container-")) {
    return { parentId: overId.slice("container-".length), index: undefined };
  }
  const parent = findComponentParent(components, overId);
  if (parent) return { parentId: parent.parent?.id ?? null, index: parent.index };
  return { parentId: null, index: undefined };
}

export function useCanvasDnd(store: EditorStore) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    if (overId === activeId) return;

    const state = store.getState();
    const page = state.definition.pages.find((p) => p.id === state.currentPageId);
    if (!page) return;

    const target = resolveDropTarget(overId, page.components);
    const activeData = active.data.current as
      | { source?: string; componentType?: string }
      | undefined;

    if (activeId.startsWith("palette-") || activeData?.source === "palette") {
      const componentType = activeData?.componentType ?? activeId.replace(/^palette-/, "");
      state.addComponent(componentType, target.parentId, target.index);
      return;
    }

    if (target.parentId === activeId) return;
    if (target.parentId && isDescendant(page.components, activeId, target.parentId)) return;
    state.moveComponent(activeId, target.parentId, target.index ?? 0);
  }

  return { sensors, onDragEnd, collisionDetection: pointerWithin };
}

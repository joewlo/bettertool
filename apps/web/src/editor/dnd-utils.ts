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

// A parent lays out children horizontally only when it is a container whose
// direction prop is "row". Root and column containers are vertical.
function parentIsHorizontal(components: unknown[], parentId: string | null): boolean {
  if (parentId === null) return false;
  const parent = findNodeById(components, parentId);
  if (!parent) return false;
  return parent.props.direction === "row";
}

// Compute a precise drop target when `over` is a real component (sortable).
// Determines insert-before vs insert-after by comparing the dragged item's
// translated rect center to the over item's rect center along the parent's
// primary axis. For moves within the same parent, the active node's removal
// shifts later siblings left by one, so we compensate the computed index.
function resolveSortableTarget(
  e: DragEndEvent,
  overId: string,
  components: unknown[],
  isPalette: boolean,
  activeId: string,
): { parentId: string | null; index: number | undefined } {
  const parentInfo = findComponentParent(components, overId);
  if (!parentInfo) return { parentId: null, index: undefined };
  const { parent, index: overIdx } = parentInfo;
  const parentId = parent?.id ?? null;
  const horizontal = parentIsHorizontal(components, parentId);

  const overRect = e.over?.rect;
  const activeRect = e.active.rect.current.translated;
  let before = true;
  if (overRect && activeRect) {
    if (horizontal) {
      const overCenter = overRect.left + overRect.width / 2;
      const activeCenter = activeRect.left + activeRect.width / 2;
      before = activeCenter < overCenter;
    } else {
      const overCenter = overRect.top + overRect.height / 2;
      const activeCenter = activeRect.top + activeRect.height / 2;
      before = activeCenter < overCenter;
    }
  }

  let insertIdx = before ? overIdx : overIdx + 1;

  if (!isPalette) {
    const activeParent = findComponentParent(components, activeId);
    if (activeParent && (activeParent.parent?.id ?? null) === parentId) {
      const activeIdx = activeParent.index;
      if (activeIdx < overIdx) insertIdx -= 1;
    }
  }

  if (insertIdx < 0) insertIdx = 0;
  return { parentId, index: insertIdx };
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

    const activeData = active.data.current as
      | { source?: string; componentType?: string }
      | undefined;
    const isPalette = activeId.startsWith("palette-") || activeData?.source === "palette";

    let target: { parentId: string | null; index: number | undefined };
    if (overId === "root") {
      target = { parentId: null, index: undefined };
    } else if (overId.startsWith("container-")) {
      target = { parentId: overId.slice("container-".length), index: undefined };
    } else {
      target = resolveSortableTarget(e, overId, page.components, isPalette, activeId);
    }

    if (isPalette) {
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

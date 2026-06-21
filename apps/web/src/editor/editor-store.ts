import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand/react";

import {
  appDefinitionSchema,
  type AppDefinition,
  type ComponentNode,
  type Event,
  type Page,
  type QueryRuntime,
} from "@bettertool/shared";

import { getComponentDefinition } from "@/lowcode/registry";

export interface EditorState {
  definition: AppDefinition;
  currentPageId: string | null;
  selectedComponentId: string | null;
  selectedQueryId: string | null;
  setCurrentPage: (pageId: string) => void;
  selectComponent: (id: string | null) => void;
  selectQuery: (id: string | null) => void;
  addComponent: (type: string, parentId?: string | null, index?: number) => string | null;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, newParentId: string | null, index: number) => void;
  updateComponentProps: (id: string, props: Record<string, unknown>) => void;
  updateComponentLayout: (id: string, layout: Partial<ComponentNode["layout"]>) => void;
  updateComponentEvents: (id: string, events: Event[]) => void;
  renameComponent: (id: string, name: string) => void;
  addPage: (name: string) => string;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  addQuery: (pageId: string, query: QueryRuntime) => void;
  updateQuery: (pageId: string, queryId: string, patch: Partial<QueryRuntime>) => void;
  removeQuery: (pageId: string, queryId: string) => void;
  replaceDefinition: (definition: AppDefinition) => void;
}

export type EditorStore = StoreApi<EditorState>;

function normalizeDefinition(def: unknown): AppDefinition {
  if (def && typeof def === "object") {
    const parsed = appDefinitionSchema.safeParse(def);
    if (parsed.success) return parsed.data;
  }
  return { version: 1, pages: [] };
}

function findNode(components: unknown[], id: string): ComponentNode | undefined {
  for (const n of components as ComponentNode[]) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return undefined;
}

function findParent(
  components: unknown[],
  id: string,
): { parent: ComponentNode | null; index: number } | undefined {
  const nodes = components as ComponentNode[];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.id === id) return { parent: null, index: i };
    const found = findParent(n.children, id);
    if (found) return found;
  }
  return undefined;
}

function removeNode(components: unknown[], id: string): ComponentNode[] {
  const out: ComponentNode[] = [];
  for (const n of components as ComponentNode[]) {
    if (n.id === id) continue;
    out.push({ ...n, children: removeNode(n.children, id) });
  }
  return out;
}

function insertIntoParent(
  components: unknown[],
  parentId: string | null,
  node: ComponentNode,
  index: number | undefined,
): ComponentNode[] {
  if (parentId === null) {
    const arr = [...(components as ComponentNode[])];
    const idx = index === undefined ? arr.length : Math.max(0, Math.min(index, arr.length));
    arr.splice(idx, 0, node);
    return arr;
  }
  return (components as ComponentNode[]).map((n) => ({
    ...n,
    children:
      n.id === parentId
        ? insertIntoParent(n.children, null, node, index)
        : insertIntoParent(n.children, parentId, node, index),
  }));
}

function updateNode(
  components: unknown[],
  id: string,
  fn: (n: ComponentNode) => ComponentNode,
): ComponentNode[] {
  return (components as ComponentNode[]).map((n) =>
    n.id === id ? fn(n) : { ...n, children: updateNode(n.children, id, fn) },
  );
}

function updatePage(definition: AppDefinition, pageId: string, fn: (p: Page) => Page): AppDefinition {
  return { ...definition, pages: definition.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

function makeComponentNode(type: string): ComponentNode {
  const def = getComponentDefinition(type);
  const id = crypto.randomUUID();
  return {
    id,
    type,
    name: def?.displayName ?? type,
    props: { ...(def?.defaultProps ?? {}) },
    layout: def?.defaultLayout ?? { width: "grow", align: "stretch" },
    events: [],
    children: [],
  };
}

export function createEditorStore(initialDefinition: unknown): EditorStore {
  let definition = normalizeDefinition(initialDefinition);
  if (definition.pages.length === 0) {
    const pageId = crypto.randomUUID();
    definition = {
      version: 1,
      pages: [{ id: pageId, name: "Page 1", queries: [], components: [] }],
    };
  }
  const currentPageId = definition.pages[0]!.id;

  return createStore<EditorState>((set, get) => ({
    definition,
    currentPageId,
    selectedComponentId: null,
    selectedQueryId: null,

    setCurrentPage: (pageId) =>
      set({ currentPageId: pageId, selectedComponentId: null, selectedQueryId: null }),

    selectComponent: (id) => set({ selectedComponentId: id }),

    selectQuery: (id) => set({ selectedQueryId: id }),

    addComponent: (type, parentId = null, index) => {
      const node = makeComponentNode(type);
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        const components = insertIntoParent(page.components, parentId, node, index);
        return {
          definition: updatePage(s.definition, page.id, (p) => ({ ...p, components })),
          selectedComponentId: node.id,
        };
      });
      return node.id;
    },

    removeComponent: (id) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        return {
          definition: updatePage(s.definition, page.id, (p) => ({
            ...p,
            components: removeNode(p.components, id),
          })),
          selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
        };
      }),

    moveComponent: (id, newParentId, index) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        const node = findNode(page.components, id);
        if (!node) return {};
        if (newParentId !== null) {
          const target = findNode(page.components, newParentId);
          if (target && target.id === id) return {};
        }
        const without = removeNode(page.components, id);
        const components = insertIntoParent(without, newParentId, node, index);
        return { definition: updatePage(s.definition, page.id, (p) => ({ ...p, components })) };
      }),

    updateComponentProps: (id, props) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        return {
          definition: updatePage(s.definition, page.id, (p) => ({
            ...p,
            components: updateNode(p.components, id, (n) => ({ ...n, props: { ...n.props, ...props } })),
          })),
        };
      }),

    updateComponentLayout: (id, layout) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        return {
          definition: updatePage(s.definition, page.id, (p) => ({
            ...p,
            components: updateNode(p.components, id, (n) => ({ ...n, layout: { ...n.layout, ...layout } })),
          })),
        };
      }),

    updateComponentEvents: (id, events) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        return {
          definition: updatePage(s.definition, page.id, (p) => ({
            ...p,
            components: updateNode(p.components, id, (n) => ({ ...n, events })),
          })),
        };
      }),

    renameComponent: (id, name) =>
      set((s) => {
        const page = s.definition.pages.find((p) => p.id === s.currentPageId);
        if (!page) return {};
        return {
          definition: updatePage(s.definition, page.id, (p) => ({
            ...p,
            components: updateNode(p.components, id, (n) => ({ ...n, name })),
          })),
        };
      }),

    addPage: (name) => {
      const id = crypto.randomUUID();
      set((s) => ({
        definition: {
          ...s.definition,
          pages: [...s.definition.pages, { id, name, queries: [], components: [] }],
        },
        currentPageId: id,
        selectedComponentId: null,
        selectedQueryId: null,
      }));
      return id;
    },

    removePage: (id) =>
      set((s) => {
        if (s.definition.pages.length <= 1) return {};
        const pages = s.definition.pages.filter((p) => p.id !== id);
        const currentPageId =
          s.currentPageId === id ? (pages[0]?.id ?? null) : s.currentPageId;
        return { definition: { ...s.definition, pages }, currentPageId };
      }),

    renamePage: (id, name) =>
      set((s) => ({
        definition: {
          ...s.definition,
          pages: s.definition.pages.map((p) => (p.id === id ? { ...p, name } : p)),
        },
      })),

    addQuery: (pageId, query) =>
      set((s) => ({
        definition: updatePage(s.definition, pageId, (p) => ({
          ...p,
          queries: [...p.queries, query],
        })),
        selectedQueryId: query.id,
      })),

    updateQuery: (pageId, queryId, patch) =>
      set((s) => ({
        definition: updatePage(s.definition, pageId, (p) => ({
          ...p,
          queries: p.queries.map((q) => (q.id === queryId ? { ...q, ...patch } : q)),
        })),
      })),

    removeQuery: (pageId, queryId) =>
      set((s) => ({
        definition: updatePage(s.definition, pageId, (p) => ({
          ...p,
          queries: p.queries.filter((q) => q.id !== queryId),
        })),
        selectedQueryId: s.selectedQueryId === queryId ? null : s.selectedQueryId,
      })),

    replaceDefinition: (definition) => {
      const normalized = normalizeDefinition(definition);
      const firstPageId = normalized.pages[0]?.id ?? null;
      set({
        definition: normalized,
        currentPageId: firstPageId,
        selectedComponentId: null,
        selectedQueryId: null,
      });
    },
  }));
}

export function useEditorStore<T>(store: EditorStore, selector: (s: EditorState) => T): T {
  return useStore(store, selector);
}

export function findComponentNode(
  components: unknown[],
  id: string,
): ComponentNode | undefined {
  return findNode(components, id);
}

export function findComponentParent(
  components: unknown[],
  id: string,
): { parent: ComponentNode | null; index: number } | undefined {
  return findParent(components, id);
}

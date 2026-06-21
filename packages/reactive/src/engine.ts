import { createStore, type StoreApi } from "zustand/vanilla";
import type { ComponentNode } from "@bettertool/shared";
import { parseBinding } from "./binding.js";
import { createSandbox, type Sandbox } from "./sandbox.js";
import type { BindingResult, ComponentState, ModelSnapshot, QueryState } from "./types.js";

export interface EngineState {
  model: ModelSnapshot;
  results: Record<string, BindingResult>;
  errors: Record<string, string>;
  subscribe: (listener: (s: EngineState) => void) => () => void;
  setQueryState: (name: string, state: Partial<QueryState>) => void;
  setComponentState: (componentId: string, property: string, value: unknown) => void;
  setComponentStateBatch: (componentId: string, values: Record<string, unknown>) => void;
  setGlobals: (g: Record<string, unknown>) => void;
  runBindings: (components: ComponentNode[]) => Promise<void>;
  runBinding: (componentId: string, prop: string, raw: unknown) => Promise<BindingResult>;
  getQueryState: (name: string) => QueryState | undefined;
  getComponentState: (componentId: string) => ComponentState | undefined;
  dispose: () => void;
}

const DEFAULT_QUERY_STATE: QueryState = {
  data: undefined,
  isFetching: false,
  error: null,
  lastRun: null,
};

async function forEachComponent(
  components: ComponentNode[],
  fn: (c: ComponentNode) => Promise<void>,
): Promise<void> {
  for (const c of components) {
    await fn(c);
    if (c.children && c.children.length > 0) {
      await forEachComponent(c.children, fn);
    }
  }
}

export function createEngine(initialModel?: Partial<ModelSnapshot>): EngineState {
  const sandbox: Sandbox = createSandbox();

  const initial: ModelSnapshot = {
    queries: initialModel?.queries ?? {},
    components: initialModel?.components ?? {},
    globals: initialModel?.globals ?? {},
  };

  let store: StoreApi<EngineState>;
  store = createStore<EngineState>((set, get) => ({
    model: initial,
    results: {},
    errors: {},
    subscribe: (listener) => store.subscribe((s) => listener(s)),

    setQueryState: (name, state) =>
      set((s) => {
        const prev = s.model.queries[name] ?? DEFAULT_QUERY_STATE;
        return {
          model: {
            ...s.model,
            queries: { ...s.model.queries, [name]: { ...prev, ...state } },
          },
        };
      }),

    setComponentState: (componentId, property, value) =>
      set((s) => {
        const prev = s.model.components[componentId] ?? {};
        return {
          model: {
            ...s.model,
            components: {
              ...s.model.components,
              [componentId]: { ...prev, [property]: value },
            },
          },
        };
      }),

    setComponentStateBatch: (componentId, values) =>
      set((s) => {
        const prev = s.model.components[componentId] ?? {};
        return {
          model: {
            ...s.model,
            components: {
              ...s.model.components,
              [componentId]: { ...prev, ...values },
            },
          },
        };
      }),

    setGlobals: (g) =>
      set((s) => ({ model: { ...s.model, globals: { ...s.model.globals, ...g } } })),

    runBindings: async (components) => {
      const { model } = get();
      const results: Record<string, BindingResult> = {};
      const errors: Record<string, string> = {};
      await forEachComponent(components, async (component) => {
        for (const [prop, raw] of Object.entries(component.props)) {
          const binding = parseBinding(raw);
          const result = await sandbox.evalBinding(binding, model);
          const key = `${component.id}.${prop}`;
          results[key] = result;
          if (result.error) {
            errors[key] = result.error;
          }
        }
      });
      set({ results, errors });
    },

    runBinding: async (componentId, prop, raw) => {
      const { model } = get();
      const binding = parseBinding(raw);
      const result = await sandbox.evalBinding(binding, model);
      const key = `${componentId}.${prop}`;
      set((s) => {
        const nextErrors = { ...s.errors };
        if (result.error) {
          nextErrors[key] = result.error;
        } else {
          delete nextErrors[key];
        }
        return {
          results: { ...s.results, [key]: result },
          errors: nextErrors,
        };
      });
      return result;
    },

    getQueryState: (name) => get().model.queries[name],

    getComponentState: (componentId) => get().model.components[componentId],

    dispose: () => {
      sandbox.dispose();
    },
  }));

  // Forward property reads to the latest store state so that `engine.results`,
  // `engine.model`, etc. always reflect the current state, while the methods
  // (arrow functions closing over set/get) remain stable across updates.
  const liveState: EngineState = new Proxy(
    {} as EngineState,
    {
      get: (_target, prop) =>
        Reflect.get(
          store.getState() as unknown as Record<PropertyKey, unknown>,
          prop,
        ),
    },
  ) as EngineState;

  return liveState;
}

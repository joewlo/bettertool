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
  setVariable: (name: string, value: unknown) => void;
  setGlobals: (g: Record<string, unknown>) => void;
  runBindings: (components: ComponentNode[]) => Promise<void>;
  runAffectedBindings: () => Promise<void>;
  runBinding: (componentId: string, prop: string, raw: unknown) => Promise<BindingResult>;
  getQueryState: (name: string) => QueryState | undefined;
  getComponentState: (componentId: string) => ComponentState | undefined;
  getVariable: (name: string) => unknown;
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

function splitBindingKey(key: string): { componentId: string; prop: string } {
  const i = key.indexOf(".");
  return { componentId: key.slice(0, i), prop: key.slice(i + 1) };
}

// A binding dependency `dep` is affected by a changed model path `changed`
// when one is a prefix of the other (or they're equal): this covers both "a
// shallower object was replaced" (dep starts with changed + ".") and "a deeper
// child of a read object changed" (changed starts with dep + ".").
function pathIntersects(dep: string, changed: string): boolean {
  if (dep === changed) return true;
  if (dep.startsWith(changed + ".")) return true;
  if (changed.startsWith(dep + ".")) return true;
  return false;
}

function flattenComponentTree(components: ComponentNode[]): Map<string, ComponentNode> {
  const out = new Map<string, ComponentNode>();
  const walk = (nodes: ComponentNode[]) => {
    for (const n of nodes) {
      out.set(n.id, n);
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(components);
  return out;
}

export function createEngine(initialModel?: Partial<ModelSnapshot>): EngineState {
  const sandbox: Sandbox = createSandbox();

  const initial: ModelSnapshot = {
    queries: initialModel?.queries ?? {},
    components: initialModel?.components ?? {},
    globals: initialModel?.globals ?? {},
    variables: initialModel?.variables ?? {},
  };

  // Fine-grained dependency tracking state. These closure variables persist
  // across calls and are captured by the store methods below; they live outside
  // the store state so the live Proxy doesn't need to expose them.
  let changedPaths = new Set<string>();
  let depMap = new Map<string, string[]>();
  let lastComponents = new Map<string, ComponentNode>();

  function recordChanged(path: string): void {
    changedPaths.add(path);
  }

  let store: StoreApi<EngineState>;
  store = createStore<EngineState>((set, get) => ({
    model: initial,
    results: {},
    errors: {},
    subscribe: (listener) => store.subscribe((s) => listener(s)),

    setQueryState: (name, state) => {
      recordChanged(`queries.${name}`);
      for (const key of Object.keys(state)) {
        recordChanged(`queries.${name}.${key}`);
      }
      set((s) => {
        const prev = s.model.queries[name] ?? DEFAULT_QUERY_STATE;
        return {
          model: {
            ...s.model,
            queries: { ...s.model.queries, [name]: { ...prev, ...state } },
          },
        };
      });
    },

    setComponentState: (componentId, property, value) => {
      recordChanged(`components.${componentId}.${property}`);
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
      });
    },

    setComponentStateBatch: (componentId, values) => {
      for (const key of Object.keys(values)) {
        recordChanged(`components.${componentId}.${key}`);
      }
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
      });
    },

    setGlobals: (g) => {
      recordChanged(`globals`);
      for (const key of Object.keys(g)) {
        recordChanged(`globals.${key}`);
      }
      set((s) => ({ model: { ...s.model, globals: { ...s.model.globals, ...g } } }));
    },

    setVariable: (name, value) => {
      recordChanged(`variables.${name}`);
      set((s) => ({
        model: {
          ...s.model,
          variables: { ...s.model.variables, [name]: value },
        },
      }));
    },

    getVariable: (name) => get().model.variables[name],

    runBindings: async (components) => {
      // Full re-evaluation: rebuild the dependency map + component index and
      // supersede any accumulated incremental changes. Used when the component
      // tree itself changes (props edited, components added/removed).
      changedPaths.clear();
      const { model } = get();
      const results: Record<string, BindingResult> = {};
      const errors: Record<string, string> = {};
      const nextDepMap = new Map<string, string[]>();
      const nextComponents = flattenComponentTree(components);
      await forEachComponent(components, async (component) => {
        for (const [prop, raw] of Object.entries(component.props)) {
          const binding = parseBinding(raw);
          const result = await sandbox.evalBinding(binding, model);
          const key = `${component.id}.${prop}`;
          results[key] = result;
          nextDepMap.set(key, result.dependencies);
          if (result.error) {
            errors[key] = result.error;
          }
        }
      });
      depMap = nextDepMap;
      lastComponents = nextComponents;
      set({ results, errors });
    },

    runAffectedBindings: async () => {
      // Incremental re-evaluation: only re-run bindings whose recorded
      // dependencies intersect the model paths changed since the last run.
      if (changedPaths.size === 0) return;
      if (depMap.size === 0 || lastComponents.size === 0) {
        // No prior full run to diff against (runBindings never called). The
        // mount effect in Runtime performs the initial full run, so by the time
        // user interactions reach here the map exists; no-op otherwise.
        changedPaths.clear();
        return;
      }
      const paths = changedPaths;
      // Swap in a fresh set so changes recorded during this async run are
      // processed on the next call rather than dropped or double-processed.
      changedPaths = new Set<string>();
      const { model } = get();
      const affectedKeys: string[] = [];
      for (const [key, deps] of depMap) {
        let affected = false;
        for (const d of deps) {
          for (const p of paths) {
            if (pathIntersects(d, p)) {
              affected = true;
              break;
            }
          }
          if (affected) break;
        }
        if (affected) affectedKeys.push(key);
      }
      if (affectedKeys.length === 0) return;
      const nextResults: Record<string, BindingResult> = {};
      const nextErrors: Record<string, string> = {};
      for (const key of affectedKeys) {
        const { componentId, prop } = splitBindingKey(key);
        const node = lastComponents.get(componentId);
        if (!node || !(prop in node.props)) continue;
        const binding = parseBinding(node.props[prop]);
        const result = await sandbox.evalBinding(binding, model);
        nextResults[key] = result;
        depMap.set(key, result.dependencies);
        if (result.error) {
          nextErrors[key] = result.error;
        }
      }
      set((s) => {
        const mergedResults = { ...s.results, ...nextResults };
        const mergedErrors = { ...s.errors };
        for (const key of affectedKeys) {
          if (nextErrors[key]) {
            mergedErrors[key] = nextErrors[key]!;
          } else {
            delete mergedErrors[key];
          }
        }
        return { results: mergedResults, errors: mergedErrors };
      });
    },

    runBinding: async (componentId, prop, raw) => {
      const { model } = get();
      const binding = parseBinding(raw);
      const result = await sandbox.evalBinding(binding, model);
      const key = `${componentId}.${prop}`;
      depMap.set(key, result.dependencies);
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

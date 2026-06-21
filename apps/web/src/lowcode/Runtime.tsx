import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { AppDefinition, ComponentNode, Page, QueryRuntime } from "@bettertool/shared";
import {
  type ActionContext,
  type EngineState,
  type ModelSnapshot,
  type QueryState,
  createEngine,
} from "@bettertool/reactive";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import type { RestResponse } from "@/lib/queries";
import { toast } from "@/components/ui/sonner";

import { ComponentRenderer } from "./ComponentRenderer";
import { ViewNodeWrapper } from "./ViewNodeWrapper";
import { asNodes, type NodeWrapperProps } from "./types";

export interface RuntimeProps {
  definition: AppDefinition;
  page: Page;
  mode: "edit" | "view";
  nodeWrapper?: React.ComponentType<NodeWrapperProps>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEngine?: (engine: EngineState) => void;
}

function readUrlParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function buildInitialModel(page: Page, params: Record<string, string>): Partial<ModelSnapshot> {
  const queries: Record<string, QueryState> = {};
  for (const q of page.queries) {
    queries[q.name] = { data: undefined, isFetching: false, error: null, lastRun: null };
  }
  return { queries, components: {}, globals: { params, currentUser: null } };
}

function resolvePath(path: string, model: ModelSnapshot): unknown {
  const parts = path
    .split(/\.|\[(\d+)\]/)
    .filter((p) => p !== undefined && p !== "")
    .map((p) => p!.trim());
  let cur: unknown = model;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveValueExpr(expr: string, model: ModelSnapshot): unknown {
  if (typeof expr !== "string" || !expr.includes("{{")) return expr;
  const whole = expr.match(/^\s*{{([\s\S]*)}}\s*$/);
  const inner = whole ? whole[1]!.trim() : expr.replace(/{{|}}/g, "").trim();
  return resolvePath(inner, model);
}

function showToast(message: string, variant: "info" | "success" | "warning" | "error") {
  switch (variant) {
    case "success":
      toast.success(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    case "error":
      toast.error(message);
      break;
    default:
      toast(message);
  }
}

export function Runtime({ definition: _definition, page, mode, nodeWrapper, selectedId, onSelect, onRemove, onEngine }: RuntimeProps) {
  const engineRef = useRef<EngineState | null>(null);
  if (engineRef.current === null) {
    // Read the browser URL search params once at mount so bindings can
    // reference {{globals.params.foo}} for ?foo=bar. The Runtime is keyed by
    // page id (it remounts on page change), so re-reading on mount is fine.
    engineRef.current = createEngine(buildInitialModel(page, readUrlParams()));
  }
  const engine = engineRef.current;

  useEffect(() => {
    onEngine?.(engine);
  }, [engine, onEngine]);

  const pageRef = useRef(page);
  pageRef.current = page;

  const [revision, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const unsub = engine.subscribe(() => force());
    return unsub;
  }, [engine]);

  const runningRef = useRef(false);
  const rerun = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    void engine.runAffectedBindings().finally(() => {
      runningRef.current = false;
    });
  }, [engine]);

  const executeQuery = useCallback(
    async (q: QueryRuntime) => {
      if (!q.resourceId) {
        engine.setQueryState(q.name, { isFetching: false, error: "No resource selected" });
        return;
      }
      engine.setQueryState(q.name, { isFetching: true, error: null });
      try {
        if (q.config.type === "rest") {
          const res = await api.post<RestResponse>(`/api/proxy/http/${q.resourceId}`, q.config);
          engine.setQueryState(q.name, {
            data: res.data,
            isFetching: false,
            lastRun: Date.now(),
          });
        } else {
          engine.setQueryState(q.name, {
            isFetching: false,
            error: `${q.config.type} queries are not yet supported at runtime`,
          });
        }
      } catch (err) {
        engine.setQueryState(q.name, {
          isFetching: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      rerun();
    },
    [engine, rerun],
  );

  const ctx = useMemo<ActionContext>(
    () => ({
      runQuery: async (queryId: string) => {
        const q = pageRef.current.queries.find((qq) => qq.id === queryId);
        if (q) await executeQuery(q);
      },
      setValue: (componentId: string, property: string, value: unknown) => {
        const resolved =
          typeof value === "string" ? resolveValueExpr(value, engine.model) : value;
        engine.setComponentState(componentId, property, resolved);
        rerun();
      },
      navigate: (pageId: string) => {
        console.warn("[Runtime] navigate action is a no-op in v1", pageId);
      },
      openModal: (componentId: string) => {
        engine.setComponentState(componentId, "open", true);
        rerun();
      },
      closeModal: (componentId: string) => {
        engine.setComponentState(componentId, "open", false);
        rerun();
      },
      showAlert: (message: string, variant: "info" | "success" | "warning" | "error") => {
        showToast(message, variant);
      },
    }),
    [engine, rerun, executeQuery],
  );

  // Re-evaluate bindings whenever the component tree changes (editor live preview).
  useEffect(() => {
    void engine.runBindings(asNodes(page.components));
  }, [engine, page.components]);

  // Run runOnLoad queries once on mount.
  useEffect(() => {
    for (const q of page.queries) {
      if (q.runOnLoad && q.enabled) void executeQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Wrapper = nodeWrapper ?? ViewNodeWrapper;
  const renderChild = useCallback(
    (n: ComponentNode): React.ReactNode => (
      <Wrapper
        key={n.id}
        node={n}
        engine={engine}
        ctx={ctx}
        renderChild={renderChild}
        isEditor={mode === "edit"}
        selectedId={selectedId}
        onSelect={onSelect}
        onRemove={onRemove}
        onStateChange={rerun}
      />
    ),
    [Wrapper, engine, ctx, mode, selectedId, onSelect, onRemove, rerun],
  );

  const queryErrors = useMemo(() => {
    const out: { name: string; error: string }[] = [];
    for (const q of page.queries) {
      const state = engine.model.queries[q.name];
      if (state?.error) out.push({ name: q.name, error: state.error });
    }
    return out;
  }, [page.queries, engine, revision]);

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const visibleErrors = queryErrors.filter((e) => !dismissed[`${e.name}:${e.error}`]);

  const errorBanner = visibleErrors.length > 0 && (
    <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
      {visibleErrors.map((e) => (
        <div key={`${e.name}:${e.error}`} className="flex items-start justify-between gap-2">
          <span>
            <strong className="font-semibold">{e.name}:</strong> {e.error}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-sm hover:bg-destructive/20"
            onClick={() => setDismissed((prev) => ({ ...prev, [`${e.name}:${e.error}`]: true }))}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  if (mode === "edit") {
    return (
      <div className="flex flex-col gap-3">
        {errorBanner}
        {asNodes(page.components).map(renderChild)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {errorBanner}
      {asNodes(page.components).map(renderChild)}
    </div>
  );
}

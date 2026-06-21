import { useEffect, useMemo, useReducer, useState } from "react";
import { Search } from "lucide-react";

import type { ComponentNode } from "@bettertool/shared";
import { isBindableString, type EngineState } from "@bettertool/reactive";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { asNodes } from "@/lowcode/types";

import { useEditorStore, type EditorStore } from "./editor-store";

function flattenComponents(nodes: ComponentNode[]): ComponentNode[] {
  const out: ComponentNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children.length > 0) out.push(...flattenComponents(n.children));
  }
  return out;
}

function innerExpr(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const m = raw.match(/^\s*{{([\s\S]*)}}\s*$/);
  return m ? (m[1] ?? "").trim() : raw.replace(/{{|}}/g, "").trim();
}

function safeStringify(v: unknown): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + "\u2026" : s;
  } catch {
    return String(v);
  }
}

interface BindingRow {
  key: string;
  componentId: string;
  componentName: string;
  prop: string;
  expr: string;
}

export function BindingDebuggerPanel({
  store,
  engine,
}: {
  store: EditorStore;
  engine: EngineState | null;
}) {
  const definition = useEditorStore(store, (s) => s.definition);
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);

  // Re-render when engine binding results/errors change.
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(() => force());
  }, [engine]);

  const [query, setQuery] = useState("");

  const page = definition.pages.find((p) => p.id === currentPageId) ?? null;
  const allComponents = useMemo(
    () => (page ? flattenComponents(asNodes(page.components)) : []),
    [page],
  );

  const rows = useMemo<BindingRow[]>(() => {
    const out: BindingRow[] = [];
    for (const node of allComponents) {
      for (const [prop, raw] of Object.entries(node.props)) {
        if (!isBindableString(raw)) continue;
        out.push({
          key: `${node.id}.${prop}`,
          componentId: node.id,
          componentName: node.name,
          prop,
          expr: innerExpr(raw),
        });
      }
    }
    return out;
  }, [allComponents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.componentName.toLowerCase().includes(q) ||
        r.prop.toLowerCase().includes(q) ||
        r.expr.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (!engine) {
    return <div className="p-4 text-sm text-muted-foreground">Runtime not ready.</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {"No bindings yet — add a {{ }} expression to a component prop."}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Filter by component, prop, or expression"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {filtered.map((row) => {
            const result = engine.results[row.key];
            const error = engine.errors[row.key];
            return (
              <button
                type="button"
                key={row.key}
                onClick={() => store.getState().selectComponent(row.componentId)}
                className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{row.componentName}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{row.prop}</span>
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {row.expr || "(empty)"}
                </div>
                {result && result.dependencies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.dependencies.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="px-1.5 py-0 text-[9px] font-normal"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-muted-foreground">value:</span>
                  <span className="truncate font-mono">{safeStringify(result?.value)}</span>
                </div>
                {error && <p className="text-[10px] text-destructive">{error}</p>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground">
              No bindings match &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

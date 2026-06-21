import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

type Column = { key: string; header: string };

function parseColumns(raw: unknown): Column[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Column => c !== null && typeof c === "object" && "key" in c && "header" in c)
    .map((c) => ({ key: String(c.key), header: String(c.header) }));
}

registerComponent({
  type: "table",
  displayName: "Table",
  category: "data",
  defaultProps: { pageSize: 10, columns: [] },
  defaultLayout: { width: "full", align: "stretch" },
  props: [
    {
      name: "data",
      label: "Data",
      type: "json",
      default: [],
      bindable: true,
      description: "Bind to {{queries.<name>.data}} — an array of objects.",
    },
    {
      name: "columns",
      label: "Columns",
      type: "json",
      default: [],
      description: 'JSON array of {key, header}',
    },
    { name: "pageSize", label: "Page Size", type: "number", default: 10 },
  ],
  render: ({ resolved }) => {
    const dataRaw = resolved.data;
    const data = Array.isArray(dataRaw) ? dataRaw : [];
    const isFetching = dataRaw === undefined;
    const columns = useMemo(() => {
      const parsed = parseColumns(resolved.columns);
      if (parsed.length > 0) return parsed;
      if (data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
        return Object.keys(data[0] as Record<string, unknown>).map((key) => ({ key, header: key }));
      }
      return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolved.columns, data.length]);

    const pageSize = (resolved.pageSize as number) ?? 10;
    const [page, setPage] = useState(0);
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    if (isFetching) {
      return (
        <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No data
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageRows.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-muted/30 even:bg-muted/10">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top text-xs">
                      {formatCell((row as Record<string, unknown>)[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>{data.length} rows</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft />
              </Button>
              <span>
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
});

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

type Column = {
  key: string;
  header: string;
  width?: number | string;
  sortable: boolean;
  editable: boolean;
};

type Row = Record<string, unknown>;

type SortDir = "asc" | "desc" | null;

function parseColumns(raw: unknown): Column[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === "object" && "key" in c && "header" in c)
    .map((c) => ({
      key: String(c.key),
      header: String(c.header),
      width:
        typeof c.width === "number" || typeof c.width === "string" ? c.width : undefined,
      sortable: c.sortable === undefined ? true : Boolean(c.sortable),
      editable: c.editable === undefined ? false : Boolean(c.editable),
    }));
}

function parseRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is Row => r !== null && typeof r === "object");
}

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

registerComponent({
  type: "datagrid",
  displayName: "Data Grid",
  category: "data",
  defaultProps: {
    data: [],
    columns: [],
    pageSize: 10,
    showPagination: true,
    showSearch: true,
    emptyMessage: "No data",
  },
  defaultLayout: { width: "full", align: "stretch" },
  events: ["onRowSelect", "onCellEdit"],
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
      description: "JSON array of {key, header, width?, sortable?, editable?}",
    },
    { name: "pageSize", label: "Page Size", type: "number", default: 10 },
    { name: "showPagination", label: "Show Pagination", type: "boolean", default: true },
    { name: "showSearch", label: "Show Search", type: "boolean", default: true },
    { name: "emptyMessage", label: "Empty Message", type: "string", default: "No data" },
  ],
  render: ({ resolved, componentState, setComponentState, fireEvent }) => {
    const dataRaw = resolved.data;
    const isLoading = dataRaw === undefined;
    const data = useMemo(() => parseRows(dataRaw), [dataRaw]);
    const columns = useMemo(() => {
      const parsed = parseColumns(resolved.columns);
      if (parsed.length > 0) return parsed;
      if (data.length > 0) {
        const first = data[0];
        if (first) {
          return Object.keys(first).map((key) => ({
            key,
            header: key,
            width: undefined,
            sortable: true,
            editable: false,
          }));
        }
      }
      return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolved.columns, data.length]);

    const pageSize = (resolved.pageSize as number) ?? 10;
    const showPagination = resolved.showPagination !== false;
    const showSearch = resolved.showSearch !== false;
    const emptyMessage = (resolved.emptyMessage as string) ?? "No data";

    // UI-only state lives in React, not in the engine model.
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [page, setPage] = useState(0);
    const [editing, setEditing] = useState<{ row: Row; col: string } | null>(null);
    const [editValue, setEditValue] = useState("");

    const selectedRow = componentState.selectedRow as Row | undefined;

    const filtered = useMemo(() => {
      if (!search.trim()) return data;
      const q = search.trim().toLowerCase();
      return data.filter((row) =>
        columns.some((c) => formatCell(row[c.key]).toLowerCase().includes(q)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, columns, search]);

    const sorted = useMemo(() => {
      if (!sortKey || !sortDir) return filtered;
      const col = columns.find((c) => c.key === sortKey);
      if (!col) return filtered;
      const dir = sortDir === "asc" ? 1 : -1;
      return [...filtered].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, sortKey, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const pageStart = showPagination ? safePage * pageSize : 0;
    const pageRows = showPagination
      ? sorted.slice(pageStart, pageStart + pageSize)
      : sorted;

    const cycleSort = (col: Column) => {
      if (col.sortable === false) return;
      if (sortKey !== col.key) {
        setSortKey(col.key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortDir("asc");
      }
      setPage(0);
    };

    const startEdit = (row: Row, col: Column) => {
      if (col.editable !== true) return;
      setEditing({ row, col: col.key });
      setEditValue(formatCell(row[col.key]));
    };

    const commitEdit = () => {
      if (!editing) return;
      const { row, col } = editing;
      const updated = { ...row, [col]: editValue };
      const newData = data.map((r) => (r === row ? updated : r));
      setComponentState("data", newData);
      if (selectedRow === row) {
        setComponentState("selectedRow", updated);
      }
      fireEvent("onCellEdit");
      setEditing(null);
    };

    const colCount = columns.length || 1;

    return (
      <div className="overflow-hidden rounded-md border">
        {showSearch && (
          <div className="border-b p-2">
            <Input
              value={search}
              placeholder="Search..."
              className="h-8 text-sm"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        )}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((c) => {
                  const isSortCol = sortKey === c.key;
                  const Icon =
                    isSortCol && sortDir === "asc"
                      ? ArrowUp
                      : isSortCol && sortDir === "desc"
                        ? ArrowDown
                        : ArrowUpDown;
                  const clickable = c.sortable !== false;
                  return (
                    <th
                      key={c.key}
                      className="px-3 py-2 text-left font-medium"
                      style={c.width ? { width: c.width } : undefined}
                    >
                      {clickable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => cycleSort(c)}
                        >
                          {c.header}
                          <Icon className="h-3.5 w-3.5 opacity-60" />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-4 text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn("border-t cursor-pointer", selectedRow === row && "bg-accent")}
                    onClick={() => {
                      setComponentState("selectedRow", row);
                      fireEvent("onRowSelect");
                    }}
                  >
                    {columns.map((c) => {
                      const isEditing = editing?.row === row && editing?.col === c.key;
                      return (
                        <td
                          key={c.key}
                          className="px-3 py-2 align-top"
                          style={c.width ? { width: c.width } : undefined}
                          onDoubleClick={() => startEdit(row, c)}
                        >
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editValue}
                              className="h-7 px-1.5 py-0.5 text-sm"
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit();
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditing(null);
                                }
                              }}
                              onBlur={commitEdit}
                            />
                          ) : (
                            formatCell(row[c.key])
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {showPagination && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>{sorted.length} rows</span>
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
        )}
      </div>
    );
  },
});

import { useMemo } from "react";
import { Play, Plus, Trash2 } from "lucide-react";

import type { PostgresQuery } from "@bettertool/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useRunPostgresQuery, type PgResponse } from "@/lib/queries";

interface PostgresQueryEditorProps {
  resourceId: string;
  query: PostgresQuery;
  onChange: (query: PostgresQuery) => void;
}

export function PostgresQueryEditor({ resourceId, query, onChange }: PostgresQueryEditorProps) {
  const runPostgresQuery = useRunPostgresQuery();

  function patch(patch: Partial<PostgresQuery>) {
    onChange({ ...query, ...patch });
  }

  async function handleRun() {
    try {
      await runPostgresQuery.mutateAsync({ resourceId, query });
    } catch (err) {
      toast.error("Query failed", { description: (err as Error).message });
    }
  }

  const response = runPostgresQuery.data;
  const error = runPostgresQuery.error;

  function setParameter(index: number, value: string) {
    const next = query.parameters.map((p, i) => (i === index ? value : p));
    patch({ parameters: next });
  }

  function addParameter() {
    patch({ parameters: [...query.parameters, ""] });
  }

  function removeParameter(index: number) {
    patch({ parameters: query.parameters.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">SQL query</span>
        <Button onClick={handleRun} disabled={runPostgresQuery.isPending}>
          <Play />
          {runPostgresQuery.isPending ? "Running..." : "Run"}
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">SQL</Label>
        <Textarea
          className="min-h-[240px] font-mono text-xs"
          value={query.sql}
          onChange={(e) => patch({ sql: e.target.value })}
          placeholder={"SELECT * FROM users WHERE id = $1"}
        />
        <p className="text-[10px] text-muted-foreground">
          Use <code>$1</code>, <code>$2</code>, ... for parameters. Never interpolate user input.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Parameters</Label>
        {query.parameters.length === 0 ? (
          <p className="text-xs text-muted-foreground">No parameters.</p>
        ) : (
          <div className="space-y-2">
            {query.parameters.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                  ${index + 1}
                </span>
                <Input
                  className="flex-1 font-mono text-xs"
                  value={value}
                  onChange={(e) => setParameter(index, e.target.value)}
                  placeholder={`Value for $${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeParameter(index)}
                  aria-label="Remove parameter"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addParameter}>
          <Plus />
          Add parameter
        </Button>
      </div>

      {(response || error) && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-xs font-semibold text-destructive">Query failed</p>
              <p className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-destructive">
                {(error as Error).message}
              </p>
            </div>
          ) : response ? (
            <PgResultView response={response} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function PgResultView({ response }: { response: PgResponse }) {
  const columns = useMemo(() => {
    const set = new Set<string>();
    for (const row of response.rows) {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
    }
    return Array.from(set);
  }, [response.rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="success" className="font-mono">
          {response.rowCount} {response.rowCount === 1 ? "row" : "rows"}
        </Badge>
        <Badge variant="secondary" className="font-mono uppercase">
          {response.command}
        </Badge>
        <span className="text-sm text-muted-foreground">{response.durationMs}ms</span>
      </div>

      {response.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows.</p>
      ) : (
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {response.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-background even:bg-muted/30">
                  {columns.map((col) => (
                    <td key={col} className="border-b border-border/50 px-3 py-1.5 align-top font-mono">
                      {formatCell((row as Record<string, unknown>)[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

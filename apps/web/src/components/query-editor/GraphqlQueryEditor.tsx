import { useState } from "react";
import { Play } from "lucide-react";

import type { GraphqlQuery } from "@bettertool/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValueEditor } from "@/components/ui/key-value-editor";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useRunGraphqlQuery } from "@/lib/queries";

interface GraphqlQueryEditorProps {
  resourceId: string;
  query: GraphqlQuery;
  onChange: (query: GraphqlQuery) => void;
}

export function GraphqlQueryEditor({ resourceId, query, onChange }: GraphqlQueryEditorProps) {
  const runGraphqlQuery = useRunGraphqlQuery();
  const [showHeaders, setShowHeaders] = useState(false);
  const [showResponseHeaders, setShowResponseHeaders] = useState(false);

  function patch(patch: Partial<GraphqlQuery>) {
    onChange({ ...query, ...patch });
  }

  async function handleRun() {
    try {
      await runGraphqlQuery.mutateAsync({ resourceId, query });
    } catch (err) {
      toast.error("Request failed", { description: (err as Error).message });
    }
  }

  const response = runGraphqlQuery.data;
  const errors = extractGraphqlErrors(response?.data);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">GraphQL query</span>
        <Button onClick={handleRun} disabled={runGraphqlQuery.isPending}>
          <Play />
          {runGraphqlQuery.isPending ? "Running..." : "Run"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Query</label>
          <Textarea
            className="min-h-[300px] font-mono text-xs"
            value={query.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder={"query MyQuery {\n  users {\n    id\n    name\n  }\n}"}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Variables (JSON)</label>
          <Textarea
            className="min-h-[300px] font-mono text-xs"
            value={query.variables}
            onChange={(e) => patch({ variables: e.target.value })}
            placeholder='{ "limit": 10 }'
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowHeaders((s) => !s)}
        >
          {showHeaders ? "▾" : "▸"} Headers {Object.keys(query.headers).length > 0 && `(${Object.keys(query.headers).length})`}
        </button>
        {showHeaders && (
          <div className="mt-2">
            <KeyValueEditor
              value={query.headers}
              onChange={(headers) => patch({ headers })}
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
            />
          </div>
        )}
      </div>

      {response && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center gap-3">
            <ResponseStatus status={response.status} />
            <span className="text-sm text-muted-foreground">{response.durationMs}ms</span>
            {response.truncated && (
              <Badge variant="warning">Response truncated (5MB limit)</Badge>
            )}
          </div>

          {errors.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-xs font-semibold text-destructive">GraphQL errors</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-destructive/5 p-2 font-mono text-xs text-destructive">
                {JSON.stringify(errors, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowResponseHeaders((s) => !s)}
            >
              {showResponseHeaders ? "▾" : "▸"} Response headers ({Object.keys(response.headers).length})
            </button>
            {showResponseHeaders && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
                {Object.entries(response.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
              </pre>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Response body</p>
            <pre className="max-h-[400px] overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
              {formatBody(response.data)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseStatus({ status }: { status: number }) {
  const variant =
    status >= 200 && status < 300
      ? "success"
      : status >= 300 && status < 400
        ? "warning"
        : "destructive";
  return (
    <Badge variant={variant} className="font-mono">
      {status}
    </Badge>
  );
}

function extractGraphqlErrors(data: unknown): unknown[] {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const maybeErrors = (data as Record<string, unknown>).errors;
    if (Array.isArray(maybeErrors)) {
      return maybeErrors;
    }
  }
  return [];
}

function formatBody(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

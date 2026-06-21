import { useMemo, useState } from "react";

import type { RestQuery } from "@bettertool/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyValueEditor } from "@/components/ui/key-value-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Play } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useResource, useRunRestQuery } from "@/lib/queries";

interface RestQueryEditorProps {
  resourceId: string;
  query: RestQuery;
  onChange: (query: RestQuery) => void;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const BODY_CONTENT_TYPES: Record<string, string> = {
  json: "application/json",
  text: "text/plain",
  form: "application/x-www-form-urlencoded",
};

export function RestQueryEditor({ resourceId, query, onChange }: RestQueryEditorProps) {
  const { data: resource } = useResource(resourceId);
  const runRestQuery = useRunRestQuery();
  const [showHeaders, setShowHeaders] = useState(false);

  const baseUrl = useMemo(() => {
    if (!resource) return "";
    if (resource.type === "rest" || resource.type === "graphql") {
      const cfg = resource.config as { baseUrl?: string } | null;
      return cfg?.baseUrl ?? "";
    }
    return "";
  }, [resource]);

  const formRecord = useMemo<Record<string, string>>(() => {
    if (query.bodyType !== "form") return {};
    try {
      const parsed = JSON.parse(query.body || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      // ignore
    }
    return {};
  }, [query.body, query.bodyType]);

  function patch(patch: Partial<RestQuery>) {
    onChange({ ...query, ...patch });
  }

  function setFormRecord(record: Record<string, string>) {
    patch({ body: JSON.stringify(record) });
  }

  async function handleRun() {
    try {
      await runRestQuery.mutateAsync({ resourceId, query });
    } catch (err) {
      toast.error("Request failed", { description: (err as Error).message });
    }
  }

  const response = runRestQuery.data;
  const autoContentType = BODY_CONTENT_TYPES[query.bodyType];

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-2">
        <Select value={query.method} onValueChange={(m) => patch({ method: m as RestQuery["method"] })}>
          <SelectTrigger className="w-32 shrink-0 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-1 items-center rounded-md border border-input bg-background pr-1 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring">
          {baseUrl && (
            <span className="truncate px-3 py-2 text-muted-foreground" title={baseUrl}>
              {baseUrl.replace(/\/+$/, "")}
            </span>
          )}
          <input
            className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground"
            value={query.path}
            onChange={(e) => patch({ path: e.target.value })}
            placeholder="/v1/users"
          />
        </div>
        <Button onClick={handleRun} disabled={runRestQuery.isPending}>
          <Play />
          {runRestQuery.isPending ? "Running..." : "Run"}
        </Button>
      </div>

      <Tabs defaultValue="params">
        <TabsList>
          <TabsTrigger value="params">
            Params {Object.keys(query.params).length > 0 && `(${Object.keys(query.params).length})`}
          </TabsTrigger>
          <TabsTrigger value="headers">
            Headers {Object.keys(query.headers).length > 0 && `(${Object.keys(query.headers).length})`}
          </TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="mt-3">
          <KeyValueEditor
            value={query.params}
            onChange={(params) => patch({ params })}
            keyPlaceholder="Query param"
            valuePlaceholder="Value"
          />
        </TabsContent>

        <TabsContent value="headers" className="mt-3">
          {autoContentType && (
            <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-mono text-muted-foreground">Content-Type</span>
              <span className="text-muted-foreground">:</span>
              <span className="font-mono text-muted-foreground">{autoContentType}</span>
              <span className="ml-auto text-xs text-muted-foreground">(auto from body)</span>
            </div>
          )}
          <KeyValueEditor
            value={query.headers}
            onChange={(headers) => patch({ headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
          />
        </TabsContent>

        <TabsContent value="body" className="mt-3">
          <Tabs value={query.bodyType} onValueChange={(v) => patch({ bodyType: v as RestQuery["bodyType"] })}>
            <TabsList>
              <TabsTrigger value="none">none</TabsTrigger>
              <TabsTrigger value="json">json</TabsTrigger>
              <TabsTrigger value="text">text</TabsTrigger>
              <TabsTrigger value="form">form</TabsTrigger>
            </TabsList>
            <TabsContent value="none" className="mt-3">
              <p className="text-sm text-muted-foreground">No request body.</p>
            </TabsContent>
            <TabsContent value="json" className="mt-3">
              <Textarea
                className="min-h-[160px] font-mono text-xs"
                value={query.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder='{ "key": "value" }'
              />
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <Textarea
                className="min-h-[160px] font-mono text-xs"
                value={query.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder="Plain text body"
              />
            </TabsContent>
            <TabsContent value="form" className="mt-3">
              <KeyValueEditor
                value={formRecord}
                onChange={setFormRecord}
                keyPlaceholder="Field name"
                valuePlaceholder="Field value"
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {response && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center gap-3">
            <ResponseStatus status={response.status} />
            <span className="text-sm text-muted-foreground">{response.durationMs}ms</span>
            {response.truncated && (
              <Badge variant="warning">Response truncated (5MB limit)</Badge>
            )}
          </div>

          <div>
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowHeaders((s) => !s)}
            >
              {showHeaders ? "▾" : "▸"} Response headers ({Object.keys(response.headers).length})
            </button>
            {showHeaders && (
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

function formatBody(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

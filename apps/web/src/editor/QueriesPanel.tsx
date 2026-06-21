import { useState } from "react";
import { ChevronRight, Play, Plus, Trash2 } from "lucide-react";

import type {
  GraphqlQuery,
  PostgresQuery,
  Query,
  QueryRuntime,
  RestQuery,
} from "@bettertool/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GraphqlQueryEditor } from "@/components/query-editor/GraphqlQueryEditor";
import { PostgresQueryEditor } from "@/components/query-editor/PostgresQueryEditor";
import { RestQueryEditor } from "@/components/query-editor/RestQueryEditor";
import { useCreateResource, useResources } from "@/lib/queries";
import { cn } from "@/lib/utils";

import { useEditorStore, type EditorStore } from "./editor-store";

function defaultRestQuery(): RestQuery {
  return {
    type: "rest",
    method: "GET",
    path: "",
    headers: {},
    params: {},
    bodyType: "none",
    body: "",
  };
}

function defaultGraphqlQuery(): GraphqlQuery {
  return {
    type: "graphql",
    query: "",
    variables: "{}",
    headers: {},
  };
}

function defaultPostgresQuery(): PostgresQuery {
  return {
    type: "postgres",
    sql: "",
    parameters: [],
  };
}

function defaultQueryConfigForResource(resourceType?: "rest" | "graphql" | "postgres") {
  switch (resourceType) {
    case "graphql":
      return defaultGraphqlQuery();
    case "postgres":
      return defaultPostgresQuery();
    case "rest":
    default:
      return defaultRestQuery();
  }
}

export function QueriesPanel({ store }: { store: EditorStore }) {
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);
  const definition = useEditorStore(store, (s) => s.definition);
  const selectedQueryId = useEditorStore(store, (s) => s.selectedQueryId);
  const { data: resources } = useResources();

  const page = definition.pages.find((p) => p.id === currentPageId);
  const selectedQuery = page?.queries.find((q) => q.id === selectedQueryId) ?? null;
  const selectedResource = resources?.find((r) => r.id === selectedQuery?.resourceId) ?? null;

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newResourceId, setNewResourceId] = useState<string | null>(null);

  // On-the-fly resource creation
  const createResource = useCreateResource();
  const [showNewResource, setShowNewResource] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceType, setNewResourceType] = useState<"rest" | "graphql" | "postgres">("rest");
  const [creatingResource, setCreatingResource] = useState(false);

  async function handleCreateResourceAndSelect() {
    const name = newResourceName.trim();
    if (!name) return;
    setCreatingResource(true);
    try {
      const config =
        newResourceType === "postgres"
          ? { connectionString: "", ssl: false }
          : { baseUrl: "", headers: {}, auth: { type: "none" } as const };
      const res = await createResource.mutateAsync({ name, type: newResourceType, config });
      setNewResourceId(res.id);
      setShowNewResource(false);
      setNewResourceName("");
    } catch (err) {
      // toast handled by useCreateResource's onError (if any) — or just silently fail
    } finally {
      setCreatingResource(false);
    }
  }

  if (!page) {
    return <div className="text-sm text-muted-foreground">No page selected.</div>;
  }

  function handleAdd() {
    const resourceId = newResourceId;
    const name = newName.trim() || "query1";
    const id = crypto.randomUUID();
    const resourceType = resources?.find((r) => r.id === resourceId)?.type;
    const query: QueryRuntime = {
      id,
      name,
      resourceId,
      config: defaultQueryConfigForResource(resourceType),
      runOnLoad: false,
      transformJs: "",
      enabled: true,
    };
    store.getState().addQuery(page!.id, query);
    setAddOpen(false);
    setNewName("");
    setNewResourceId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-sm font-semibold">Queries</h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Add
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 px-1">
          {page.queries.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No queries yet. Add one to bind data into components.
            </p>
          ) : (
            page.queries.map((q) => {
              const resource = resources?.find((r) => r.id === q.resourceId);
              const isSelected = q.id === selectedQueryId;
              return (
                <div key={q.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => store.getState().selectQuery(q.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-transparent hover:bg-accent/60",
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                        isSelected && "rotate-90",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{q.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {resource?.name ?? "No resource"} · {q.config.type}
                      </div>
                    </div>
                  </button>
                  {isSelected && (
                    <div className="space-y-3 rounded-md border bg-muted/30 p-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Name (binding key)</Label>
                        <Input
                          className="h-7 text-xs"
                          value={q.name}
                          onChange={(e) =>
                            store.getState().updateQuery(page.id, q.id, { name: e.target.value })
                          }
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Bind with <code>{`{{queries.${q.name || "name"}.data}}`}</code>
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px]">Run on load</Label>
                        <Switch
                          checked={q.runOnLoad}
                          onCheckedChange={(v) =>
                            store.getState().updateQuery(page.id, q.id, { runOnLoad: v })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px]">Enabled</Label>
                        <Switch
                          checked={q.enabled}
                          onCheckedChange={(v) =>
                            store.getState().updateQuery(page.id, q.id, { enabled: v })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => store.getState().removeQuery(page.id, q.id)}
                      >
                        <Trash2 />
                        Remove query
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {selectedQuery && (
        <div className="mt-2 border-t pt-2">
          <div className="px-1 pb-1 text-xs font-semibold">Editor</div>
          <ScrollArea className="max-h-[40vh]">
            {selectedQuery.resourceId ? (
              <QueryEditorSwitch
                query={selectedQuery.config}
                resourceId={selectedQuery.resourceId}
                onChange={(config) =>
                  store.getState().updateQuery(page.id, selectedQuery.id, { config })
                }
              />
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Select a resource for this query to edit it.
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add query</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="query-name">Query name</Label>
              <Input
                id="query-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="users"
              />
              <p className="text-xs text-muted-foreground">
                Used in bindings as <code>{`{{queries.${newName || "name"}.data}}`}</code>
              </p>
            </div>
            <div className="space-y-1">
              <Label>Resource</Label>
              <Select
                value={newResourceId ?? "__none__"}
                onValueChange={(v) => setNewResourceId(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No resource</SelectItem>
                  {resources?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowNewResource(!showNewResource)}
              >
                {showNewResource ? "Cancel" : "+ Create new resource"}
              </button>
            </div>
            {showNewResource && (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <p className="text-xs font-medium text-muted-foreground">New resource</p>
                <Input
                  className="h-7 text-xs"
                  placeholder="Resource name"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateResourceAndSelect();
                  }}
                  autoFocus
                />
                <Select
                  value={newResourceType}
                  onValueChange={(v) => setNewResourceType(v as "rest" | "graphql" | "postgres")}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rest">REST</SelectItem>
                    <SelectItem value="graphql">GraphQL</SelectItem>
                    <SelectItem value="postgres">Postgres</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={handleCreateResourceAndSelect}
                  disabled={creatingResource || !newResourceName.trim()}
                >
                  {creatingResource ? "Creating..." : "Create resource"}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The editor adapts to the selected resource type (REST, GraphQL, or Postgres).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <Play />
              Add query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueryEditorSwitch({
  query,
  resourceId,
  onChange,
}: {
  query: Query;
  resourceId: string;
  onChange: (query: Query) => void;
}) {
  switch (query.type) {
    case "rest":
      return <RestQueryEditor resourceId={resourceId} query={query} onChange={onChange} />;
    case "graphql":
      return <GraphqlQueryEditor resourceId={resourceId} query={query} onChange={onChange} />;
    case "postgres":
      return <PostgresQueryEditor resourceId={resourceId} query={query} onChange={onChange} />;
  }
}

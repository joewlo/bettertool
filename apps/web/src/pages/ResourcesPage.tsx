import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { ResourceEditorDialog } from "@/components/resource-editor/ResourceEditorDialog";
import { RestQueryEditor } from "@/components/query-editor/RestQueryEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  useCreateResource,
  useDeleteResource,
  useResources,
  type ResourceRow,
} from "@/lib/queries";
import type { RestQuery } from "@bettertool/shared";

type ResourceType = "rest" | "graphql" | "postgres";

function defaultConfig(type: ResourceType): unknown {
  if (type === "postgres") {
    return { connectionString: "", ssl: false };
  }
  return { baseUrl: "", headers: {}, auth: { type: "none" } };
}

function configSummary(resource: ResourceRow): string {
  if (resource.type === "postgres") return "PG";
  const cfg = resource.config as { baseUrl?: string } | null;
  return cfg?.baseUrl || "—";
}

function NewResourceDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("rest");
  const createResource = useCreateResource();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createResource.mutateAsync({
        name: name.trim(),
        type,
        config: defaultConfig(type),
      });
      toast.success("Resource created");
      setName("");
      setType("rest");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to create resource", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New Resource
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create new resource</DialogTitle>
            <DialogDescription>Connect to a REST, GraphQL, or Postgres source.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-resource-name">Name</Label>
              <Input
                id="new-resource-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API"
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest">REST</SelectItem>
                  <SelectItem value="graphql">GraphQL</SelectItem>
                  <SelectItem value="postgres">Postgres</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createResource.isPending || !name.trim()}>
              {createResource.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteResourceDialog({
  resource,
  children,
}: {
  resource: ResourceRow;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const deleteResource = useDeleteResource();

  async function handleConfirm() {
    try {
      await deleteResource.mutateAsync(resource.id);
      toast.success("Resource deleted");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to delete resource", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete resource</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{resource.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteResource.isPending}>
            {deleteResource.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QueryEditorDialog({ resource }: { resource: ResourceRow }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<RestQuery>({
    type: "rest",
    method: "GET",
    path: "",
    headers: {},
    params: {},
    bodyType: "none",
    body: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Query — {resource.name}</DialogTitle>
          <DialogDescription>Run a REST request against this resource.</DialogDescription>
        </DialogHeader>
        <RestQueryEditor resourceId={resource.id} query={query} onChange={setQuery} />
      </DialogContent>
    </Dialog>
  );
}

function ResourceRowItem({
  resource,
  onEdit,
}: {
  resource: ResourceRow;
  onEdit: (resource: ResourceRow) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-card-foreground shadow-sm">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{resource.name}</span>
          <Badge variant="secondary" className="uppercase">
            {resource.type}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">{configSummary(resource)}</p>
      </div>
      <div className="flex items-center gap-2">
        {resource.type === "rest" && <QueryEditorDialog resource={resource} />}
        <Button variant="outline" size="sm" onClick={() => onEdit(resource)}>
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(resource)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteResourceDialog resource={resource}>
              <button className="w-full text-left">
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  Delete
                </DropdownMenuItem>
              </button>
            </DeleteResourceDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ResourcesPage() {
  const { data: resources, isLoading, isError, error } = useResources();
  const [editing, setEditing] = useState<ResourceRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Manage API and database connections used by your apps.
          </p>
        </div>
        <NewResourceDialog />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading resources...</div>
      ) : isError ? (
        <div className="py-12 text-center text-destructive">
          Failed to load resources: {(error as Error).message}
        </div>
      ) : !resources || resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">No resources yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Add a REST, GraphQL, or Postgres resource to get started.
          </p>
          <NewResourceDialog />
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => (
            <ResourceRowItem key={resource.id} resource={resource} onEdit={setEditing} />
          ))}
        </div>
      )}

      {editing && (
        <ResourceEditorDialog
          resource={editing}
          open={!!editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

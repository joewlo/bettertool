import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "@/components/ui/sonner";
import { useApps, useCreateApp, useDeleteApp, type AppRow } from "@/lib/queries";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function NewAppDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createApp = useCreateApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createApp.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success("App created");
      setName("");
      setDescription("");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to create app", { description: (err as Error).message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New App
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create new app</DialogTitle>
            <DialogDescription>Give your app a name and optional description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="new-app-name">
              Name
            </label>
            <Input
              id="new-app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome app"
              autoFocus
              required
              maxLength={200}
            />
            <label className="text-sm font-medium" htmlFor="new-app-desc">
              Description
            </label>
            <Input
              id="new-app-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createApp.isPending || !name.trim()}>
              {createApp.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAppDialog({ app, children }: { app: AppRow; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const deleteApp = useDeleteApp();

  const handleConfirm = async () => {
    try {
      await deleteApp.mutateAsync(app.id);
      toast.success("App deleted");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to delete app", { description: (err as Error).message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete app</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{app.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteApp.isPending}>
            {deleteApp.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppCard({ app }: { app: AppRow }) {
  const navigate = useNavigate();

  return (
    <Card className="group relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Link to={`/apps/${app.id}`}>
              <CardTitle className="truncate hover:underline">{app.name}</CardTitle>
            </Link>
            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
              {app.description || "No description"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate(`/apps/${app.id}`)}>Open</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/apps/${app.id}/edit`)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteAppDialog app={app}>
                <button className="w-full text-left">
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    Delete
                  </DropdownMenuItem>
                </button>
              </DeleteAppDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-xs text-muted-foreground">Created {formatDate(app.createdAt)}</p>
      </CardHeader>
    </Card>
  );
}

export function AppsPage() {
  const { data: apps, isLoading, isError, error } = useApps();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apps</h1>
          <p className="text-sm text-muted-foreground">Build and manage your internal tools.</p>
        </div>
        <NewAppDialog />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading apps...</div>
      ) : isError ? (
        <div className="py-12 text-center text-destructive">
          Failed to load apps: {(error as Error).message}
        </div>
      ) : !apps || apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">No apps yet</p>
          <p className="mb-4 text-sm text-muted-foreground">Get started by creating your first app.</p>
          <NewAppDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

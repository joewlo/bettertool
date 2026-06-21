import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RotateCcw } from "lucide-react";

import type { AppDefinition } from "@bettertool/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAppRevisions, useRevision } from "@/lib/queries";

export interface RevisionsDialogProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (definition: AppDefinition) => void;
}

export function RevisionsDialog({ appId, open, onOpenChange, onRestore }: RevisionsDialogProps) {
  const { data: revisions, isLoading } = useAppRevisions(open ? appId : undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: revision, isFetching: revFetching } = useRevision(
    open ? appId : undefined,
    selectedId ?? undefined,
  );

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) setSelectedId(null);
  };

  const handleRestore = () => {
    if (!revision?.definition) return;
    onRestore(revision.definition as AppDefinition);
    toast.success("Revision restored", {
      description: "Save to persist the restored version.",
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revision history</DialogTitle>
          <DialogDescription>
            Pick a past version to preview, then restore it into the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 gap-4">
          <ScrollArea className="h-[52vh] w-60 shrink-0 rounded-md border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading revisions...</div>
            ) : !revisions || revisions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No revisions yet. Save the app to create one.
              </div>
            ) : (
              <ul className="divide-y">
                {revisions.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-accent",
                        selectedId === r.id && "bg-accent",
                      )}
                    >
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground">
                        by {r.createdById ?? "unknown"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          <div className="flex min-h-0 flex-1 flex-col">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a revision to preview.
              </div>
            ) : revFetching ? (
              <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading revision...
              </div>
            ) : revision ? (
              <div className="flex flex-1 flex-col gap-2">
                <pre className="max-h-[44vh] overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(revision.definition, null, 2)}
                </pre>
                <Button onClick={handleRestore} className="ml-auto" size="sm">
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Revision not found.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

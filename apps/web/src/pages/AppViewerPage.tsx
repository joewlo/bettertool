import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import type { AppDefinition, Page } from "@bettertool/shared";
import { appDefinitionSchema } from "@bettertool/shared";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/lib/queries";
import { Runtime } from "@/lowcode/Runtime";
import { cn } from "@/lib/utils";

function normalizeDefinition(def: unknown): AppDefinition {
  if (def && typeof def === "object") {
    const parsed = appDefinitionSchema.safeParse(def);
    if (parsed.success) return parsed.data;
  }
  return { version: 1, pages: [] };
}

export function AppViewerPage() {
  const { appId } = useParams<{ appId: string }>();
  const { data: app, isLoading, isError, error } = useApp(appId);
  const [searchParams, setSearchParams] = useSearchParams();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading app...</div>;
  }
  if (isError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load app: {(error as Error).message}
      </div>
    );
  }
  if (!app) {
    return <div className="py-12 text-center text-muted-foreground">App not found</div>;
  }

  const definition = normalizeDefinition(app.definition);

  if (definition.pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/apps">
              <ArrowLeft />
              Back to apps
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rounded-lg border border-dashed px-12 py-8 text-center text-muted-foreground">
            This app has no pages yet. Open the editor to start building.
          </div>
        </div>
      </div>
    );
  }

  const pageParam = searchParams.get("page");
  const currentPage: Page = definition.pages.find((p) => p.id === pageParam) ?? definition.pages[0]!;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/apps">
            <ArrowLeft />
            Back to apps
          </Link>
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">{app.name}</h1>
        {definition.pages.length > 1 && (
          <div className="ml-2 flex items-center gap-1">
            {definition.pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSearchParams({ page: p.id })}
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  p.id === currentPage.id
                    ? "bg-accent font-medium"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Runtime key={currentPage.id} definition={definition} page={currentPage} mode="view" />
        </div>
      </ScrollArea>
    </div>
  );
}

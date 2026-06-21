import { Link } from "react-router-dom";
import { Blocks } from "lucide-react";

export function HomePage() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Blocks className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">bettertool</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Build internal tools with a drag-and-drop editor. Connect REST, GraphQL, and Postgres
        resources, bind data to UI components using <code className="rounded bg-muted px-1 text-xs">{`{{ }}`}</code> expressions, and run
        behind your own SSO ingress.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/apps"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Open apps
        </Link>
        <Link
          to="/resources"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          Manage resources
        </Link>
      </div>
    </div>
  );
}

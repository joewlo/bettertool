import { Link, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AppEditorPage } from "@/pages/AppEditorPage";
import { AppsPage } from "@/pages/AppsPage";
import { AppViewerPage } from "@/pages/AppViewerPage";
import { HomePage } from "@/pages/HomePage";
import { ResourcesPage } from "@/pages/ResourcesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            bettertool
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/apps" className="hover:text-foreground">
              Apps
            </Link>
            <Link to="/resources" className="hover:text-foreground">
              Resources
            </Link>
          </nav>
        </div>
      </header>
      <Routes>
        {/* Full-bleed app routes (editor + viewer use the full viewport). */}
        <Route path="/apps/:appId/edit" element={<AppEditorPage />} />
        <Route path="/apps/:appId" element={<AppViewerPage />} />
        {/* Standard constrained routes. */}
        <Route
          path="*"
          element={
            <main className="mx-auto max-w-6xl px-4 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/apps" element={<AppsPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
              </Routes>
            </main>
          }
        />
      </Routes>
      <Toaster />
    </div>
  );
}

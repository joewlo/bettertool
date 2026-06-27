import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AppEditorPage } from "@/pages/AppEditorPage";
import { AppsPage } from "@/pages/AppsPage";
import { AppViewerPage } from "@/pages/AppViewerPage";
import { HomePage } from "@/pages/HomePage";
import { ResourcesPage } from "@/pages/ResourcesPage";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("bettertool-theme");
    if (stored === "dark" || stored === "light") return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("bettertool-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export default function App() {
  const { dark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            bettertool
          </Link>
          <nav className="flex flex-1 gap-3 text-sm text-muted-foreground">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
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

import { Link, useLocation } from "wouter";
import { Terminal, Plus, Activity, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-sans">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="bg-primary/20 p-2 rounded-md">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="font-mono font-bold tracking-tight text-lg">POSTAPP</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/apps/new">
            <Button
              variant={location === "/apps/new" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </Button>
          </Link>
        </nav>

        <div className="mt-auto pt-8 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Systems Normal</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

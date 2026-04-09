import { Link, useLocation } from "wouter";
import { Terminal, Plus, Activity, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-sans">
      {/* Sidebar — compact top bar on mobile, full sidebar on md+ */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-row md:flex-col items-center md:items-stretch gap-2 md:gap-0 px-3 py-2 md:p-4 sticky top-0 md:sticky md:top-0 z-20 md:h-screen md:overflow-y-auto shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 md:mb-8 md:px-2 shrink-0">
          <div className="bg-primary/20 p-1.5 md:p-2 rounded-md">
            <Terminal className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <span className="font-mono font-bold tracking-tight text-base md:text-lg">POSTAPP</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-row md:flex-col gap-1 md:gap-2 flex-1 md:flex-none items-center md:items-stretch">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              className="md:w-full justify-start gap-2 text-xs md:text-sm h-8 md:h-10 px-2 md:px-3"
            >
              <LayoutDashboard className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <Link href="/apps/new">
            <Button
              variant={location === "/apps/new" ? "secondary" : "ghost"}
              size="sm"
              className="md:w-full justify-start gap-2 text-xs md:text-sm h-8 md:h-10 px-2 md:px-3"
            >
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
              <span>New Submission</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant={location === "/settings" ? "secondary" : "ghost"}
              size="sm"
              className="md:w-full justify-start gap-2 text-xs md:text-sm h-8 md:h-10 px-2 md:px-3"
            >
              <Settings className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
              <span>Settings</span>
            </Button>
          </Link>
        </nav>

        {/* Status — hidden on mobile, visible in sidebar on md+ */}
        <div className="mt-auto pt-4 border-t border-border space-y-3 hidden md:block">
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Systems Normal</span>
          </div>
          <p className="px-2 text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
            © {new Date().getFullYear()} Timothy Biller<br />
            All rights reserved.
          </p>
        </div>

        {/* Status indicator — mobile only, minimal */}
        <div className="ml-auto flex items-center gap-1 md:hidden shrink-0">
          <Activity className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-mono text-muted-foreground/60">OK</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

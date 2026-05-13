import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import AppNew from "@/pages/app-new";
import AppDetail from "@/pages/app-detail";
import PrivacyPolicy from "@/pages/privacy";
import Settings from "@/pages/settings";
import Pricing from "@/pages/pricing";
import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";

const queryClient = new QueryClient();

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
}

function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === "login"
          ? "/api/auth/local/login"
          : "/api/auth/local/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              firstName: name.split(" ")[0] || name,
              lastName: name.split(" ").slice(1).join(" ") || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Authentication failed");
      }

      // Session cookie is now set — reload to trigger useAuth re-check
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            &gt;_ POSTAPP
          </span>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to your dashboard"
              : "Create your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-muted/20 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-muted/20 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-muted/20 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-sm font-semibold rounded-lg transition-colors"
          >
            {loading
              ? "…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs text-muted-foreground/60">
          {mode === "login" ? "New to PostApp? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-mono text-sm text-muted-foreground animate-pulse">
          Checking access…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/apps/new" component={AppNew} />
        <Route path="/apps/:id" component={AppDetail} />
        <Route path="/settings" component={Settings} />
        <Route path="/pricing" component={Pricing} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/privacy" component={PrivacyPolicy} />
              <Route path="/pricing">
                <Layout>
                  <Pricing />
                </Layout>
              </Route>
              <Route>
                <AuthGate>
                  <Router />
                </AuthGate>
              </Route>
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

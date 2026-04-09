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
import { AiAssistant } from "@/components/ai-assistant";
import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

const queryClient = new QueryClient();

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
}

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              &gt;_ POSTAPP
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            App Store Submission Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your submission dashboard.
          </p>
        </div>

        <button
          onClick={login}
          className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 text-white font-mono text-sm rounded-lg transition-colors"
        >
          Log in to continue
        </button>

        <p className="text-xs text-muted-foreground/60">
          Access is restricted to authorized users only.
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

  return (
    <>
      {children}
      <AiAssistant />
    </>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/apps/new" component={AppNew} />
        <Route path="/apps/:id" component={AppDetail} />
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

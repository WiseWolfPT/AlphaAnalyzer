import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SimpleAuthProvider } from "@/contexts/simple-auth";
import { SimpleRouter, Route } from "./simple-router";
import Dashboard from "@/pages/simple-dashboard";

function Router() {
  return (
    <SimpleRouter>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="*" component={() => <div className="p-8 text-white bg-gray-900 min-h-screen"><h1>404 - Custom Not Found</h1><p>Path: {window.location.pathname}</p></div>} />
    </SimpleRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="alpha-analyzer-theme">
        <SimpleAuthProvider>
          <Toaster />
          <Router />
        </SimpleAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

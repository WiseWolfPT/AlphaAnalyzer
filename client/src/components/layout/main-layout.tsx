import { ReactNode, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { TopBar } from "./top-bar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { theme } = useTheme();

  // Apply dashboard-dark class when in dashboard dark mode
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dashboard-dark');
    } else {
      document.body.classList.remove('dashboard-dark');
    }
    
    // Remove landing page class if present
    document.body.classList.remove('landing-page');
    
    return () => {
      document.body.classList.remove('dashboard-dark');
    };
  }, [theme]);

  return (
    <div className="min-h-screen bg-background flex">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col bg-background">
        <TopBar />
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
import { ReactNode } from "react";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { TopBar } from "./top-bar";
import { ChatWidget } from "@/components/chat";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  
  // Extract stock symbol from URL if on stock detail page
  const stockSymbol = location.match(/^\/stock\/([^\/]+)/)?.[1]?.toUpperCase();
  
  return (
    <div className="min-h-screen bg-background flex">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col bg-background">
        <TopBar />
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
      
      {/* AI Chat Widget - appears on all authenticated pages */}
      <ChatWidget currentStock={stockSymbol} />
    </div>
  );
}
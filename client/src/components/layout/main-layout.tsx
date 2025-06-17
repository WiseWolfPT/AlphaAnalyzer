import { ReactNode } from "react";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { TopBar } from "./top-bar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-pure-white dark:bg-dark-slate-navy flex">
      <CollapsibleSidebar />
      <div className="flex-1 flex flex-col bg-pure-white dark:bg-dark-slate-navy">
        <TopBar />
        <main className="flex-1 overflow-auto bg-pure-white dark:bg-dark-slate-navy">
          {children}
        </main>
      </div>
    </div>
  );
}
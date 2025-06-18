import { cn } from "@/lib/utils";

interface PageSeparatorProps {
  className?: string;
}

export function PageSeparator({ className }: PageSeparatorProps) {
  return (
    <div 
      className={cn(
        "border-t border-border/30 my-6", 
        className
      )} 
      style={{ marginTop: 'calc(100vh - 420px)', marginBottom: '1.5rem' }}
    />
  );
}
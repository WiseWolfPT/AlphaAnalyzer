import { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricTooltipProps {
  content: string;
}

export function MetricTooltip({ content }: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger 
          asChild
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => {
            // Add delay before closing to allow hovering over tooltip content
            setTimeout(() => setIsOpen(false), 150);
          }}
        >
          <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs z-[99999] pointer-events-auto bg-popover border border-border shadow-xl"
          sideOffset={8}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          style={{ zIndex: 99999 }}
        >
          <p className="text-xs leading-relaxed text-popover-foreground">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
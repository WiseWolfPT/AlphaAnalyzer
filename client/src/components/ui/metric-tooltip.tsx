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
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs text-xs leading-relaxed"
          style={{ zIndex: 999999 }}
          side="top"
          sideOffset={5}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
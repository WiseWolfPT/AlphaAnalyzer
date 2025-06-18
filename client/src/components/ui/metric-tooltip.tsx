import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <>
      <Info 
        className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-1" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {isOpen && createPortal(
        <div
          className="fixed pointer-events-auto bg-popover border border-border shadow-xl rounded-md px-3 py-2 text-xs leading-relaxed text-popover-foreground max-w-xs animate-in fade-in-0 zoom-in-95"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translateX(-50%) translateY(-100%)',
            zIndex: 999999
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
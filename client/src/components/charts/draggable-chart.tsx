// Mock drag and drop functionality - TODO: Install @dnd-kit when needed
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableChartProps {
  id: string;
  name: string;
  visible: boolean;
  children: React.ReactNode;
  onToggleVisibility: (id: string) => void;
  isDragMode: boolean;
}

export function DraggableChart({ 
  id, 
  name, 
  visible, 
  children, 
  onToggleVisibility, 
  isDragMode 
}: DraggableChartProps) {
  
  if (!visible && !isDragMode) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative group transition-all duration-200",
        !visible && isDragMode && "opacity-50"
      )}
    >
      {/* Drag Handle & Controls - Only visible in drag mode */}
      {isDragMode && (
        <div className="absolute -top-2 left-2 right-2 z-10 flex items-center justify-between bg-background/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1 hover:bg-muted rounded">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{name}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onToggleVisibility(id)}
          >
            {visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {/* Chart Content */}
      <div
        className={cn(
          "transition-all duration-200",
          isDragMode && "mt-8",
          !visible && "pointer-events-none"
        )}
      >
        {children}
      </div>

      {/* Overlay for hidden charts in drag mode */}
      {!visible && isDragMode && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
          <div className="text-center">
            <EyeOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Hidden Chart</p>
          </div>
        </div>
      )}
    </div>
  );
}
// Debug Mode Toggle Component
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bug } from 'lucide-react';
import { setDebugMode, isDebugMode } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DebugModeToggle() {
  const [debugEnabled, setDebugEnabled] = useState(isDebugMode());
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    // Check if user is pressing Ctrl+Shift+D (or Cmd+Shift+D on Mac)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowPopover(!showPopover);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPopover]);

  const handleToggle = (enabled: boolean) => {
    setDebugEnabled(enabled);
    setDebugMode(enabled);
  };

  // Floating debug icon (only visible in development)
  if (import.meta.env.PROD && !debugEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating Debug Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full shadow-lg ${
                debugEnabled ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''
              }`}
              title="Debug Mode (Ctrl+Shift+D)"
            >
              <Bug className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Debug Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Enable detailed logging to help diagnose issues.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="debug-mode"
                  checked={debugEnabled}
                  onCheckedChange={handleToggle}
                />
                <Label htmlFor="debug-mode">
                  {debugEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
              
              {debugEnabled && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Debug features enabled:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• Detailed console logging</li>
                    <li>• HTTP request/response logs</li>
                    <li>• Performance metrics</li>
                    <li>• Error stack traces</li>
                  </ul>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open('/admin/logs', '_blank')}
                    >
                      View Logs Dashboard
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Press <kbd>Ctrl+Shift+D</kbd> to toggle this menu
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Debug Mode Indicator */}
      {debugEnabled && (
        <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-b-md">
            DEBUG MODE
          </div>
        </div>
      )}
    </>
  );
}
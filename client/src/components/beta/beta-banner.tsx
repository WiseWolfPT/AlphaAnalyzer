import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Zap, Users, MessageCircle } from 'lucide-react';

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-600" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-100">
              BETA
            </Badge>
            <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
              You're using Alpha Analyzer BETA! Join our community for updates and exclusive content.
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => window.open('https://discord.gg/alphaanalyzer', '_blank')}
          >
            <Users className="h-4 w-4 mr-1" />
            Discord
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => window.open('https://whop.com/alphaanalyzer', '_blank')}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Courses
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
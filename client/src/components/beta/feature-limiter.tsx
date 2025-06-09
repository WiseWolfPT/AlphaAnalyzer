import { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/simple-auth';

interface FeatureLimiterProps {
  children: ReactNode;
  feature: 'advanced_charts' | 'premium_data' | 'unlimited_watchlists' | 'portfolio_tracking';
  requiredTier?: 'pro' | 'premium';
  className?: string;
}

const featureConfig = {
  advanced_charts: {
    title: 'Advanced Charts & Analytics',
    description: 'Access professional-grade technical analysis tools',
    icon: TrendingUp,
    tier: 'pro' as const,
  },
  premium_data: {
    title: 'Real-time Premium Data',
    description: 'Get live market data and professional insights',
    icon: Crown,
    tier: 'premium' as const,
  },
  unlimited_watchlists: {
    title: 'Unlimited Watchlists',
    description: 'Create unlimited watchlists and track more stocks',
    icon: Users,
    tier: 'pro' as const,
  },
  portfolio_tracking: {
    title: 'Portfolio Tracking',
    description: 'Advanced portfolio analytics and performance tracking',
    icon: TrendingUp,
    tier: 'pro' as const,
  },
};

export function FeatureLimiter({ 
  children, 
  feature, 
  requiredTier, 
  className 
}: FeatureLimiterProps) {
  const { user } = useAuth();
  // Simplified for now - treat all users as free tier
  const isSubscribed = () => false;
  const config = featureConfig[feature];
  const tier = requiredTier || config.tier;
  
  // If user has required subscription, show the feature
  if (user && isSubscribed(tier)) {
    return <>{children}</>;
  }

  const IconComponent = config.icon;

  return (
    <div className={`relative ${className || ''}`}>
      {/* Blurred content for preview */}
      <div className="relative">
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center">
          <div className="text-center space-y-4 p-6 max-w-sm">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <Badge variant="outline" className="border-primary text-primary">
                {tier.toUpperCase()} FEATURE
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">{config.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="text-center text-sm">
                <strong>BETA Access:</strong> This feature will be available in our upcoming {tier} plan.
                Join our Discord for early access opportunities!
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://discord.gg/alphaanalyzer', '_blank')}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-1" />
                Join Discord
              </Button>
              {!user && (
                <Button
                  size="sm"
                  onClick={() => {/* Will trigger auth modal */}}
                  className="flex-1"
                >
                  Sign Up
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
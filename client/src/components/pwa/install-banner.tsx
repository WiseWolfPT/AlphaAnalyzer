import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { installApp, isInstalled, isStandalone } from '@/utils/pwa';

interface InstallBannerProps {
  className?: string;
}

export function InstallBanner({ className }: InstallBannerProps) {
  const { t } = useTranslation(['common']);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  useEffect(() => {
    // Don't show if already installed or in standalone mode
    if (isInstalled() || isStandalone()) {
      return;
    }

    // Check if user has dismissed the banner recently
    const dismissedAt = localStorage.getItem('alfalyzer-install-banner-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < oneDayMs) {
        return;
      }
    }

    // Listen for install prompt availability
    const handleInstallable = () => {
      setShowBanner(true);
    };

    const handleInstalled = () => {
      setShowBanner(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const result = await installApp();
      
      if (result?.outcome === 'accepted') {
        setShowBanner(false);
        localStorage.removeItem('alfalyzer-install-banner-dismissed');
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('alfalyzer-install-banner-dismissed', Date.now().toString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Card className={`fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-50 bg-gradient-to-r from-chartreuse/10 to-emerald-500/10 border-chartreuse/30 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-chartreuse/20 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-chartreuse" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Instalar Alfalyzer
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('general.mobile') === 'Telemóvel' 
                ? 'Acesso rápido aos mercados US/EU no seu telemóvel'
                : 'Quick access to US/EU markets on your mobile device'
              }
            </p>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={isInstalling}
                className="bg-chartreuse text-black hover:bg-chartreuse/90 text-xs h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8 px-2"
              >
                Mais tarde
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// PWA Status indicator for dev mode
export function PWAStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSWStatus] = useState<'loading' | 'active' | 'error'>('loading');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSWStatus('active'))
        .catch(() => setSWStatus('error'));
    } else {
      setSWStatus('error');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded-md font-mono">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        
        <div className={`w-2 h-2 rounded-full ${
          swStatus === 'active' ? 'bg-green-500' : 
          swStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        }`} />
        <span>SW: {swStatus}</span>
      </div>
    </div>
  );
}
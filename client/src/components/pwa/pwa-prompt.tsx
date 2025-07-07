import { useTranslation } from 'react-i18next';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export function PWAPrompt() {
  const { t } = useTranslation();
  const { 
    isInstallable, 
    isOffline, 
    updateAvailable, 
    installApp, 
    updateApp 
  } = usePWA();
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Mostra o prompt após 30 segundos se o app for instalável
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    
    if (success) {
      setShowInstallPrompt(false);
    }
    
    setIsInstalling(false);
  };

  const handleUpdate = () => {
    updateApp();
  };

  return (
    <>
      {/* Prompt de instalação */}
      {isInstallable && showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
          <Alert className="border-primary/50 bg-background/95 backdrop-blur">
            <Download className="h-4 w-4" />
            <AlertDescription className="pr-8">
              <div className="font-semibold mb-1">{t('pwa.install')}</div>
              <div className="text-sm opacity-90 mb-3">
                {t('pwa.installPrompt')}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall} 
                  size="sm"
                  disabled={isInstalling}
                >
                  {isInstalling ? t('common.loading') : t('pwa.install')}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowInstallPrompt(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </AlertDescription>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <span className="sr-only">{t('common.close')}</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Alert>
        </div>
      )}

      {/* Status offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t('pwa.offline')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Atualização disponível */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
          <Alert className="border-primary/50 bg-background/95 backdrop-blur">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">{t('pwa.newVersion')}</div>
              <Button 
                onClick={handleUpdate} 
                size="sm"
                className="mt-2"
              >
                {t('pwa.update')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}

// Componente para mostrar o botão de instalação no header/menu
export function PWAInstallButton() {
  const { t } = useTranslation();
  const { isInstallable, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isInstallable) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    await installApp();
    setIsInstalling(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleInstall}
      disabled={isInstalling}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">
        {isInstalling ? t('common.loading') : t('pwa.install')}
      </span>
    </Button>
  );
}
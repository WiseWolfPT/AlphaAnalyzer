// PWA Service Worker Registration and Management
// International Markets Focus (USA/EU)

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
}

let installPrompt: BeforeInstallPromptEvent | null = null;
let installState: PWAInstallState = {
  isInstallable: false,
  isInstalled: false,
  installPrompt: null,
  isStandalone: false
};

// Check if app is running in standalone mode
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// Check if app is installable
export const isInstallable = (): boolean => {
  return installPrompt !== null;
};

// Check if app is already installed
export const isInstalled = (): boolean => {
  return isStandalone() || localStorage.getItem('alfalyzer-pwa-installed') === 'true';
};

// Get current install state
export const getInstallState = (): PWAInstallState => {
  return {
    ...installState,
    isStandalone: isStandalone(),
    isInstalled: isInstalled(),
    isInstallable: isInstallable()
  };
};

// Register service worker
export const registerServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
    return false;
  }

  try {
    console.log('[PWA] Registering service worker for Alfalyzer');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[PWA] New service worker installing');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, refresh required');
              
              // Notify user about update
              const event = new CustomEvent('sw-update-available', {
                detail: { registration }
              });
              window.dispatchEvent(event);
            } else {
              console.log('[PWA] Content cached for offline use');
            }
          }
        });
      }
    });

    // Check for existing updates
    registration.update();

    return true;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return false;
  }
};

// Handle install prompt
export const setupInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    installPrompt = e as BeforeInstallPromptEvent;
    installState.installPrompt = installPrompt;
    installState.isInstallable = true;

    console.log('[PWA] Install prompt available');
    
    // Dispatch custom event for UI components
    const event = new CustomEvent('pwa-installable', {
      detail: { installPrompt }
    });
    window.dispatchEvent(event);
  });

  // Handle successful installation
  window.addEventListener('appinstalled', (e) => {
    console.log('[PWA] App installed successfully');
    
    installPrompt = null;
    installState.installPrompt = null;
    installState.isInstallable = false;
    installState.isInstalled = true;
    
    localStorage.setItem('alfalyzer-pwa-installed', 'true');
    
    // Dispatch custom event
    const event = new CustomEvent('pwa-installed');
    window.dispatchEvent(event);
  });
};

// Trigger install prompt
export const installApp = async (): Promise<{ outcome: string; platform: string } | null> => {
  if (!installPrompt) {
    console.warn('[PWA] Install prompt not available');
    return null;
  }

  try {
    console.log('[PWA] Showing install prompt');
    await installPrompt.prompt();
    
    const choiceResult = await installPrompt.userChoice;
    console.log('[PWA] User choice:', choiceResult.outcome);
    
    if (choiceResult.outcome === 'accepted') {
      installPrompt = null;
      installState.installPrompt = null;
      installState.isInstallable = false;
    }
    
    return choiceResult;
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return null;
  }
};

// Update service worker
export const updateServiceWorker = (): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker updated, reloading page');
      window.location.reload();
    });
  }
};

// Share API support
export const canShare = (): boolean => {
  return 'share' in navigator;
};

// Share content
export const shareContent = async (shareData: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if (!canShare()) {
    console.warn('[PWA] Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
};

// Notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Notification permission request failed:', error);
    return 'denied';
  }
};

// Show local notification
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'alfalyzer-notification',
      ...options
    });

    // Auto close after 5 seconds if not interacted with
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
};

// Background sync registration
export const registerBackgroundSync = (tag: string): void => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register(tag);
    }).catch((error) => {
      console.error('[PWA] Background sync registration failed:', error);
    });
  }
};

// Clear all caches
export const clearCaches = (): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }
};

// Cache market data
export const cacheMarketData = (symbols: string[]): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_MARKET_DATA',
      payload: { symbols }
    });
  }
};

// Initialize PWA features
export const initializePWA = async (): Promise<void> => {
  console.log('[PWA] Initializing Alfalyzer PWA features');
  
  // Register service worker
  await registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Update install state
  installState.isStandalone = isStandalone();
  installState.isInstalled = isInstalled();
  
  console.log('[PWA] PWA initialization complete');
  console.log('[PWA] Install state:', getInstallState());
};

// Export install state for React components
export { installState };
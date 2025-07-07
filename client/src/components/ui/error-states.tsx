import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  WifiOff, 
  ServerCrash, 
  ShieldAlert,
  RefreshCw,
  Home,
  FileQuestion,
  Ban
} from 'lucide-react';
import { FadeIn, ScaleIn, SlideIn, PageTransition, ModalTransition, LoadingSpinner } from "@/components/animations/motion-components";

interface ErrorStateProps {
  error?: Error | null;
  retry?: () => void;
  goHome?: () => void;
}

// Estado de erro genérico
export function ErrorState({ error, retry, goHome }: ErrorStateProps) {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.generic')}</h2>
      {error?.message && (
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        {retry && (
          <Button onClick={retry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        )}
        {goHome && (
          <Button onClick={goHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            {t('nav.dashboard')}
          </Button>
        )}
      </div>
    </FadeIn>
  );
}

// Estado de erro de rede
export function NetworkErrorState({ retry }: { retry?: () => void }) {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.network')}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Verifique sua conexão com a internet e tente novamente.
      </p>
      {retry && (
        <Button onClick={retry} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry')}
        </Button>
      )}
    </FadeIn>
  );
}

// Estado de erro do servidor
export function ServerErrorState({ retry }: { retry?: () => void }) {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <ServerCrash className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.serverError')}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Nossos servidores estão com problemas. Por favor, tente novamente em alguns minutos.
      </p>
      {retry && (
        <Button onClick={retry} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry')}
        </Button>
      )}
    </FadeIn>
  );
}

// Estado de não autorizado
export function UnauthorizedState({ onLogin }: { onLogin?: () => void }) {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.unauthorized')}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Você precisa fazer login para acessar este recurso.
      </p>
      {onLogin && (
        <Button onClick={onLogin} variant="default">
          {t('auth.login')}
        </Button>
      )}
    </FadeIn>
  );
}

// Estado de página não encontrada
export function NotFoundState({ goHome }: { goHome?: () => void }) {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.notFound')}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        A página que você está procurando não foi encontrada.
      </p>
      {goHome && (
        <Button onClick={goHome} variant="default">
          <Home className="h-4 w-4 mr-2" />
          {t('nav.dashboard')}
        </Button>
      )}
    </FadeIn>
  );
}

// Estado de quota excedida
export function QuotaExceededState() {
  const { t } = useTranslation();
  
  return (
    <FadeIn>
      <Ban className="h-16 w-16 text-amber-500 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{t('errors.quotaExceeded')}</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Você atingiu o limite de requisições. Por favor, aguarde alguns minutos antes de tentar novamente.
      </p>
      <div className="mt-4 p-4 bg-amber-500/10 rounded-lg">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          💡 Dica: Faça upgrade para o plano Pro para ter limites maiores!
        </p>
      </div>
    </FadeIn>
  );
}

// Card de erro inline
export function ErrorCard({ 
  title, 
  message, 
  retry 
}: { 
  title?: string; 
  message?: string; 
  retry?: () => void;
}) {
  const { t } = useTranslation();
  
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">{title || t('common.error')}</p>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </div>
        {retry && (
          <Button onClick={retry} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Hook para determinar qual componente de erro usar
export function useErrorComponent(error: Error | null) {
  if (!error) return null;
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return NetworkErrorState;
  }
  
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return UnauthorizedState;
  }
  
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return NotFoundState;
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    return QuotaExceededState;
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('server')) {
    return ServerErrorState;
  }
  
  return ErrorState;
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const FallbackDashboard: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
                Dashboard Temporariamente Indisponível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="space-y-4">
                  <p>
                    O dashboard principal não pôde ser carregado. Isto pode acontecer devido a:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Problemas temporários de conectividade</li>
                    <li>Atualizações do sistema em curso</li>
                    <li>Recursos não disponíveis momentaneamente</li>
                  </ul>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleRetry} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar Novamente
                    </Button>
                    <Button 
                      onClick={() => window.location.href = '/'} 
                      variant="outline" 
                      size="sm"
                    >
                      Voltar ao Início
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => window.location.href = '/find-stocks'}
                >
                  <div className="text-left">
                    <div className="font-medium">Pesquisar Ações</div>
                    <div className="text-sm text-muted-foreground">
                      Encontrar informações sobre ações
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => window.location.href = '/watchlists'}
                >
                  <div className="text-left">
                    <div className="font-medium">Listas de Seguimento</div>
                    <div className="text-sm text-muted-foreground">
                      Gerir as suas listas
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => window.location.href = '/earnings'}
                >
                  <div className="text-left">
                    <div className="font-medium">Calendário de Resultados</div>
                    <div className="text-sm text-muted-foreground">
                      Próximos resultados trimestrais
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => window.location.href = '/help'}
                >
                  <div className="text-left">
                    <div className="font-medium">Ajuda & Suporte</div>
                    <div className="text-sm text-muted-foreground">
                      Centro de ajuda
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FallbackDashboard;
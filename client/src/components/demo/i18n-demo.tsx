import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatDate, 
  formatDateTime,
  formatLargeNumber 
} from '@/lib/i18n';

export function I18nDemo() {
  const { t, i18n } = useTranslation();
  
  // Dados de exemplo
  const stockData = {
    symbol: 'AAPL',
    price: 189.84,
    change: 2.45,
    changePercent: 1.31,
    volume: 54789231,
    marketCap: 2950000000000,
    dividendYield: 0.44,
    lastUpdate: new Date()
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Internacionalização Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Idioma atual: {i18n.language === 'pt' ? 'Português' : 'English'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Textos traduzidos */}
          <div>
            <h3 className="font-semibold mb-2">Textos Traduzidos:</h3>
            <ul className="space-y-1 text-sm">
              <li>{t('stock.price')}: {stockData.symbol}</li>
              <li>{t('stock.marketCap')}: {t('stock.marketCap')}</li>
              <li>{t('dashboard.welcome', { name: 'João' })}</li>
            </ul>
          </div>

          {/* Formatação de moeda */}
          <div>
            <h3 className="font-semibold mb-2">Formatação de Moeda:</h3>
            <ul className="space-y-1 text-sm">
              <li>Preço: {formatCurrency(stockData.price)}</li>
              <li>Valor de Mercado: {formatCurrency(stockData.marketCap)}</li>
            </ul>
          </div>

          {/* Formatação de números */}
          <div>
            <h3 className="font-semibold mb-2">Formatação de Números:</h3>
            <ul className="space-y-1 text-sm">
              <li>Volume: {formatNumber(stockData.volume)}</li>
              <li>Volume (abreviado): {formatLargeNumber(stockData.volume)}</li>
              <li>Market Cap (abreviado): {formatLargeNumber(stockData.marketCap)}</li>
            </ul>
          </div>

          {/* Formatação de percentuais */}
          <div>
            <h3 className="font-semibold mb-2">Formatação de Percentuais:</h3>
            <ul className="space-y-1 text-sm">
              <li>Variação: {formatPercent(stockData.changePercent)}</li>
              <li>Dividend Yield: {formatPercent(stockData.dividendYield, 2)}</li>
            </ul>
          </div>

          {/* Formatação de datas */}
          <div>
            <h3 className="font-semibold mb-2">Formatação de Datas:</h3>
            <ul className="space-y-1 text-sm">
              <li>Data: {formatDate(stockData.lastUpdate)}</li>
              <li>Data/Hora: {formatDateTime(stockData.lastUpdate)}</li>
              <li>Data customizada: {formatDate(stockData.lastUpdate, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
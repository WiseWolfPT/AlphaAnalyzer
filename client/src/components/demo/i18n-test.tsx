import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/ui/language-selector';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatDate, 
  formatDateTime,
  formatLargeNumber 
} from '@/lib/i18n';

export function I18nTest() {
  const { t, i18n } = useTranslation();
  
  // Test data
  const testData = {
    price: 189.84,
    change: 2.45,
    changePercent: 1.31,
    volume: 54789231,
    marketCap: 2950000000000,
    dividendYield: 0.44,
    date: new Date()
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t('common.appName')} i18n Test
            <LanguageSelector />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Current language: {i18n.language === 'pt' ? 'Português' : 'English'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Toggle Buttons */}
          <div className="flex gap-2">
            <Button 
              variant={i18n.language === 'pt' ? 'default' : 'outline'}
              onClick={() => changeLanguage('pt')}
            >
              🇧🇷 Português
            </Button>
            <Button 
              variant={i18n.language === 'en' ? 'default' : 'outline'}
              onClick={() => changeLanguage('en')}
            >
              🇺🇸 English
            </Button>
          </div>

          {/* Common Translations */}
          <div>
            <h3 className="font-semibold mb-2">{t('common.common')}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{t('common.login')}</div>
              <div>{t('common.register')}</div>
              <div>{t('common.dashboard')}</div>
              <div>{t('common.settings')}</div>
              <div>{t('common.loading')}</div>
              <div>{t('common.save')}</div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-2">{t('navigation.navigation') || 'Navigation'}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{t('navigation.findStocks')}</div>
              <div>{t('navigation.intrinsicValue')}</div>
              <div>{t('navigation.watchlists')}</div>
              <div>{t('navigation.earnings')}</div>
            </div>
          </div>

          {/* Stock Data */}
          <div>
            <h3 className="font-semibold mb-2">{t('stock.stock') || 'Stock Data'}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{t('stock.price')}: {formatCurrency(testData.price)}</div>
              <div>{t('stock.volume')}: {formatLargeNumber(testData.volume)}</div>
              <div>{t('stock.marketCap')}: {formatLargeNumber(testData.marketCap)}</div>
              <div>{t('stock.change')}: {formatPercent(testData.changePercent)}</div>
            </div>
          </div>

          {/* New Sections */}
          <div>
            <h3 className="font-semibold mb-2">{t('watchlists.title')}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{t('watchlists.createNew')}</div>
              <div>{t('watchlists.addStock')}</div>
              <div>{t('watchlists.empty')}</div>
              <div>{t('watchlists.deleteConfirm')}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('portfolios.title')}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>{t('portfolios.totalValue')}</div>
              <div>{t('portfolios.todayChange')}</div>
              <div>{t('portfolios.holdings')}</div>
              <div>{t('portfolios.addTransaction')}</div>
            </div>
          </div>

          {/* Date/Time Formatting */}
          <div>
            <h3 className="font-semibold mb-2">Date/Time Formatting:</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>Date: {formatDate(testData.date)}</div>
              <div>DateTime: {formatDateTime(testData.date)}</div>
              <div>Custom: {formatDate(testData.date, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>
          </div>

          {/* Number Formatting */}
          <div>
            <h3 className="font-semibold mb-2">Number Formatting:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Volume: {formatNumber(testData.volume)}</div>
              <div>Large: {formatLargeNumber(testData.volume)}</div>
              <div>Currency: {formatCurrency(testData.price)}</div>
              <div>Percent: {formatPercent(testData.changePercent)}</div>
            </div>
          </div>

          {/* Messages */}
          <div>
            <h3 className="font-semibold mb-2">{t('messages.messages') || 'Messages'}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-green-600">{t('messages.success')}</div>
              <div className="text-blue-600">{t('messages.loading')}</div>
              <div className="text-red-600">{t('errors.generic')}</div>
              <div className="text-yellow-600">{t('messages.noData')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bell, DollarSign, TrendingUp, Volume2, Newspaper, AlertCircle, Check } from 'lucide-react';
import { db, type Alert as AlertType, type InsertAlert } from '@/lib/supabase';

interface AlertFormProps {
  symbol?: string;
  userId: string;
  onSuccess: (alert: AlertType) => void;
  onCancel: () => void;
  initialData?: Partial<AlertType>;
}

interface AlertFormData {
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'volume_spike' | 'news_sentiment' | 'technical_indicator';
  threshold_value: number;
  threshold_operator: '>' | '<' | '>=' | '<=' | '=';
  notification_methods: string[];
  condition_data?: string;
}

const alertTypes = [
  {
    value: 'price_above',
    label: 'Price Above',
    description: 'Alert when stock price rises above threshold',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    value: 'price_below',
    label: 'Price Below',
    description: 'Alert when stock price falls below threshold',
    icon: TrendingUp,
    color: 'text-red-600'
  },
  {
    value: 'volume_spike',
    label: 'Volume Spike',
    description: 'Alert when trading volume exceeds normal levels',
    icon: Volume2,
    color: 'text-blue-600'
  },
  {
    value: 'news_sentiment',
    label: 'News Sentiment',
    description: 'Alert on significant news sentiment changes',
    icon: Newspaper,
    color: 'text-purple-600'
  },
  {
    value: 'technical_indicator',
    label: 'Technical Signal',
    description: 'Alert on technical indicator signals (RSI, MACD, etc.)',
    icon: AlertCircle,
    color: 'text-orange-600'
  }
] as const;

const notificationMethods = [
  { value: 'app', label: 'In-App Notification', description: 'Show notification in the app' },
  { value: 'push', label: 'Push Notification', description: 'Browser push notification' },
  { value: 'email', label: 'Email Notification', description: 'Send email alert' }
];

export function AlertForm({ symbol = '', userId, onSuccess, onCancel, initialData }: AlertFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlertType, setSelectedAlertType] = useState<string>(initialData?.alert_type || '');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    initialData?.notification_methods?.split(',').map(m => m.trim()) || ['app']
  );

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AlertFormData>({
    defaultValues: {
      symbol: symbol || initialData?.symbol || '',
      alert_type: initialData?.alert_type || 'price_above',
      threshold_value: initialData?.threshold_value || 0,
      threshold_operator: initialData?.threshold_operator || '>',
      notification_methods: selectedNotifications,
      condition_data: initialData?.condition_data || ''
    }
  });

  const watchedAlertType = watch('alert_type');

  const onSubmit = async (data: AlertFormData) => {
    if (!selectedAlertType) {
      setError('Please select an alert type');
      return;
    }

    if (selectedNotifications.length === 0) {
      setError('Please select at least one notification method');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const alertData: InsertAlert = {
        user_id: userId,
        symbol: data.symbol.toUpperCase(),
        alert_type: selectedAlertType as any,
        threshold_value: data.threshold_value,
        threshold_operator: data.threshold_operator,
        notification_methods: selectedNotifications.join(','),
        condition_data: data.condition_data || null,
        is_active: true
      };

      const alert = await db.createAlert(alertData);
      
      if (alert) {
        onSuccess(alert);
      } else {
        throw new Error('Failed to create alert');
      }
    } catch (err) {
      console.error('Error creating alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNotificationMethod = (method: string) => {
    const updated = selectedNotifications.includes(method)
      ? selectedNotifications.filter(m => m !== method)
      : [...selectedNotifications, method];
    
    setSelectedNotifications(updated);
    setValue('notification_methods', updated);
  };

  const getThresholdLabel = () => {
    switch (selectedAlertType) {
      case 'price_above':
      case 'price_below':
        return 'Price Threshold ($)';
      case 'volume_spike':
        return 'Volume Multiplier (e.g., 2.0 for 2x normal volume)';
      case 'news_sentiment':
        return 'Sentiment Score Threshold (0.0 - 1.0)';
      case 'technical_indicator':
        return 'Indicator Threshold';
      default:
        return 'Threshold Value';
    }
  };

  const getThresholdPlaceholder = () => {
    switch (selectedAlertType) {
      case 'price_above':
        return 'e.g., 150.00';
      case 'price_below':
        return 'e.g., 120.00';
      case 'volume_spike':
        return 'e.g., 2.0';
      case 'news_sentiment':
        return 'e.g., 0.7';
      case 'technical_indicator':
        return 'e.g., 70';
      default:
        return 'Enter threshold value';
    }
  };

  const shouldShowOperator = () => {
    return ['technical_indicator', 'news_sentiment'].includes(selectedAlertType);
  };

  const shouldShowConditionData = () => {
    return selectedAlertType === 'technical_indicator';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {initialData ? 'Edit Alert' : 'Create New Alert'}
        </CardTitle>
        <CardDescription>
          Set up intelligent alerts to monitor your investments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Stock Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              {...register('symbol', { 
                required: 'Stock symbol is required',
                pattern: {
                  value: /^[A-Z]{1,5}$/,
                  message: 'Enter a valid stock symbol (1-5 letters)'
                }
              })}
              placeholder="e.g., AAPL"
              className="uppercase"
              onChange={(e) => e.target.value = e.target.value.toUpperCase()}
            />
            {errors.symbol && (
              <p className="text-sm text-red-600">{errors.symbol.message}</p>
            )}
          </div>

          {/* Alert Type */}
          <div className="space-y-3">
            <Label>Alert Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    className={`relative cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-colors ${
                      selectedAlertType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedAlertType(type.value);
                      setValue('alert_type', type.value);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${type.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{type.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                      {selectedAlertType === type.value && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threshold Configuration */}
          {selectedAlertType && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="threshold_value">{getThresholdLabel()}</Label>
                  <Input
                    id="threshold_value"
                    type="number"
                    step="any"
                    {...register('threshold_value', { 
                      required: 'Threshold value is required',
                      min: { value: 0, message: 'Value must be positive' }
                    })}
                    placeholder={getThresholdPlaceholder()}
                  />
                  {errors.threshold_value && (
                    <p className="text-sm text-red-600 mt-1">{errors.threshold_value.message}</p>
                  )}
                </div>

                {shouldShowOperator() && (
                  <div className="w-24">
                    <Label htmlFor="threshold_operator">Operator</Label>
                    <Select
                      value={watch('threshold_operator')}
                      onValueChange={(value) => setValue('threshold_operator', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Greater than</SelectItem>
                        <SelectItem value="<">Less than</SelectItem>
                        <SelectItem value=">=">Greater or equal</SelectItem>
                        <SelectItem value="<=">Less or equal</SelectItem>
                        <SelectItem value="=">Equal to</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {shouldShowConditionData() && (
                <div>
                  <Label htmlFor="condition_data">Technical Indicator Configuration</Label>
                  <Textarea
                    id="condition_data"
                    {...register('condition_data')}
                    placeholder='{"indicator": "RSI", "period": 14, "overbought": 70, "oversold": 30}'
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JSON configuration for technical indicators (optional)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notification Methods */}
          <div className="space-y-3">
            <Label>Notification Methods</Label>
            <div className="space-y-3">
              {notificationMethods.map((method) => (
                <div
                  key={method.value}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{method.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {method.description}
                    </div>
                  </div>
                  <Switch
                    checked={selectedNotifications.includes(method.value)}
                    onCheckedChange={() => toggleNotificationMethod(method.value)}
                  />
                </div>
              ))}
            </div>
            {selectedNotifications.length === 0 && (
              <p className="text-sm text-red-600">Select at least one notification method</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAlertType}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : initialData ? 'Update Alert' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
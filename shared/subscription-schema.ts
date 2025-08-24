export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  trialDays?: number;
  stripePriceIds?: {
    monthly: string;
    yearly: string;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  paymentMethod?: 'stripe';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

// 3-Tier Pricing Structure - Based on proven psychology (70% choose middle tier)
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for beginners getting started with investing',
    monthlyPrice: 9.99,
    yearlyPrice: 95.90, // Save 20% (was €119.88)
    currency: 'EUR',
    trialDays: 7,
    features: [
      '✅ Dados financeiros organizados e fáceis de ler',
      '✅ 5 ações no watchlist',
      '✅ 1 portfolio com tracking',
      '✅ Gráficos essenciais',
      '✅ Notícias do mercado',
      '❌ Sinais de compra/venda',
      '❌ AI Analysis'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Professional tools for serious investors',
    monthlyPrice: 19.99,
    yearlyPrice: 191.90, // Save 20% (was €239.88)
    currency: 'EUR',
    badge: 'MAIS POPULAR 🔥',
    highlighted: true,
    trialDays: 7,
    features: [
      '✅ Tudo do Starter +',
      '✅ Sinais de Compra/Venda (baseado em indicadores)',
      '✅ Watchlists ilimitados',
      '✅ 5 portfolios',
      '✅ Alertas de preço (sabe quando agir!)',
      '✅ Todos os 14 gráficos profissionais',
      '✅ Calculadora Valor Intrínseco',
      '✅ Comparação entre empresas',
      '✅ AI Analysis: 50 créditos/mês'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'AI-powered insights for advanced traders',
    monthlyPrice: 39.99,
    yearlyPrice: 383.90, // Save 20% (was €479.88)
    currency: 'EUR',
    trialDays: 7,
    features: [
      '✅ Tudo do Pro +',
      '✅ AI Analysis: Ilimitada',
      '✅ AI Stock Comparison (compare múltiplas)',
      '✅ AI Buy/Sell Recommendations',
      '✅ AI Risk Assessment',
      '✅ AI Portfolio Review',
      '✅ "Porque comprar/vender agora" (AI explica)',
      '✅ Portfolios ilimitados',
      '✅ Alertas ilimitados',
      '✅ Suporte prioritário'
    ]
  }
];

// Feature limits per tier (for enforcement)
export const SUBSCRIPTION_LIMITS = {
  free: {
    watchlistStocks: 3,
    portfolios: 0,
    priceAlerts: 0,
    charts: ['price'],
    aiAnalysis: false
  },
  starter: {
    watchlistStocks: 5,
    portfolios: 1,
    priceAlerts: 0,
    charts: ['price', 'revenue', 'ebitda', 'netIncome'],
    aiAnalysis: false
  },
  pro: {
    watchlistStocks: -1, // unlimited
    portfolios: 5,
    priceAlerts: -1, // unlimited
    charts: 'all',
    aiAnalysis: false,
    signals: true
  },
  elite: {
    watchlistStocks: -1, // unlimited
    portfolios: -1, // unlimited
    priceAlerts: -1, // unlimited
    charts: 'all',
    aiAnalysis: true,
    signals: true
  }
};

export const SUBSCRIPTION_STATUS_LABELS = {
  trial: 'Free Trial',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled'
};

export const SUBSCRIPTION_STATUS_COLORS = {
  trial: 'bg-blue-500/10 text-blue-500',
  active: 'bg-green-500/10 text-green-500',
  expired: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500'
};
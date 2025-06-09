export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  trialDays?: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  paymentMethod?: 'whop' | 'stripe';
  stripeSubscriptionId?: string;
  whopOrderId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'whop-trial',
    name: 'Community Access',
    description: 'Get 7-day free trial with Whop community subscription',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    trialDays: 7,
    features: [
      '7-day free trial',
      'Full platform access',
      'Discord community access',
      'Exclusive courses',
      'Market analysis tools',
      'Portfolio tracking'
    ]
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    description: 'Full access to Alpha Analyzer',
    price: 29.99,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Unlimited stock analysis',
      'Advanced portfolio tracking',
      'Real-time alerts',
      'Intrinsic value calculator',
      'Export capabilities',
      'Priority support'
    ]
  },
  {
    id: 'annual',
    name: 'Annual Pro',
    description: 'Best value - 2 months free!',
    price: 299.99,
    currency: 'EUR',
    interval: 'year',
    isPopular: true,
    features: [
      'All Monthly Pro features',
      '2 months free (save 17%)',
      'Advanced analytics dashboard',
      'Custom alerts & notifications',
      'Priority customer support',
      'Early access to new features'
    ]
  }
];

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
// React components for freemium to premium upgrade flows
// This demonstrates a complete upgrade flow with pricing tiers and feature comparison

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

// Types
interface SubscriptionTier {
  id: string;
  name: string;
  priceId: string;
  features: string[];
  limits: {
    apiCalls?: number;
    storage?: number;
    users?: number;
  };
  recommended?: boolean;
  price?: number;
  interval?: string;
}

interface User {
  id: string;
  email: string;
  customerId: string;
  currentTier: string;
  subscription?: {
    id: string;
    status: string;
    current_period_end: number;
    trial_end?: number;
  };
}

// ==========================================
// PRICING TABLE COMPONENT
// ==========================================

interface PricingTableProps {
  tiers: SubscriptionTier[];
  currentUser: User;
  onUpgrade: (tierId: string, priceId: string) => void;
  loading?: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  tiers,
  currentUser,
  onUpgrade,
  loading = false
}) => {
  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Choose Your Plan</h2>
        <p>Upgrade or downgrade at any time. No hidden fees.</p>
      </div>
      
      <div className="pricing-grid">
        {tiers.map((tier) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            currentUser={currentUser}
            onUpgrade={onUpgrade}
            loading={loading}
          />
        ))}
      </div>
      
      <style jsx>{`
        .pricing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .pricing-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #1a202c;
        }
        
        .pricing-header p {
          font-size: 1.1rem;
          color: #718096;
        }
        
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          align-items: start;
        }
      `}</style>
    </div>
  );
};

// ==========================================
// PRICING CARD COMPONENT
// ==========================================

interface PricingCardProps {
  tier: SubscriptionTier;
  currentUser: User;
  onUpgrade: (tierId: string, priceId: string) => void;
  loading: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  currentUser,
  onUpgrade,
  loading
}) => {
  const isCurrentTier = currentUser.currentTier === tier.id;
  const isUpgrade = tier.id !== 'free' && currentUser.currentTier === 'free';
  const isDowngrade = tier.id === 'free' && currentUser.currentTier !== 'free';
  
  const formatPrice = (price?: number) => {
    if (!price) return 'Free';
    return `$${price}/month`;
  };

  const formatLimit = (value: number, unit: string) => {
    if (value === -1) return `Unlimited ${unit}`;
    return `${value.toLocaleString()} ${unit}`;
  };

  const handleUpgradeClick = () => {
    if (!loading && tier.priceId) {
      onUpgrade(tier.id, tier.priceId);
    }
  };

  return (
    <div className={`pricing-card ${tier.recommended ? 'recommended' : ''} ${isCurrentTier ? 'current' : ''}`}>
      {tier.recommended && (
        <div className="recommended-badge">
          Most Popular
        </div>
      )}
      
      <div className="card-header">
        <h3>{tier.name}</h3>
        <div className="price">
          {formatPrice(tier.price)}
          {tier.interval && tier.price && (
            <span className="interval">/{tier.interval}</span>
          )}
        </div>
      </div>
      
      <div className="card-features">
        <h4>Features:</h4>
        <ul>
          {tier.features.map((feature, index) => (
            <li key={index}>
              <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="card-limits">
        <h4>Usage Limits:</h4>
        <ul>
          {tier.limits.apiCalls && (
            <li>{formatLimit(tier.limits.apiCalls, 'API calls/month')}</li>
          )}
          {tier.limits.storage && (
            <li>{formatLimit(tier.limits.storage, 'GB storage')}</li>
          )}
          {tier.limits.users && (
            <li>{formatLimit(tier.limits.users, 'team members')}</li>
          )}
        </ul>
      </div>
      
      <div className="card-footer">
        {isCurrentTier ? (
          <button className="btn btn-current" disabled>
            Current Plan
          </button>
        ) : (
          <button
            className={`btn ${isUpgrade ? 'btn-upgrade' : 'btn-change'}`}
            onClick={handleUpgradeClick}
            disabled={loading}
          >
            {loading ? 'Processing...' : isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Switch Plan'}
          </button>
        )}
      </div>
      
      <style jsx>{`
        .pricing-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          border: 2px solid #e2e8f0;
          position: relative;
          transition: all 0.3s ease;
          height: fit-content;
        }
        
        .pricing-card:hover {
          border-color: #3182ce;
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }
        
        .pricing-card.recommended {
          border-color: #3182ce;
          box-shadow: 0 8px 16px rgba(49, 130, 206, 0.2);
        }
        
        .pricing-card.current {
          border-color: #48bb78;
          background: linear-gradient(to bottom, #f0fff4, white);
        }
        
        .recommended-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #3182ce;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .card-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .card-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        
        .price {
          font-size: 2.5rem;
          font-weight: 800;
          color: #3182ce;
        }
        
        .interval {
          font-size: 1rem;
          color: #718096;
        }
        
        .card-features, .card-limits {
          margin-bottom: 2rem;
        }
        
        .card-features h4, .card-limits h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2d3748;
        }
        
        .card-features ul, .card-limits ul {
          list-style: none;
          padding: 0;
        }
        
        .card-features li, .card-limits li {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
          color: #4a5568;
        }
        
        .check-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #48bb78;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .card-footer {
          margin-top: auto;
        }
        
        .btn {
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .btn-current {
          background: #48bb78;
          color: white;
        }
        
        .btn-upgrade {
          background: #3182ce;
          color: white;
        }
        
        .btn-upgrade:hover:not(:disabled) {
          background: #2c5aa0;
          transform: translateY(-1px);
        }
        
        .btn-change {
          background: #718096;
          color: white;
        }
        
        .btn-change:hover:not(:disabled) {
          background: #4a5568;
        }
      `}</style>
    </div>
  );
};

// ==========================================
// UPGRADE FLOW COMPONENT
// ==========================================

interface UpgradeFlowProps {
  user: User;
  selectedTier: SubscriptionTier;
  onSuccess: (subscription: any) => void;
  onCancel: () => void;
}

const UpgradeFlow: React.FC<UpgradeFlowProps> = ({
  user,
  selectedTier,
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCheckout, setUseCheckout] = useState(true);

  const handleCheckoutUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.customerId,
          priceId: selectedTier.priceId,
          trialDays: selectedTier.id === 'pro' ? 14 : undefined, // 14-day trial for Pro
        }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.url;
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectUpgrade = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment method creation failed');
        setLoading(false);
        return;
      }

      // Create or update subscription
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.customerId,
          priceId: selectedTier.priceId,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-flow">
      <div className="upgrade-header">
        <h2>Upgrade to {selectedTier.name}</h2>
        <p>Complete your upgrade to unlock premium features</p>
      </div>

      <div className="upgrade-summary">
        <h3>Plan Summary</h3>
        <div className="summary-details">
          <div className="summary-row">
            <span>Plan:</span>
            <span>{selectedTier.name}</span>
          </div>
          <div className="summary-row">
            <span>Price:</span>
            <span>${selectedTier.price}/month</span>
          </div>
          {selectedTier.id === 'pro' && (
            <div className="summary-row trial">
              <span>Trial:</span>
              <span>14 days free</span>
            </div>
          )}
        </div>
      </div>

      <div className="upgrade-options">
        <div className="option-toggle">
          <label>
            <input
              type="radio"
              name="upgradeMethod"
              checked={useCheckout}
              onChange={() => setUseCheckout(true)}
            />
            Use Stripe Checkout (Recommended)
          </label>
          <label>
            <input
              type="radio"
              name="upgradeMethod"
              checked={!useCheckout}
              onChange={() => setUseCheckout(false)}
            />
            Enter payment details here
          </label>
        </div>

        {useCheckout ? (
          <div className="checkout-option">
            <p>You'll be redirected to a secure Stripe checkout page to complete your upgrade.</p>
            <button
              className="btn btn-primary"
              onClick={handleCheckoutUpgrade}
              disabled={loading}
            >
              {loading ? 'Creating session...' : 'Continue to Checkout'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleDirectUpgrade} className="direct-upgrade-form">
            <div className="card-input">
              <label>Payment Information</label>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !stripe}
            >
              {loading ? 'Processing...' : `Upgrade to ${selectedTier.name}`}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="upgrade-footer">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <style jsx>{`
        .upgrade-flow {
          max-width: 500px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        
        .upgrade-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .upgrade-header h2 {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        
        .upgrade-header p {
          color: #718096;
        }
        
        .upgrade-summary {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }
        
        .upgrade-summary h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2d3748;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding: 0.5rem 0;
        }
        
        .summary-row.trial {
          color: #48bb78;
          font-weight: 600;
        }
        
        .upgrade-options {
          margin-bottom: 2rem;
        }
        
        .option-toggle {
          margin-bottom: 1.5rem;
        }
        
        .option-toggle label {
          display: block;
          margin-bottom: 0.5rem;
          cursor: pointer;
        }
        
        .option-toggle input {
          margin-right: 0.5rem;
        }
        
        .checkout-option {
          text-align: center;
          padding: 1.5rem;
          background: #f7fafc;
          border-radius: 8px;
        }
        
        .checkout-option p {
          margin-bottom: 1rem;
          color: #4a5568;
        }
        
        .direct-upgrade-form {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 8px;
        }
        
        .card-input {
          margin-bottom: 1.5rem;
        }
        
        .card-input label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #2d3748;
        }
        
        .btn {
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .btn-primary {
          background: #3182ce;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #2c5aa0;
        }
        
        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
          margin-top: 1rem;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e0;
        }
        
        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          text-align: center;
        }
        
        .upgrade-footer {
          text-align: center;
          border-top: 1px solid #e2e8f0;
          padding-top: 1.5rem;
        }
      `}</style>
    </div>
  );
};

// ==========================================
// MAIN FREEMIUM UPGRADE COMPONENT
// ==========================================

interface FreemiumUpgradeFlowProps {
  user: User;
  onUpgradeComplete?: (subscription: any) => void;
}

export const FreemiumUpgradeFlow: React.FC<FreemiumUpgradeFlowProps> = ({
  user,
  onUpgradeComplete
}) => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  const fetchPricingTiers = async () => {
    try {
      const response = await fetch('/api/pricing');
      const data = await response.json();
      
      if (data.success) {
        setTiers(data.data);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const handleUpgrade = (tierId: string, priceId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (tier) {
      setSelectedTier(tier);
      setShowUpgradeFlow(true);
    }
  };

  const handleUpgradeSuccess = (subscription: any) => {
    setShowUpgradeFlow(false);
    setSelectedTier(null);
    if (onUpgradeComplete) {
      onUpgradeComplete(subscription);
    }
  };

  const handleUpgradeCancel = () => {
    setShowUpgradeFlow(false);
    setSelectedTier(null);
  };

  if (showUpgradeFlow && selectedTier) {
    return (
      <Elements stripe={stripePromise}>
        <UpgradeFlow
          user={user}
          selectedTier={selectedTier}
          onSuccess={handleUpgradeSuccess}
          onCancel={handleUpgradeCancel}
        />
      </Elements>
    );
  }

  return (
    <PricingTable
      tiers={tiers}
      currentUser={user}
      onUpgrade={handleUpgrade}
      loading={loading}
    />
  );
};

// ==========================================
// FEATURE GATE COMPONENT
// ==========================================

interface FeatureGateProps {
  featureName: string;
  currentUser: User;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureName,
  currentUser,
  fallback,
  children
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccess();
  }, [currentUser.customerId, featureName]);

  const checkAccess = async () => {
    try {
      const response = await fetch(
        `/api/customers/${currentUser.customerId}/features/${encodeURIComponent(featureName)}`
      );
      const data = await response.json();
      
      if (data.success) {
        setHasAccess(data.data.hasAccess);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    }
  };

  if (hasAccess === null) {
    return <div>Checking access...</div>;
  }

  if (!hasAccess) {
    return (
      <>
        {fallback || (
          <div className="feature-gate-fallback">
            <h3>Upgrade Required</h3>
            <p>This feature requires a premium subscription.</p>
            <button
              className="upgrade-btn"
              onClick={() => {
                // Redirect to pricing or show upgrade modal
                window.location.href = '/pricing';
              }}
            >
              Upgrade Now
            </button>
            
            <style jsx>{`
              .feature-gate-fallback {
                text-align: center;
                padding: 2rem;
                background: #f7fafc;
                border-radius: 8px;
                border: 2px dashed #cbd5e0;
              }
              
              .upgrade-btn {
                background: #3182ce;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 1rem;
              }
              
              .upgrade-btn:hover {
                background: #2c5aa0;
              }
            `}</style>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default FreemiumUpgradeFlow;
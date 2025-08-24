import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Zap, Star, Crown, ArrowRight } from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@shared/subscription-schema";
import { stripeService } from "@/services/stripe-service";
import { useToast } from "@/components/ui/use-toast";

interface PricingPlansProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
}

export function PricingPlans({ currentPlan, onSelectPlan }: PricingPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan.id, billingCycle);
      return;
    }

    // Direct Stripe checkout
    setLoading(plan.id);
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'pro':
        return <Star className="h-6 w-6 text-purple-500" />;
      case 'elite':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanButtonText = (plan: SubscriptionPlan) => {
    if (currentPlan === `${plan.id}-${billingCycle}`) {
      return 'Current Plan';
    }
    if (loading === plan.id) {
      return 'Processing...';
    }
    return 'Start 7-Day Free Trial';
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const period = billingCycle === 'yearly' ? 'year' : 'month';
    return `€${price}/${period}`;
  };

  const calculateSavings = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      const yearlyTotal = plan.yearlyPrice;
      const monthlyTotal = plan.monthlyPrice * 12;
      const savings = monthlyTotal - yearlyTotal;
      const percentage = 20; // Fixed 20% discount for all tiers
      return { amount: savings.toFixed(2), percentage };
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Choose Your Investment Edge
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Professional tools trusted by over 10,000 investors. Start with a 7-day free trial.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Label 
            htmlFor="billing-toggle" 
            className={`text-lg ${billingCycle === 'monthly' ? 'text-white' : 'text-muted-foreground'}`}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
            className="data-[state=checked]:bg-teya-green"
          />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="billing-toggle" 
              className={`text-lg ${billingCycle === 'yearly' ? 'text-white' : 'text-muted-foreground'}`}
            >
              Yearly
            </Label>
            {billingCycle === 'yearly' && (
              <Badge className="bg-gradient-to-r from-teya-green to-teya-green-dark text-white font-bold px-3 py-1 text-sm">
                SAVE 20%
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const savings = calculateSavings(plan);
          const isPopular = plan.highlighted;
          
          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isPopular 
                  ? 'border-teya-green shadow-2xl shadow-teya-green/20 scale-105 md:scale-110' 
                  : 'border-gray-800 hover:border-gray-700'
              } ${
                currentPlan === `${plan.id}-${billingCycle}` 
                  ? 'ring-2 ring-teya-green' 
                  : ''
              }`}
            >
              {/* Badges - Popular and Discount */}
              {plan.badge && (
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    {plan.badge}
                  </div>
                </div>
              )}
              
              {/* Discount Badge for Yearly */}
              {billingCycle === 'yearly' && (
                <div className="absolute -top-1 -left-1">
                  <div className="bg-gradient-to-r from-teya-green to-teya-green-dark text-white text-xs font-bold px-3 py-1 rounded-br-lg rounded-tl-lg animate-pulse">
                    SAVE 20%
                  </div>
                </div>
              )}

              <CardHeader className="space-y-4 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {getPlanIcon(plan.id)}
                    {plan.trialDays && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {plan.trialDays} days free
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    {billingCycle === 'yearly' && (
                      <span className="text-lg text-gray-500 line-through">
                        €{(plan.monthlyPrice * 12).toFixed(2)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-white">
                      €{billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {savings && billingCycle === 'yearly' && (
                    <div className="bg-teya-green/10 border border-teya-green/20 rounded-md px-2 py-1">
                      <p className="text-sm text-teya-green font-semibold">
                        💰 You save €{savings.amount} (20% discount)
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features List */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => {
                    const isIncluded = feature.startsWith('✅');
                    const isExcluded = feature.startsWith('❌');
                    const cleanFeature = feature.replace(/^[✅❌]\s*/, '');
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 ${
                          isExcluded ? 'opacity-50' : ''
                        }`}
                      >
                        {isIncluded ? (
                          <Check className="h-5 w-5 text-teya-green flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${
                          isExcluded ? 'text-gray-500 line-through' : 'text-gray-300'
                        }`}>
                          {cleanFeature}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full relative group ${
                    isPopular 
                      ? 'bg-gradient-to-r from-teya-green to-teya-green-dark hover:from-teya-green-dark hover:to-teya-green text-rich-black font-semibold h-12' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white h-11'
                  }`}
                  disabled={currentPlan === `${plan.id}-${billingCycle}` || loading === plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  size={isPopular ? "lg" : "default"}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {getPlanButtonText(plan)}
                    {!loading && !currentPlan && (
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </span>
                  {isPopular && (
                    <div className="absolute inset-0 bg-gradient-to-r from-teya-green/20 to-teya-green-dark/20 blur-xl group-hover:blur-2xl transition-all" />
                  )}
                </Button>

                {/* Money Back Guarantee */}
                {plan.trialDays && (
                  <p className="text-xs text-center text-muted-foreground">
                    No credit card required • Cancel anytime
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-teya-green" />
          <span className="text-sm text-muted-foreground">SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-teya-green" />
          <span className="text-sm text-muted-foreground">Stripe Secure Payments</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-teya-green" />
          <span className="text-sm text-muted-foreground">GDPR Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-teya-green" />
          <span className="text-sm text-muted-foreground">30-Day Money Back</span>
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          Questions? Contact us at{' '}
          <a href="mailto:support@alfalyzer.com" className="text-teya-green hover:underline">
            support@alfalyzer.com
          </a>{' '}
          or check our{' '}
          <a href="/faq" className="text-teya-green hover:underline">
            FAQ
          </a>
        </p>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Crown, Zap, Users, ExternalLink } from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@shared/subscription-schema";

interface PricingPlansProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string) => void;
}

export function PricingPlans({ currentPlan, onSelectPlan }: PricingPlansProps) {
  const [isWhopModalOpen, setIsWhopModalOpen] = useState(false);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    if (plan.id === 'whop-trial') {
      setIsWhopModalOpen(true);
    } else {
      onSelectPlan?.(plan.id);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'whop-trial':
        return <Users className="h-5 w-5" />;
      case 'monthly':
        return <Zap className="h-5 w-5" />;
      case 'annual':
        return <Crown className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getPlanButtonText = (plan: SubscriptionPlan) => {
    if (currentPlan === plan.id) {
      return 'Current Plan';
    }
    if (plan.id === 'whop-trial') {
      return 'Join Community';
    }
    return 'Subscribe Now';
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return 'Free Trial';
    return `€${price}/${interval}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Start with our community trial and upgrade for advanced features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.isPopular 
                ? 'border-primary shadow-lg shadow-primary/10' 
                : ''
            } ${
              currentPlan === plan.id 
                ? 'ring-2 ring-primary' 
                : ''
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getPlanIcon(plan.id)}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {formatPrice(plan.price, plan.currency, plan.interval)}
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
              {plan.trialDays && (
                <Badge variant="secondary" className="mx-auto">
                  {plan.trialDays} days free
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={plan.isPopular ? "default" : "outline"}
                disabled={currentPlan === plan.id}
                onClick={() => handlePlanSelect(plan)}
              >
                {getPlanButtonText(plan)}
                {plan.id === 'whop-trial' && (
                  <ExternalLink className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Whop Community Modal */}
      <Dialog open={isWhopModalOpen} onOpenChange={setIsWhopModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Our Community
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Subscribe to our exclusive community on Whop to get:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">7-day free trial to Alpha Analyzer</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Discord community access</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Exclusive investment courses</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Market analysis & insights</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsWhopModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  // Redirect to Whop subscription page
                  window.open('https://whop.com/your-community-link', '_blank');
                  setIsWhopModalOpen(false);
                }}
              >
                Join on Whop
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
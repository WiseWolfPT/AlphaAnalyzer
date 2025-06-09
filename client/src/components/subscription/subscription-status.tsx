import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CreditCard, 
  Crown, 
  Users, 
  Zap,
  AlertTriangle,
  CheckCircle 
} from "lucide-react";
import { 
  SUBSCRIPTION_PLANS, 
  SUBSCRIPTION_STATUS_LABELS, 
  SUBSCRIPTION_STATUS_COLORS,
  type UserSubscription 
} from "@shared/subscription-schema";

interface SubscriptionStatusProps {
  subscription: UserSubscription;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function SubscriptionStatus({ 
  subscription, 
  onUpgrade, 
  onManage 
}: SubscriptionStatusProps) {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[subscription.status];
  const statusColor = SUBSCRIPTION_STATUS_COLORS[subscription.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    const endDate = subscription.trialEndDate || subscription.endDate;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTrialProgress = () => {
    if (subscription.status !== 'trial' || !subscription.trialEndDate) return 0;
    
    const start = new Date(subscription.startDate);
    const end = new Date(subscription.trialEndDate);
    const now = new Date();
    
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const usedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(100, Math.max(0, (usedDays / totalDays) * 100));
  };

  const getPlanIcon = () => {
    switch (subscription.planId) {
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

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining <= 3 && subscription.status !== 'expired';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon()}
            <span>Current Subscription</span>
          </div>
          <Badge className={statusColor}>
            {statusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{plan?.name}</span>
            {plan?.price ? (
              <span className="text-sm text-muted-foreground">
                €{plan.price}/{plan.interval}
              </span>
            ) : (
              <span className="text-sm text-green-600">Free Trial</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan?.description}</p>
        </div>

        {/* Trial Progress */}
        {subscription.status === 'trial' && subscription.trialEndDate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Trial Progress</span>
              <span>{daysRemaining} days remaining</span>
            </div>
            <Progress value={getTrialProgress()} className="h-2" />
          </div>
        )}

        {/* Dates */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Started: {formatDate(subscription.startDate)}</span>
          </div>
          {subscription.trialEndDate && subscription.status === 'trial' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Trial ends: {formatDate(subscription.trialEndDate)}</span>
            </div>
          )}
          {subscription.status === 'active' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Next billing: {formatDate(subscription.endDate)}</span>
            </div>
          )}
        </div>

        {/* Payment Method */}
        {subscription.paymentMethod && (
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>
              Payment via {subscription.paymentMethod === 'whop' ? 'Whop Community' : 'Stripe'}
            </span>
          </div>
        )}

        {/* Warning for expiring trial */}
        {isExpiringSoon && subscription.status === 'trial' && (
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-600">
              Your trial expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Success message for active subscription */}
        {subscription.status === 'active' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">
              Your subscription is active and renewed automatically
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {(subscription.status === 'trial' || subscription.status === 'expired') && (
            <Button onClick={onUpgrade} className="flex-1">
              Upgrade Now
            </Button>
          )}
          {subscription.status === 'active' && onManage && (
            <Button variant="outline" onClick={onManage} className="flex-1">
              Manage Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
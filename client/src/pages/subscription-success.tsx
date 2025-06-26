import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'wouter';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeApiService } from '@/services/stripe-service';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        setLoading(true);
        
        if (!sessionId) {
          setError('No session ID provided');
          return;
        }

        // Get subscription status to verify the subscription was created
        const status = await stripeApiService.getSubscriptionStatus();
        setSubscriptionData(status);
        setError(null);
      } catch (err) {
        console.error('Error verifying subscription:', err);
        setError('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing your subscription...</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we verify your payment and set up your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <ExternalLink className="h-6 w-6" />
              Subscription Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              {error}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="outline" className="w-full">
                  View Subscription Status
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-8 w-8" />
            Subscription Activated!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to Alpha Analyzer Pro!</h2>
            <p className="text-muted-foreground">
              Your subscription has been successfully activated. You now have access to all premium features.
            </p>
          </div>

          {subscriptionData?.subscription && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Subscription Details</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p>Plan: <span className="font-medium">{subscriptionData.subscription.planId}</span></p>
                <p>Status: <span className="font-medium">{subscriptionData.subscription.status}</span></p>
                {subscriptionData.subscription.stripeData?.trialEnd && (
                  <p>Trial ends: <span className="font-medium">
                    {new Date(subscriptionData.subscription.stripeData.trialEnd).toLocaleDateString()}
                  </span></p>
                )}
                {subscriptionData.subscription.stripeData?.currentPeriodEnd && (
                  <p>Next billing: <span className="font-medium">
                    {new Date(subscriptionData.subscription.stripeData.currentPeriodEnd).toLocaleDateString()}
                  </span></p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">What's next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Access advanced stock analysis tools
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Create unlimited watchlists and portfolios
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Get real-time market data and alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Export your analysis and data
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                Start Analyzing Stocks
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? <Link href="/support" className="text-primary hover:underline">Contact our support team</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
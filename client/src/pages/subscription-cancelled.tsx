import { Link } from 'wouter';
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SubscriptionCancelled() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-orange-600">
            <XCircle className="h-8 w-8" />
            Subscription Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No worries!</h2>
            <p className="text-muted-foreground">
              Your subscription process was cancelled. You can try again anytime or continue using our free features.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What you can still do for free:</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Basic stock search and information</li>
              <li>• Create up to 2 watchlists</li>
              <li>• Basic portfolio tracking</li>
              <li>• Limited intrinsic value calculations</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Want to upgrade later?</h3>
            <p className="text-sm text-muted-foreground">
              You can upgrade to Premium anytime to unlock advanced features, unlimited watchlists, real-time data, and more.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue with Free Plan
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full">
                View Pricing Plans
              </Button>
            </Link>
          </div>

          <div className="border-t pt-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Have questions about our plans?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Our team is here to help you choose the right plan for your investment needs.
              </p>
              <Link href="/support">
                <Button variant="outline" size="sm" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Changed your mind? You can always <Link href="/subscription" className="text-primary hover:underline">upgrade to Premium</Link> later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
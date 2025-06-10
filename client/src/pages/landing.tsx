import { Button } from "@/components/ui/button";
import { ChevronRight, BarChart3, TrendingUp, Shield, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 text-center lg:pt-32">
            <div className="mx-auto max-w-4xl">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl">
                  <BarChart3 className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                <span className="block">Professional</span>
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Stock Analytics
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl lg:text-2xl max-w-3xl mx-auto">
                Discover undervalued stocks, track market trends, and make informed investment decisions with our advanced analytics platform.
              </p>

              {/* CTA Button */}
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Start Analyzing
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Features Grid */}
              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:shadow-lg transition-all duration-200">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Data</h3>
                  <p className="text-muted-foreground">Live stock prices, market indices, and financial metrics updated in real-time.</p>
                </div>

                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:shadow-lg transition-all duration-200">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Advanced Analytics</h3>
                  <p className="text-muted-foreground">Intrinsic value calculations, safety margins, and comprehensive stock analysis.</p>
                </div>

                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:shadow-lg transition-all duration-200">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Tracking</h3>
                  <p className="text-muted-foreground">Track your investments, watchlists, and get insights on your portfolio performance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
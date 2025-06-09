import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth/auth-modal";
import { LandingHeader } from "@/components/layout/landing-header";
import { useAuth } from "@/contexts/simple-auth";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Shield, 
  Target, 
  BarChart3, 
  Users, 
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  PlayCircle,
  MessageCircle,
  BookOpen,
  Crown,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Market Analysis",
    description: "Get live insights on stock performance with advanced technical indicators and market sentiment analysis."
  },
  {
    icon: Target,
    title: "Intrinsic Value Calculator",
    description: "Calculate true stock value using proven Adam Khoo methodology with customizable parameters."
  },
  {
    icon: Shield,
    title: "Risk Assessment Tools",
    description: "Identify overvalued and undervalued stocks with comprehensive risk metrics and safety margins."
  },
  {
    icon: BarChart3,
    title: "Advanced Charting",
    description: "Professional-grade charts with multiple timeframes, technical overlays, and pattern recognition."
  },
  {
    icon: Users,
    title: "Community Insights",
    description: "Join thousands of investors sharing strategies, tips, and market analysis in real-time."
  },
  {
    icon: Zap,
    title: "AI-Powered Alerts",
    description: "Never miss opportunities with intelligent notifications for price targets, earnings, and market events."
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Portfolio Manager",
    content: "Alpha Analyzer helped me identify undervalued gems before they took off. The intrinsic value calculator is incredibly accurate.",
    rating: 5
  },
  {
    name: "Mike Rodriguez",
    role: "Day Trader", 
    content: "The real-time alerts saved me from major losses during market volatility. Essential tool for serious investors.",
    rating: 5
  },
  {
    name: "Jessica Wong",
    role: "Financial Advisor",
    content: "My clients love the clear visualizations and comprehensive analysis. It's made my job so much easier.",
    rating: 5
  }
];

const pricingPlans = [
  {
    name: "Free (BETA)",
    price: "$0",
    period: "forever",
    badge: "Most Popular",
    badgeColor: "bg-emerald-500",
    features: [
      "Basic stock analysis",
      "3 watchlists",
      "Community access",
      "Mini charts",
      "Discord community"
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const
  },
  {
    name: "Pro",
    price: "$9",
    period: "month",
    badge: "Coming Soon",
    badgeColor: "bg-primary",
    features: [
      "Everything in Free",
      "Unlimited watchlists", 
      "Advanced charts",
      "Portfolio tracking",
      "Email alerts",
      "Priority support"
    ],
    cta: "Join Waitlist",
    ctaVariant: "default" as const
  },
  {
    name: "Premium",
    price: "$19", 
    period: "month",
    badge: "Best Value",
    badgeColor: "bg-amber-500",
    features: [
      "Everything in Pro",
      "Real-time data",
      "AI insights",
      "API access",
      "Custom indicators",
      "1-on-1 support"
    ],
    cta: "Join Waitlist",
    ctaVariant: "default" as const
  }
];

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        
        <div className="relative container mx-auto px-6 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Beta Badge */}
            <div className="flex justify-center mb-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Now in BETA - Free Access!
              </Badge>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Make <span className="text-primary">Smarter</span> Investment
              <br />
              Decisions with AI
            </h1>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Professional-grade stock analysis tools powered by proven methodologies. 
              Identify undervalued opportunities and build wealth like the pros.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/dashboard">
                <Button size="lg" className="text-lg px-8 py-4">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  {user ? 'Go to Dashboard' : 'Start Analyzing Free'}
                </Button>
              </Link>
              
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                <PlayCircle className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Hero Image/Dashboard Preview */}
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-8 shadow-2xl">
                <img 
                  src="/api/placeholder/800/500" 
                  alt="Alpha Analyzer Dashboard"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Beat the Market
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional tools and proven strategies used by successful investors worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Join the Alpha Community
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Learn from experienced investors and share strategies in our growing community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-border/50">
              <CardContent className="pt-8">
                <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Discord Community</h3>
                <p className="text-muted-foreground mb-4">
                  Real-time discussions, market alerts, and strategy sharing
                </p>
                <Button variant="outline" onClick={() => window.open('https://discord.gg/alphaanalyzer', '_blank')}>
                  Join Discord
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-border/50">
              <CardContent className="pt-8">
                <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Trading Courses</h3>
                <p className="text-muted-foreground mb-4">
                  Learn proven strategies from successful investors
                </p>
                <Button variant="outline" onClick={() => window.open('https://whop.com/alphaanalyzer', '_blank')}>
                  View Courses
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-border/50">
              <CardContent className="pt-8">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Live Streams</h3>
                <p className="text-muted-foreground mb-4">
                  Weekly market analysis and Q&A sessions
                </p>
                <Button variant="outline">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Trusted by Smart Investors
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our community is saying
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Start Free, Upgrade When Ready
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of investors already using Alpha Analyzer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={cn(
                "relative border-border/50",
                plan.name === "Free (BETA)" && "border-primary/50 shadow-lg scale-105"
              )}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className={cn("text-white", plan.badgeColor)}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={plan.ctaVariant}
                    onClick={() => plan.name === "Free (BETA)" ? setShowAuthModal(true) : undefined}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Ready to Make Smarter Investments?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join Alpha Analyzer today and start building wealth with confidence
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4"
                onClick={() => setShowAuthModal(true)}
              >
                <Crown className="h-5 w-5 mr-2" />
                Start Free Today
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                <MessageCircle className="h-5 w-5 mr-2" />
                Join Community
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  HelpCircle, 
  Search, 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  ExternalLink,
  ChevronDown,
  PlayCircle,
  FileText,
  Users,
  Lightbulb,
  ArrowRight,
  Star,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Help() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Search",
      description: `Searching for: "${searchQuery}"`,
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "Thank you for contacting us. We'll get back to you within 24 hours.",
    });
    setContactForm({ name: "", email: "", subject: "", message: "" });
  };

  const quickLinks = [
    {
      title: "Getting Started Guide",
      description: "Learn the basics of using Alfalyzer",
      icon: Book,
      href: "#getting-started",
      category: "Beginner"
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step tutorials",
      icon: Video,
      href: "#tutorials",
      category: "Learning"
    },
    {
      title: "API Documentation",
      description: "Technical documentation for developers",
      icon: FileText,
      href: "#api-docs",
      category: "Advanced"
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: Users,
      href: "#community",
      category: "Community"
    }
  ];

  const faqItems = [
    {
      question: "How do I calculate intrinsic value?",
      answer: "Alfalyzer automatically calculates intrinsic value using multiple methods including DCF (Discounted Cash Flow), P/E ratios, and proprietary algorithms. You can view the intrinsic value on any stock detail page or use our dedicated Intrinsic Value calculator.",
      category: "Analysis"
    },
    {
      question: "What data sources does Alfalyzer use?",
      answer: "We use multiple premium data sources including Alpha Vantage, Finnhub, Financial Modeling Prep, and Twelve Data to ensure accuracy and reliability. We also have fallback systems to maintain service availability.",
      category: "Data"
    },
    {
      question: "How often is the data updated?",
      answer: "Stock prices are updated in real-time during market hours. Fundamental data is updated quarterly after earnings releases. Our system automatically refreshes data based on market conditions.",
      category: "Data"
    },
    {
      question: "Can I export my watchlists and portfolios?",
      answer: "Yes! You can export your data in CSV format from the Settings page. This includes all your watchlists, portfolios, and historical data for your records.",
      category: "Account"
    },
    {
      question: "How do I set up price alerts?",
      answer: "Price alerts can be set up from any stock detail page. Click the 'Alert' button, set your target price, and choose your notification preferences. You'll receive notifications via email or in-app.",
      category: "Features"
    },
    {
      question: "What's the difference between Free and Pro plans?",
      answer: "Pro users get unlimited API calls, advanced charts, portfolio analytics, real-time alerts, and priority support. Free users have limited API calls and basic features.",
      category: "Subscription"
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription anytime from the Billing section in Settings. Your access will continue until the end of your current billing period.",
      category: "Subscription"
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes, we use bank-level SSL encryption and never store sensitive financial information like passwords or banking details. All data is encrypted both in transit and at rest.",
      category: "Security"
    }
  ];

  const tutorials = [
    {
      title: "Setting Up Your First Watchlist",
      duration: "5 min",
      level: "Beginner",
      thumbnail: "/api/placeholder/300/200"
    },
    {
      title: "Understanding Intrinsic Value",
      duration: "8 min",
      level: "Intermediate",
      thumbnail: "/api/placeholder/300/200"
    },
    {
      title: "Advanced Portfolio Analytics",
      duration: "12 min",
      level: "Advanced",
      thumbnail: "/api/placeholder/300/200"
    },
    {
      title: "Reading Earnings Reports",
      duration: "6 min",
      level: "Intermediate",
      thumbnail: "/api/placeholder/300/200"
    }
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Help Center</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers, learn new features, and get the most out of Alfalyzer
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help articles, tutorials, or FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
            <Button type="submit" className="absolute right-1 top-1/2 transform -translate-y-1/2">
              Search
            </Button>
          </form>
        </div>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="mb-8 grid w-full grid-cols-4">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-8">
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                        <link.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {link.description}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {link.category}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Step-by-step Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Quick Start Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      step: 1,
                      title: "Create Your Account",
                      description: "Sign up for your free trial and complete your profile setup.",
                      action: "Go to Registration",
                      href: "/register"
                    },
                    {
                      step: 2,
                      title: "Add Your First Stocks",
                      description: "Use the search feature to add stocks to your watchlist.",
                      action: "Go to Dashboard",
                      href: "/dashboard"
                    },
                    {
                      step: 3,
                      title: "Explore Stock Analysis",
                      description: "Click on any stock to view detailed analysis and charts.",
                      action: "View Example",
                      href: "/stock/AAPL"
                    },
                    {
                      step: 4,
                      title: "Set Up Alerts",
                      description: "Create price alerts to stay informed about your investments.",
                      action: "Learn More",
                      href: "#alerts"
                    }
                  ].map((guide) => (
                    <div key={guide.step} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {guide.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{guide.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{guide.description}</p>
                        <Button variant="outline" size="sm" onClick={() => setLocation(guide.href)}>
                          {guide.action}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {["All", "Analysis", "Data", "Features", "Account", "Subscription", "Security"].map((category) => (
                      <Button
                        key={category}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                      >
                        {category}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* FAQ List */}
              <div className="lg:col-span-3 space-y-4">
                {filteredFAQs.map((faq, index) => (
                  <Card key={index}>
                    <Collapsible 
                      open={openFAQ === index}
                      onOpenChange={(isOpen) => setOpenFAQ(isOpen ? index : null)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {faq.category}
                              </Badge>
                              <h3 className="font-medium text-left">{faq.question}</h3>
                            </div>
                            <ChevronDown className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform",
                              openFAQ === index ? "rotate-180" : ""
                            )} />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="border-l-2 border-primary/30 pl-4">
                            <p className="text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tutorials */}
          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorials.map((tutorial, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {tutorial.duration}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {tutorial.level}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {tutorial.title}
                    </h3>
                    <Button variant="outline" size="sm" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Watch Tutorial
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Request a Tutorial</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Don't see what you're looking for? Let us know what tutorial you'd like to see next.
                </p>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Suggest a Tutorial
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Send us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Options */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Other Ways to Reach Us</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Email Support</div>
                        <div className="text-sm text-muted-foreground">support@alfalyzer.com</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Response Time</div>
                        <div className="text-sm text-muted-foreground">Usually within 24 hours</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Community Forum</div>
                        <div className="text-sm text-muted-foreground">Get help from other users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status & Updates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">All systems operational</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Status Page
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
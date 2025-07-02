import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Eye, 
  Download, 
  Trash2, 
  AlertTriangle,
  ExternalLink,
  Crown,
  Moon,
  Sun,
  Globe,
  Database,
  Smartphone
} from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || "António Francisco",
    email: user?.email || "alcateiafinanceirapt@gmail.com",
    timezone: "Europe/Lisbon",
    language: "pt",
    currency: "EUR"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    priceAlerts: true,
    earningsReminders: true,
    weeklyDigest: true,
    marketNews: false,
    portfolioUpdates: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "private",
    shareWatchlists: false,
    sharePortfolio: false,
    analyticsOptOut: false
  });

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export will be ready shortly and sent to your email.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive"
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Pro Trial
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={profileData.timezone} onValueChange={(value) => setProfileData(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Lisbon">Europe/Lisbon</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={profileData.language} onValueChange={(value) => setProfileData(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={profileData.currency} onValueChange={(value) => setProfileData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Display Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex items-center gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex items-center gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  emailNotifications: "Email notifications",
                  priceAlerts: "Price alerts for watchlist stocks",
                  earningsReminders: "Upcoming earnings reminders",
                  weeklyDigest: "Weekly portfolio digest",
                  marketNews: "Market news and updates",
                  portfolioUpdates: "Portfolio performance updates"
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                    </div>
                    <Switch
                      checked={notificationSettings[key as keyof typeof notificationSettings]}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}

                <Separator />
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Control who can see your profile</p>
                  </div>
                  <Select value={privacySettings.profileVisibility} onValueChange={(value) => 
                    setPrivacySettings(prev => ({ ...prev, profileVisibility: value }))
                  }>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {Object.entries({
                  shareWatchlists: "Allow sharing of watchlists",
                  sharePortfolio: "Allow sharing of portfolio performance",
                  analyticsOptOut: "Opt out of analytics tracking"
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                    </div>
                    <Switch
                      checked={privacySettings[key as keyof typeof privacySettings]}
                      onCheckedChange={(checked) =>
                        setPrivacySettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription/Billing */}
          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                  <div>
                    <div className="font-semibold">Pro Trial</div>
                    <div className="text-sm text-muted-foreground">5 days remaining</div>
                  </div>
                  <Button 
                    onClick={() => setLocation('/subscription-success')}
                    className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold"
                  >
                    Upgrade to Pro
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Billing Information</h4>
                  <p className="text-sm text-muted-foreground">
                    No payment method on file. Add a payment method to continue your subscription after the trial.
                  </p>
                  <Button variant="outline" className="w-fit">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Usage & Limits</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">247</div>
                      <div className="text-sm text-muted-foreground">API Calls Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">∞</div>
                      <div className="text-sm text-muted-foreground">Watchlists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">3</div>
                      <div className="text-sm text-muted-foreground">Portfolios</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your data including watchlists, portfolios, and settings.
                  </p>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Data Sources</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Alpha Vantage</span>
                      <Badge variant="outline" className="text-xs">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Finnhub</span>
                      <Badge variant="outline" className="text-xs">Connected</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-red-600">Danger Zone</h4>
                  <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-600">Delete Account</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="mt-3"
                          onClick={handleDeleteAccount}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
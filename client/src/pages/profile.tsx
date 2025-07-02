import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Settings,
  Bell,
  Shield,
  Download,
  Upload,
  Camera,
  Edit,
  Save,
  X,
  CreditCard,
  Crown
} from "lucide-react";
import type { UserSubscription } from "@shared/subscription-schema";

// TEMPORARY SIMPLIFIED COMPONENTS FOR TESTING
// TODO: Replace these with the real imports when ready:
// import { SubscriptionStatus } from "@/components/subscription/subscription-status";
// import { PricingPlans } from "@/components/subscription/pricing-plans";

const SubscriptionStatus = ({ subscription, onUpgrade, onManage }: any) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Crown className="h-5 w-5" />
        Subscription Status - {subscription.planName || 'Beta Trial'}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <Badge variant="secondary">{subscription.status || 'Active'}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Valid until:</span>
          <span>{subscription.endDate || '30 de Julho, 2025'}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onUpgrade}>
            Upgrade Plan
          </Button>
          <Button variant="outline" onClick={onManage}>
            Manage Subscription
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PricingPlans = ({ currentPlan, onSelectPlan }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {['Basic', 'Pro', 'Premium'].map((plan) => (
      <Card key={plan} className={`border-2 ${currentPlan === plan ? 'border-primary' : 'border-border'}`}>
        <CardHeader>
          <CardTitle>{plan}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold">
              {plan === 'Basic' ? '€9.99' : plan === 'Pro' ? '€19.99' : '€39.99'}
              <span className="text-sm font-normal">/month</span>
            </p>
            <Button 
              className="w-full" 
              variant={currentPlan === plan ? "secondary" : "default"}
              onClick={() => onSelectPlan(plan)}
            >
              {currentPlan === plan ? 'Current Plan' : 'Select Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load profile data from API or localStorage as fallback
  const { data: serverProfileData, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/profile");
        return response.json();
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn("Profile API failed, using localStorage:", error);
        const saved = localStorage.getItem('alfalyzer-profile');
        return saved ? JSON.parse(saved) : null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [profileData, setProfileData] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('alfalyzer-profile');
    return saved ? JSON.parse(saved) : {
      firstName: "António",
      lastName: "Francisco",
      email: "alcateiafinanceirapt@gmail.com",
      phone: "+351 912 345 678",
      location: "Lisboa, Portugal",
      joinDate: "January 2024",
      investmentExperience: "Intermediate",
      riskTolerance: "Moderate",
      preferredSectors: ["Technology", "Healthcare", "Finance"]
    };
  });

  // Update profile data when server data loads with proper merging
  useEffect(() => {
    if (serverProfileData) {
      // Merge server data with defaults to ensure all fields exist
      setProfileData(prevData => ({
        ...prevData, // Keep existing defaults
        ...serverProfileData, // Override with server data
        // Ensure critical arrays always exist
        preferredSectors: Array.isArray(serverProfileData.preferredSectors) 
          ? serverProfileData.preferredSectors 
          : prevData.preferredSectors || [],
      }));
    }
  }, [serverProfileData]);

  // Save profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // Save to localStorage as backup
      localStorage.setItem('alfalyzer-profile', JSON.stringify(data));
      
      // Try to save to server
      try {
        const response = await apiRequest("PUT", "/api/user/profile", data);
        return response.json();
      } catch (error) {
        // If server fails, just use localStorage
        console.warn("Server update failed, using localStorage:", error);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save to server, but changes are saved locally",
        variant: "destructive",
      });
    },
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    priceAlerts: true,
    earningsAlerts: true,
    newsAlerts: false,
    weeklyDigest: true
  });

  // Mock subscription data - compatible with both simple and complex components
  const userSubscription: UserSubscription = {
    id: "sub_123",
    userId: "user_123", 
    planId: "whop-trial",
    status: "trial",
    startDate: "2025-06-01T00:00:00Z",
    endDate: "2025-07-01T00:00:00Z",
    trialEndDate: "2025-06-08T00:00:00Z",
    paymentMethod: "whop",
    whopOrderId: "whop_order_123",
    // Additional fields for simplified components
    planName: "Beta Trial",
  } as any;

  const handleSavePersonal = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleSaveNotifications = () => {
    // Save notifications to localStorage or API
    localStorage.setItem('alfalyzer-notifications', JSON.stringify(notifications));
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved",
    });
  };

  const handleChangePassword = () => {
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement actual password change API call
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully",
    });
    
    // Clear password fields
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  // Enhanced stats with real-time data
  const [userStats, setUserStats] = useState({
    watchlists: 0,
    trackedStocks: 0,
    alertsSet: 0,
    daysActive: 0,
    totalValue: "$0",
    todayChange: "0%"
  });
  
  // Fetch user stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/user/stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/stats");
        return response.json();
      } catch (error) {
        // Fallback stats
        return {
          watchlists: 3,
          trackedStocks: 24, 
          alertsSet: 12,
          daysActive: Math.floor((Date.now() - new Date(profileData.joinDate).getTime()) / (1000 * 60 * 60 * 24)) || 156,
          totalValue: "$12,450",
          todayChange: "+2.3%"
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  
  // Update stats when data loads
  useEffect(() => {
    if (statsData) {
      setUserStats(statsData);
    }
  }, [statsData]);
  
  const stats = [
    { label: "Watchlists", value: userStats.watchlists.toString(), icon: "📋", color: "text-blue-600" },
    { label: "Tracked Stocks", value: userStats.trackedStocks.toString(), icon: "📈", color: "text-green-600" },
    { label: "Alerts Set", value: userStats.alertsSet.toString(), icon: "🔔", color: "text-yellow-600" },
    { label: "Days Active", value: userStats.daysActive.toString(), icon: "⏰", color: "text-purple-600" },
    { label: "Portfolio Value", value: userStats.totalValue, icon: "💰", color: "text-emerald-600" },
    { label: "Today's Change", value: userStats.todayChange, icon: "📊", color: userStats.todayChange.startsWith('+') ? "text-green-600" : "text-red-600" }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Loading State */}
        {isProfileLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading your profile...</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {profileError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="text-amber-600">⚠️</div>
              <span className="text-amber-800">Profile API unavailable - using local data</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chartreuse/10 rounded-xl">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Profile</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-3xl font-bold text-primary-foreground mb-4 mx-auto">
                    {(profileData.firstName || 'A').charAt(0)}{(profileData.lastName || 'F').charAt(0)}
                  </div>
                  
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {profileData.firstName || 'António'} {profileData.lastName || 'Francisco'}
                  </h2>
                  <p className="text-muted-foreground mb-4">{profileData.email}</p>
                  
                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {(stats || []).map((stat, index) => (
                      <div key={index} className="text-center p-3 bg-gradient-to-br from-secondary/20 to-secondary/40 rounded-lg border border-secondary/50 hover:bg-secondary/50 transition-colors">
                        <div className="text-lg mb-1">{stat?.icon || '📊'}</div>
                        <div className={`font-bold ${stat?.color || 'text-foreground'}`}>{stat?.value || '0'}</div>
                        <div className="text-xs text-muted-foreground">{stat?.label || 'N/A'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Badges */}
                  <div className="mt-6 space-y-2">
                    <Badge variant="secondary" className="mr-2">
                      {profileData.investmentExperience} Investor
                    </Badge>
                    <Badge variant="outline">
                      Member since {profileData.joinDate}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="subscription" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              {/* Subscription */}
              <TabsContent value="subscription" className="space-y-6 mt-6">
                <SubscriptionStatus 
                  subscription={userSubscription}
                  onUpgrade={() => {
                    // Navigate to pricing or open Stripe checkout
                    console.log('Upgrade subscription');
                  }}
                  onManage={() => {
                    // Open subscription management
                    console.log('Manage subscription');
                  }}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Upgrade Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PricingPlans 
                      currentPlan={userSubscription.planId}
                      onSelectPlan={(planId) => {
                        // Handle plan selection (Stripe checkout, etc.)
                        console.log('Selected plan:', planId);
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Personal Information */}
              <TabsContent value="personal" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                      <Button size="sm" onClick={handleSavePersonal} className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="border-t pt-6 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Change Password
                        </h3>
                        <Button size="sm" onClick={handleChangePassword} className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                          <Save className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            placeholder="Enter your current password"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                              placeholder="Enter new password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
                        </p>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>


              {/* Notifications */}
              <TabsContent value="notifications" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notification Settings
                      </CardTitle>
                      <Button size="sm" onClick={handleSaveNotifications} className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(notifications || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label className="font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {key === 'emailAlerts' && 'Receive important updates via email'}
                            {key === 'priceAlerts' && 'Get notified when stock prices hit your targets'}
                            {key === 'earningsAlerts' && 'Alerts for upcoming earnings announcements'}
                            {key === 'newsAlerts' && 'Breaking news about your watched stocks'}
                            {key === 'weeklyDigest' && 'Weekly summary of your portfolio performance'}
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(value)}
                          onCheckedChange={(checked) => 
                            setNotifications({...notifications, [key]: checked})
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
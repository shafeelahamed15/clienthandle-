"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/common/LoadingState";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { BusinessProfileSettings } from "@/components/settings/BusinessProfileSettings";
import { getCurrentUser, getUserProfile, updateUserProfile, signOutUser } from "@/lib/auth";
import type { User } from '@supabase/supabase-js';
import { 
  UsersIcon, 
  BriefcaseIcon,
  RevenueIcon,
  ShieldIcon,
  SaveIcon,
  LogOutIcon
} from "@/components/icons";
import { Mail } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  plan: 'free' | 'pro';
  mfa_enabled: boolean;
  brand_logo_url?: string;
  brand_accent_color?: string;
  business_name?: string;
  business_type?: string;
  industry?: string;
  service_description?: string;
  target_clients?: string;
  business_phone?: string;
  business_website?: string;
  value_proposition?: string;
  typical_project_duration?: string;
  pricing_model?: string;
  communication_style?: string;
  profile_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [brandColor, setBrandColor] = useState("#0A84FF");
  const [businessInfo, setBusinessInfo] = useState({
    company: "",
    address: "",
    phone: "",
    website: "",
    taxId: ""
  });

  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/sign-in");
          return;
        }

        setUser(currentUser);
        
        const userProfile = await getUserProfile(currentUser.id);
        if (userProfile) {
          setProfile(userProfile);
          setDisplayName(userProfile.display_name || "");
          setBrandColor(userProfile.brand_accent_color || "#0A84FF");
        }

      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        display_name: displayName,
        brand_accent_color: brandColor,
        updated_at: new Date().toISOString()
      });

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName,
        brand_accent_color: brandColor,
        updated_at: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your settings..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 mb-2">Settings</h1>
        <p className="text-body text-muted-foreground">
          Manage your account, branding, and business preferences.
        </p>
      </div>

      {/* Email Configuration */}
      <Card className="p-6 border-0 shadow-apple-md mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-h3">Email Configuration</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-medium text-green-900 mb-1">Resend Email Service</h3>
                <p className="text-sm text-green-700 mb-3">
                  Production-ready email delivery with Resend. Professional email service with excellent deliverability.
                </p>
                <div className="text-xs text-green-600 space-y-1">
                  <p><strong>✅ Service:</strong> Resend - Modern email API</p>
                  <p><strong>✅ Free Tier:</strong> 3,000 emails per month</p>
                  <p><strong>✅ Features:</strong> HTML templates, attachments, tracking</p>
                  <p><strong>✅ Status:</strong> Ready for production deployment</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Email Status</div>
              <div className="text-green-600 font-medium">✅ Production Ready</div>
              <div className="text-xs text-gray-500 mt-1">Powered by Resend API</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">From Address</div>
              <div className="text-gray-600 font-mono text-xs">hello@yourdomain.com</div>
              <div className="text-xs text-gray-500 mt-1">Custom domain ready</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Business Profile Settings */}
      <BusinessProfileSettings />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="p-6 border-0 shadow-apple-md">
          <div className="flex items-center gap-2 mb-6">
            <UsersIcon size="md" variant="accent" />
            <h2 className="text-h3">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-body-small font-medium">Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-10 bg-muted/50 border-0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label className="text-body-small font-medium">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="h-10 bg-input border-0"
              />
            </div>

            <div>
              <Label className="text-body-small font-medium">Plan</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {profile?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </span>
                {profile?.plan === 'free' && (
                  <Button variant="outline" size="sm">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-body-small font-medium">Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </Card>

        {/* Brand Settings */}
        <Card className="p-6 border-0 shadow-apple-md">
          <div className="flex items-center gap-2 mb-6">
            <BriefcaseIcon size="md" variant="accent" />
            <h2 className="text-h3">Brand & Appearance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-body-small font-medium">Brand Color</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg border border-gray-200/40"
                  style={{ backgroundColor: brandColor }}
                />
                <Input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-20 h-10 p-1 border-0"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#0A84FF"
                  className="h-10 bg-input border-0 flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This color will be used in your invoices and branding
              </p>
            </div>

            <div>
              <Label className="text-body-small font-medium">Logo Upload</Label>
              <div className="border border-dashed border-gray-200/40 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Upload your company logo
                </p>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Business Information */}
        <Card className="p-6 border-0 shadow-apple-md">
          <div className="flex items-center gap-2 mb-6">
            <RevenueIcon size="md" variant="success" />
            <h2 className="text-h3">Business Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-body-small font-medium">Company Name</Label>
              <Input
                value={businessInfo.company}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Your Company Name"
                className="h-10 bg-input border-0"
              />
            </div>

            <div>
              <Label className="text-body-small font-medium">Business Address</Label>
              <Textarea
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Business St, City, State 12345"
                rows={3}
                className="bg-input border-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-body-small font-medium">Phone</Label>
                <Input
                  value={businessInfo.phone}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="h-10 bg-input border-0"
                />
              </div>
              <div>
                <Label className="text-body-small font-medium">Website</Label>
                <Input
                  value={businessInfo.website}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="h-10 bg-input border-0"
                />
              </div>
            </div>

            <div>
              <Label className="text-body-small font-medium">Tax ID / VAT Number</Label>
              <Input
                value={businessInfo.taxId}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, taxId: e.target.value }))}
                placeholder="Tax identification number"
                className="h-10 bg-input border-0"
              />
            </div>
          </div>
        </Card>

        {/* Feedback & Support */}
        <Card className="p-6 border-0 shadow-apple-md">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="h-5 w-5 text-purple-600" />
            <h2 className="text-h3">Feedback & Support</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-body-small font-medium">Help Us Improve</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Your feedback is invaluable for making ClientHandle better. Share your thoughts, report bugs, or request features.
              </p>
              <FeedbackWidget
                trigger={
                  <Button 
                    variant="outline" 
                    className="w-full justify-center animate-apple-press border-purple-200 hover:bg-purple-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Feedback
                  </Button>
                }
                placement="inline"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">MVP</div>
                <div className="text-xs text-purple-700">Version</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-xs text-blue-700">Support</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Security & Privacy */}
        <Card className="p-6 border-0 shadow-apple-md">
          <div className="flex items-center gap-2 mb-6">
            <ShieldIcon size="md" variant="accent" />
            <h2 className="text-h3">Security & Privacy</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-body-small font-medium">Two-Factor Authentication</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {profile?.mfa_enabled ? "Enabled" : "Disabled"}
                </p>
                <Button variant="outline" size="sm">
                  {profile?.mfa_enabled ? "Disable" : "Enable"} 2FA
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-body-small font-medium">Password</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Last changed: Never
                </p>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-body-small font-medium">Data Export</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Download all your data
                </p>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="p-6 border-0 shadow-apple-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-h3 mb-1">Save Changes</h3>
            <p className="text-sm text-muted-foreground">
              Make sure to save your changes before leaving this page.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleSignOut}
              className="animate-apple-press"
            >
              <LogOutIcon size="sm" className="mr-2" />
              Sign Out
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="animate-apple-press shadow-apple-sm"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <SaveIcon size="sm" className="mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
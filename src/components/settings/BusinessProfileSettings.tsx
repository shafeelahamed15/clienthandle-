'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface BusinessProfile {
  business_name: string;
  what_you_do: string;  // Simple one-line description
  business_details: string;  // Detailed description for AI context
  target_clients: string;  // Who they serve
  value_proposition: string;  // Key problems they solve
  communication_style: string;
}


const communicationStyles = [
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Warm & Personal' },
  { value: 'direct', label: 'Direct & Concise' }
];

export function BusinessProfileSettings() {
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: '',
    what_you_do: '',
    business_details: '',
    target_clients: '',
    value_proposition: '',
    communication_style: 'professional'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      setIsLoading(true);
      
      const user = await getCurrentUser();
      
      if (!user) return;

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          business_name, service_description as what_you_do, business_details, 
          target_clients, value_proposition, communication_style
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        // Handle missing columns (schema not applied yet)
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.log('💡 Business profile columns not yet added to database');
          setSaveMessage({ 
            type: 'error', 
            text: 'Business profile features require database setup. Please contact support or check deployment notes.' 
          });
          return;
        }
        
        // Handle user not found (normal for new users)
        if (error.code !== 'PGRST116') {
          console.error('Failed to load business profile:', error);
          setSaveMessage({ 
            type: 'error', 
            text: 'Unable to load business profile. Please try again.' 
          });
          return;
        }
      }

      if (userData) {
        // Populate form with existing data
        Object.keys(profile).forEach(key => {
          if (userData[key] !== null && userData[key] !== undefined) {
            setProfile(prev => ({ ...prev, [key]: userData[key] }));
          }
        });
      }
    } catch (error) {
      console.error('Load business profile error:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred while loading your profile.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = (field: keyof BusinessProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    // Clear save message when user makes changes
    if (saveMessage) setSaveMessage(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      const user = await getCurrentUser();
      console.log('Current user for save:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      });
      
      if (!user) {
        setSaveMessage({ type: 'error', text: 'Please sign in to save changes' });
        return;
      }

      // Map interface to database fields
      const updateData = {
        business_name: profile.business_name,
        service_description: profile.what_you_do,
        business_details: profile.business_details,
        target_clients: profile.target_clients,
        value_proposition: profile.value_proposition,
        communication_style: profile.communication_style,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Save error details:', {
          error,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          fullError: JSON.stringify(error, null, 2),
          updateData: JSON.stringify(updateData, null, 2),
          userId: user?.id
        });
        
        // Handle missing columns gracefully
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          setSaveMessage({ 
            type: 'error', 
            text: 'Business profile database schema needs to be applied. Please check the setup instructions or contact support.' 
          });
        } else {
          setSaveMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
        }
        return;
      }

      setSaveMessage({ type: 'success', text: 'Business profile saved successfully!' });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Save business profile error:', error);
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Business Profile</h3>
            <p className="text-blue-100 mt-1">
              Help our AI create intelligent, value-driven follow-ups that get responses
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">

        {/* AI Enhancement Notice */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 p-5 rounded-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-start space-x-4 relative">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-indigo-900 mb-2">Smart Value-First Follow-ups</h4>
              <p className="text-sm text-indigo-700 leading-relaxed">
                The more details you provide, the smarter our AI becomes. It will create personalized 
                follow-ups that provide genuine value to your clients first, making them more likely to respond positively.
              </p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-indigo-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Personalized</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Value-Driven</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Reply-Focused</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Schema Setup Notice - shown when database columns are missing */}
      {saveMessage?.type === 'error' && saveMessage.text.includes('database schema') && (
        <div className="bg-amber-50 p-4 rounded-lg mb-6 border border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Database Setup Required</h4>
              <p className="text-sm text-amber-800 mt-1">
                To use business profile features, the database schema needs to be applied.
              </p>
              <div className="mt-3 text-sm text-amber-800">
                <p className="font-medium">Manual Setup Steps:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Go to <a href="https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql" target="_blank" rel="noopener noreferrer" className="underline">Supabase SQL Editor</a></li>
                  <li>Copy the content from <code>supabase/business-profile-schema.sql</code></li>
                  <li>Paste and run in the SQL Editor</li>
                  <li>Refresh this page to use business profile features</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business_name" className="text-sm font-medium text-gray-700">
                  Business Name
                </Label>
                <Input
                  id="business_name"
                  value={profile.business_name}
                  onChange={(e) => updateProfile('business_name', e.target.value)}
                  placeholder="e.g., Sarah's Web Design Studio"
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                />
                <p className="text-xs text-gray-500">
                  How you want to be known to clients
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="what_you_do" className="text-sm font-medium text-gray-700">
                What You Do
              </Label>
              <Textarea
                id="what_you_do"
                value={profile.what_you_do}
                onChange={(e) => updateProfile('what_you_do', e.target.value)}
                placeholder="e.g., I design and build custom websites for small businesses"
                rows={3}
                maxLength={150}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Simple description of your services
                </p>
                <span className={`text-xs ${
                  profile.what_you_do.length > 130 ? 'text-amber-600' : 
                  profile.what_you_do.length > 100 ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {profile.what_you_do.length}/150
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="communication_style" className="text-sm font-medium text-gray-700">
                Communication Style
              </Label>
              <Select
                value={profile.communication_style}
                onValueChange={(value) => updateProfile('communication_style', value)}
              >
                <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                How you prefer to communicate with clients
              </p>
            </div>
          </div>
          
          {/* Right Column - Detailed Context */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900">AI Context & Intelligence</h4>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_details" className="text-sm font-medium text-gray-700">
                  Business Details
                  <span className="text-xs text-gray-500 ml-1">(For AI Context)</span>
                </Label>
                <Textarea
                  id="business_details"
                  value={profile.business_details}
                  onChange={(e) => updateProfile('business_details', e.target.value)}
                  placeholder="e.g., I specialize in e-commerce websites using Shopify and WordPress. I focus on conversion optimization and mobile-first design. My clients typically see 30-50% increase in online sales after launch."
                  rows={4}
                  maxLength={500}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Detailed expertise, specialties, and results
                  </p>
                  <span className={`text-xs ${
                    profile.business_details.length > 450 ? 'text-amber-600' : 
                    profile.business_details.length > 300 ? 'text-indigo-600' : 'text-gray-400'
                  }`}>
                    {profile.business_details.length}/500
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_clients" className="text-sm font-medium text-gray-700">
                  Who You Serve
                </Label>
                <Textarea
                  id="target_clients"
                  value={profile.target_clients}
                  onChange={(e) => updateProfile('target_clients', e.target.value)}
                  placeholder="e.g., Small business owners, restaurants, local service providers, online retailers, startups with 1-20 employees"
                  rows={3}
                  maxLength={200}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Types of clients - helps AI understand their perspective
                  </p>
                  <span className={`text-xs ${
                    profile.target_clients.length > 170 ? 'text-amber-600' : 
                    profile.target_clients.length > 120 ? 'text-indigo-600' : 'text-gray-400'
                  }`}>
                    {profile.target_clients.length}/200
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value_proposition" className="text-sm font-medium text-gray-700">
                  Key Problems You Solve
                </Label>
                <Textarea
                  id="value_proposition"
                  value={profile.value_proposition}
                  onChange={(e) => updateProfile('value_proposition', e.target.value)}
                  placeholder="e.g., Help businesses increase online visibility, streamline operations, reduce manual work, improve customer experience, boost sales conversions"
                  rows={3}
                  maxLength={300}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Main benefits - helps AI create value-focused messages
                  </p>
                  <span className={`text-xs ${
                    profile.value_proposition.length > 270 ? 'text-amber-600' : 
                    profile.value_proposition.length > 200 ? 'text-indigo-600' : 'text-gray-400'
                  }`}>
                    {profile.value_proposition.length}/300
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Save Button & Messages */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-xl border-l-4 ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 text-green-800 border-l-green-400 border border-green-200' 
                : 'bg-red-50 text-red-800 border-l-red-400 border border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                {saveMessage.type === 'success' ? (
                  <div className="p-1 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="p-1 bg-red-100 rounded-full">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                )}
                <span className="text-sm font-medium">{saveMessage.text}</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ready to save your business profile?</p>
              <p className="text-xs text-gray-500">This information helps our AI create better follow-ups.</p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              size="lg"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Business Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
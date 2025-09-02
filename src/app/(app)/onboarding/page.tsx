'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MessageSquare, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface BusinessProfile {
  business_name: string;
  service_description: string;
  communication_style: string;
}

const communicationStyles = [
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Warm & Personal' },
  { value: 'direct', label: 'Direct & Concise' }
];

const onboardingSteps = [
  {
    id: 'business',
    title: 'Your Business',
    description: 'Tell us your business name and what you do',
    icon: Building2
  },
  {
    id: 'communication',
    title: 'Communication Style', 
    description: 'How do you prefer to communicate with clients?',
    icon: MessageSquare
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: '',
    service_description: '',
    communication_style: 'professional'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Load existing profile if any
      const { data: userData } = await supabase
        .from('users')
        .select(`
          business_name, business_type, industry, service_description,
          target_clients, business_phone, business_website, value_proposition,
          typical_project_duration, pricing_model, communication_style,
          profile_completed, onboarding_step
        `)
        .eq('id', user.id)
        .single();

      if (userData) {
        // Populate form with existing data
        const profileKeys: (keyof BusinessProfile)[] = ['business_name', 'service_description', 'communication_style'];
        profileKeys.forEach(key => {
          if (userData[key]) {
            setProfile(prev => ({ ...prev, [key]: userData[key] }));
          }
        });
        
        // Set current step based on saved progress
        if (userData.onboarding_step) {
          setCurrentStep(Math.min(userData.onboarding_step, onboardingSteps.length - 1));
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  const updateProfile = (field: keyof BusinessProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basics
        return !!(profile.business_name && profile.business_type && profile.industry);
      case 1: // Services
        return !!(profile.service_description && profile.pricing_model);
      case 2: // Clients
        return !!(profile.target_clients && profile.value_proposition);
      case 3: // Communication
        return !!profile.communication_style;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceedFromStep(currentStep)) return;
    
    // Save progress after each step
    await saveProgress(currentStep + 1);
    
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveProgress = async () => {
    try {
      setIsSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({
          business_name: profile.business_name,
          service_description: profile.service_description,
          communication_style: profile.communication_style,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to save progress:', error);
        throw error;
      }
    } catch (error) {
      console.error('Save progress error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({
          business_name: profile.business_name,
          service_description: profile.service_description,
          communication_style: profile.communication_style,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Redirect to dashboard
      router.push('/dashboard?onboarding=complete');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const CurrentIcon = onboardingSteps[currentStep]?.icon || Building2;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
            <CurrentIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Welcome to ClientHandle
          </h1>
          <p className="text-gray-600 mt-2">
            Let&apos;s set up your business profile to create personalized AI follow-ups
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {onboardingSteps[currentStep]?.title}
            </h2>
            <p className="text-gray-600">
              {onboardingSteps[currentStep]?.description}
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 0: Business Info */}
            {currentStep === 0 && (
              <>
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={profile.business_name}
                    onChange={(e) => updateProfile('business_name', e.target.value)}
                    placeholder="e.g., Sarah's Web Design Studio"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How you want to be known to clients
                  </p>
                </div>

                <div>
                  <Label htmlFor="service_description">What You Do</Label>
                  <Textarea
                    id="service_description"
                    value={profile.service_description}
                    onChange={(e) => updateProfile('service_description', e.target.value)}
                    placeholder="e.g., I design and build custom websites for small businesses"
                    rows={3}
                    className="mt-1"
                    maxLength={150}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Simple description of your services ({profile.service_description.length}/150 characters)
                  </p>
                </div>
              </>
            )}

            {/* Step 1: Communication Style */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label htmlFor="communication_style">Communication Style</Label>
                  <Select
                    value={profile.communication_style}
                    onValueChange={(value) => updateProfile('communication_style', value)}
                  >
                    <SelectTrigger className="mt-1">
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
                  <p className="text-sm text-gray-500 mt-2">
                    How you prefer to communicate with clients
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Get Better Replies</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Our AI will use your business info to write creative follow-ups that 
                        make clients want to reply, using your preferred communication style.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceedFromStep(currentStep) || isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : currentStep === onboardingSteps.length - 1 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <button
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/dashboard')}
          >
            Skip for now (you can complete this later in Settings)
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, X, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { getUserProfile } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isPopular?: boolean;
  features: string[];
  limits: {
    clients: number | string;
    invoices: number | string;
    aiFollowups: number | string;
    emailReminders: number | string;
  };
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Basic invoice templates',
      'Email support',
      'Core features'
    ],
    limits: {
      clients: 2,
      invoices: 3,
      aiFollowups: 5,
      emailReminders: 10
    }
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Everything you need to grow',
    monthlyPrice: 15,
    yearlyPrice: 150,
    features: [
      'Professional templates',
      'Email support',
      'Advanced features'
    ],
    limits: {
      clients: 10,
      invoices: 20,
      aiFollowups: 25,
      emailReminders: 50
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for serious growth',
    monthlyPrice: 29,
    yearlyPrice: 290,
    isPopular: true,
    features: [
      'Premium templates',
      'Custom branding',
      'Analytics & reporting',
      'Priority support'
    ],
    limits: {
      clients: 50,
      invoices: 'Unlimited',
      aiFollowups: 100,
      emailReminders: 200
    }
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Enterprise-grade for teams and agencies',
    monthlyPrice: 59,
    yearlyPrice: 590,
    features: [
      'White-label templates',
      'Full custom branding',
      'Advanced analytics',
      'API access',
      'Team members (5)',
      'Dedicated account manager'
    ],
    limits: {
      clients: 'Unlimited',
      invoices: 'Unlimited',
      aiFollowups: 'Unlimited',
      emailReminders: 'Unlimited'
    }
  }
];

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    const loadUserPlan = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          setCurrentPlan(profile?.plan || 'free');
        }
      } catch (error) {
        console.error('Failed to load user plan:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserPlan();
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      return; // No upgrade needed for free plan
    }

    setUpgrading(planId);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planId,
          billingCycle: billingCycle
        })
      });
      
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setUpgrading(null);
    }
  };

  const getCurrentTier = () => pricingTiers.find(tier => tier.id === currentPlan) || pricingTiers[0];
  const currentTier = getCurrentTier();

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        </div>
        <p className="text-lg text-gray-600">
          Manage your plan and billing preferences
        </p>
      </div>

      {/* Current Plan */}
      <Card className="p-6 mb-8 border-blue-200 bg-blue-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              {currentTier.id === 'free' ? <Zap className="w-6 h-6 text-white" /> :
               currentTier.id === 'professional' ? <Shield className="w-6 h-6 text-white" /> :
               <BarChart3 className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">{currentTier.name} Plan</h2>
                {currentTier.isPopular && (
                  <Badge className="bg-purple-100 text-purple-700">Most Popular</Badge>
                )}
              </div>
              <p className="text-gray-600">{currentTier.description}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${billingCycle === 'yearly' ? Math.round(currentTier.yearlyPrice / 12) : currentTier.monthlyPrice}
              <span className="text-base font-normal text-gray-600">/month</span>
            </div>
            {billingCycle === 'yearly' && currentTier.monthlyPrice > 0 && (
              <p className="text-sm text-green-600 font-medium">
                Save ${(currentTier.monthlyPrice * 12) - currentTier.yearlyPrice}/year
              </p>
            )}
          </div>
        </div>

        {/* Current Plan Limits */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentTier.limits.clients}</div>
            <div className="text-sm text-gray-600">Clients</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentTier.limits.invoices}</div>
            <div className="text-sm text-gray-600">Invoices/month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentTier.limits.aiFollowups}</div>
            <div className="text-sm text-gray-600">AI Follow-ups/month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentTier.limits.emailReminders}</div>
            <div className="text-sm text-gray-600">Email reminders/month</div>
          </div>
        </div>
      </Card>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative ${
              billingCycle === 'yearly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* All Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingTiers.map((tier) => {
          const price = billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
          const monthlyEquivalent = billingCycle === 'yearly' ? tier.yearlyPrice / 12 : tier.monthlyPrice;
          const isCurrentPlan = currentPlan === tier.id;
          
          return (
            <Card
              key={tier.id}
              className={`p-6 relative transition-all duration-300 hover:shadow-lg ${
                tier.isPopular ? 'ring-2 ring-purple-500 shadow-xl' : ''
              } ${isCurrentPlan ? 'border-blue-500 bg-blue-50/30' : ''}`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white">Most Popular</Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-blue-500 text-white">Current Plan</Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    ${Math.round(monthlyEquivalent)}
                    <span className="text-base font-normal text-gray-600">/month</span>
                  </div>
                  {billingCycle === 'yearly' && tier.monthlyPrice > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Billed ${price} yearly
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isCurrentPlan || upgrading === tier.id}
                  className={`w-full mb-4 ${
                    isCurrentPlan
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : tier.isPopular
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  {upgrading === tier.id ? (
                    'Processing...'
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : tier.id === 'free' ? (
                    'Downgrade to Free'
                  ) : (
                    <span className="flex items-center gap-2">
                      Upgrade to {tier.name}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
            <p className="text-gray-600">
              Absolutely. Upgrade or downgrade your plan instantly with no hassles or cancellation fees.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What if I'm not satisfied?</h3>
            <p className="text-gray-600">
              We offer a 30-day money-back guarantee. If ClientHandle doesn't improve your workflow, get a full refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
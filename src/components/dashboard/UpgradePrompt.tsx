"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRight, X, Star, Crown } from 'lucide-react';
import { getUserProfile } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';

interface UpgradePromptProps {
  onDismiss?: () => void;
}

const upgradeReasons = [
  {
    title: "Unlimited AI Follow-ups",
    description: "Send as many AI-powered follow-ups as you need",
    icon: "🤖",
    highlight: "Most Popular"
  },
  {
    title: "Custom Branding", 
    description: "Add your logo and colors to invoices",
    icon: "🎨",
    highlight: "Professional"
  },
  {
    title: "Advanced Analytics",
    description: "Track reply rates and campaign performance",
    icon: "📊",
    highlight: "Data-Driven"
  }
];

export function UpgradePrompt({ onDismiss }: UpgradePromptProps) {
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isVisible, setIsVisible] = useState(false);
  const [currentReason, setCurrentReason] = useState(0);

  useEffect(() => {
    const loadUserPlan = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          const plan = profile?.plan || 'free';
          setUserPlan(plan);
          setIsVisible(plan === 'free');
        }
      } catch (error) {
        console.error('Failed to load user plan:', error);
      }
    };

    loadUserPlan();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCurrentReason((prev) => (prev + 1) % upgradeReasons.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleUpgrade = () => {
    window.location.href = '/subscription';
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || userPlan !== 'free') {
    return null;
  }

  const reason = upgradeReasons[currentReason];

  return (
    <Card className="p-6 bg-gradient-to-r from-purple-500 to-blue-600 text-white border-none shadow-xl relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 text-4xl">⭐</div>
        <div className="absolute bottom-4 left-4 text-2xl">✨</div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl opacity-5">👑</div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Crown className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Upgrade to Professional</h3>
              <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                20% OFF
              </Badge>
            </div>
            <p className="text-purple-100 text-sm">Unlock the full power of ClientHandle</p>
          </div>
        </div>

        {/* Rotating Feature Highlight */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 min-h-[80px] flex items-center">
          <div className="flex items-center gap-4 w-full">
            <div className="text-3xl">{reason.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{reason.title}</h4>
                <Badge className="bg-purple-400/30 text-white text-xs">
                  {reason.highlight}
                </Badge>
              </div>
              <p className="text-purple-100 text-sm">{reason.description}</p>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">50+</div>
            <div className="text-xs text-purple-200">Clients</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">∞</div>
            <div className="text-xs text-purple-200">Invoices</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">100+</div>
            <div className="text-xs text-purple-200">AI Follow-ups</div>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">$24</span>
              <span className="text-sm text-purple-200">/month</span>
            </div>
            <p className="text-xs text-purple-200">
              <span className="line-through">$29</span> • Save $60/year
            </p>
          </div>
          <div className="flex items-center gap-1 text-yellow-300">
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs text-purple-200 ml-1">4.9/5</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Button
            onClick={handleUpgrade}
            className="flex-1 bg-white text-purple-600 hover:bg-purple-50 font-semibold py-2 shadow-lg"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Upgrade Now
              <ArrowRight className="w-4 h-4" />
            </span>
          </Button>
          <Button
            onClick={() => window.open('/pricing', '_blank')}
            className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 font-medium py-2"
          >
            Compare Plans
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-purple-200">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            30-day guarantee
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Cancel anytime
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            2,500+ happy users
          </div>
        </div>
      </div>
    </Card>
  );
}
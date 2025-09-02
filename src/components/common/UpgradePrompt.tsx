'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ArrowRight, 
  Check, 
  AlertCircle,
  X
} from 'lucide-react';

interface UpgradePromptProps {
  title: string;
  message: string;
  currentUsage?: number;
  limit?: number | null;
  limitType?: string;
  currentPlan?: string;
  onUpgrade?: () => void;
  onClose?: () => void;
  className?: string;
}

const PLAN_COLORS = {
  free: 'text-gray-600 bg-gray-100',
  starter: 'text-blue-600 bg-blue-100',
  professional: 'text-purple-600 bg-purple-100',
  agency: 'text-emerald-600 bg-emerald-100'
};

const UPGRADE_PATHS = {
  free: {
    to: 'starter',
    price: 29,
    features: ['10 clients', '25 invoices/month', '50 AI messages/month']
  },
  starter: {
    to: 'professional',
    price: 59,
    features: ['100 clients', 'Unlimited invoices', '200 AI messages/month', 'Custom branding']
  },
  professional: {
    to: 'agency',
    price: 129,
    features: ['Unlimited everything', '3 team members', 'API access', 'White label']
  }
};

export function UpgradePrompt({
  title,
  message,
  currentUsage = 0,
  limit = null,
  limitType = 'usage',
  currentPlan = 'free',
  onUpgrade,
  onClose,
  className = ''
}: UpgradePromptProps) {
  const upgradePath = UPGRADE_PATHS[currentPlan as keyof typeof UPGRADE_PATHS];
  const planColor = PLAN_COLORS[currentPlan as keyof typeof PLAN_COLORS] || PLAN_COLORS.free;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: redirect to pricing page
      window.location.href = '/pricing';
    }
  };

  return (
    <Card className={`border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <Badge className={planColor}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </Badge>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Usage Info */}
        <div className="mb-4">
          <p className="text-gray-700 mb-2">{message}</p>
          
          {limit !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Current usage:</span>
              <span className="font-medium">
                {currentUsage} / {limit} {limitType}
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Upgrade Suggestion */}
        {upgradePath && (
          <div className="bg-white/60 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">
                  Upgrade to {upgradePath.to.charAt(0).toUpperCase() + upgradePath.to.slice(1)}
                </h4>
                <p className="text-sm text-gray-600">
                  ${upgradePath.price}/month
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Starting at</p>
                <p className="font-bold text-lg text-gray-900">
                  ${Math.round(upgradePath.price * 0.83)}/mo
                </p>
                <p className="text-xs text-green-600">billed yearly</p>
              </div>
            </div>
            
            <div className="space-y-1">
              {upgradePath.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-600"
            >
              Maybe Later
            </Button>
          )}
        </div>

        {/* Fine Print */}
        <p className="text-xs text-gray-500 mt-3">
          30-day money-back guarantee • Cancel anytime • No setup fees
        </p>
      </div>
    </Card>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Users, 
  Calendar, 
  Check,
  Sparkles,
  Loader2,
  Play,
  ArrowRight,
  Clock,
  Target,
  Zap
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
}

interface SmartFollowupWizardProps {
  clients: Client[];
  onComplete: (campaign: SmartCampaignConfig) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

interface SmartCampaignConfig {
  name: string;
  clientId: string;
  clientContext: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  timeOfDay: string;
  tone: 'friendly' | 'professional' | 'firm';
  maxMessages: number;
  pauseOnReply: boolean;
  enabled: boolean;
}

export function SmartFollowupWizard({ clients, onComplete, onCancel, className = '' }: SmartFollowupWizardProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const [config, setConfig] = useState<SmartCampaignConfig>({
    name: '',
    clientId: '',
    clientContext: '',
    frequency: 'weekly',
    interval: 1,
    timeOfDay: '09:00',
    tone: 'professional',
    maxMessages: 10,
    pauseOnReply: true,
    enabled: true
  });

  const selectedClient = clients.find(c => c.id === config.clientId);

  // Auto-generate campaign name and pre-fill context
  useEffect(() => {
    if (selectedClient) {
      if (!config.name) {
        setConfig(prev => ({
          ...prev,
          name: `Smart Follow-ups - ${selectedClient.name}`
        }));
      }
      if (!config.clientContext && selectedClient.notes) {
        setConfig(prev => ({
          ...prev,
          clientContext: selectedClient.notes
        }));
      }
    }
  }, [selectedClient, config.name, config.clientContext]);

  const updateConfig = (updates: Partial<SmartCampaignConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleGeneratePreview = async () => {
    if (!config.clientId || !config.clientContext) return;
    
    setIsGeneratingPreview(true);
    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'followup',
          tone: config.tone,
          clientId: config.clientId,
          customContext: config.clientContext,
          generateVariation: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewSubject(result.subject || 'No subject generated');
        setPreviewMessage(result.message || 'Unable to generate preview');
      } else {
        setPreviewSubject('Preview unavailable');
        setPreviewMessage('Unable to generate preview at this time');
      }
    } catch (error) {
      setPreviewSubject('Error');
      setPreviewMessage('Error generating preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!canProceed()) return;
    
    setIsSaving(true);
    try {
      await onComplete(config);
    } catch (error) {
      console.error('Failed to save campaign:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.clientId && config.clientContext.trim().length > 10;
      case 2:
        return config.frequency && config.timeOfDay && config.maxMessages > 0;
      default:
        return false;
    }
  };

  const getFrequencyLabel = () => {
    const base = config.frequency === 'daily' ? 'day' : 
                 config.frequency === 'weekly' ? 'week' : 'month';
    return config.interval === 1 ? `Every ${base}` : `Every ${config.interval} ${base}s`;
  };

  return (
    <div className={`max-w-3xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
          🤖
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Smart Value-First Campaigns
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          AI creates intelligent follow-ups that provide genuine value to your clients first, making them more likely to respond positively. No more "scammy" emails.
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                ${stepNumber <= step 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {stepNumber < step ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              {stepNumber < 2 && (
                <ArrowRight className={`w-4 h-4 mx-3 ${
                  stepNumber < step ? 'text-blue-500' : 'text-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-8 mb-6">
        {/* Step 1: Client & Context */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-semibold mb-1">Client Intelligence & Context</h2>
              <p className="text-gray-600 text-sm">Help AI understand your client deeply to create valuable, personalized emails</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="client" className="text-base font-medium">Select Client *</Label>
                <Select 
                  value={config.clientId} 
                  onValueChange={(value) => updateConfig({ clientId: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose a client to follow up with..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="py-1">
                          <p className="font-medium">{client.name}</p>
                          {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
                          {client.company && <p className="text-xs text-gray-400">{client.company}</p>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="context" className="text-base font-medium">Personal Context About {selectedClient.name} *</Label>
                    <Textarea
                      id="context"
                      value={config.clientContext}
                      onChange={(e) => updateConfig({ clientContext: e.target.value })}
                      placeholder={`e.g., ${selectedClient.name} runs a growing e-commerce business selling artisan jewelry. Currently expanding to wholesale markets and struggling with inventory management. Prefers actionable advice over theory. Responds well to industry examples and data. Working on Q4 holiday campaigns - big revenue season for them. Values efficiency and ROI-focused solutions...`}
                      rows={5}
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      🎯 <strong>AI will use this to create VALUE-FIRST emails.</strong> Include: their business situation, current challenges, goals, industry context, communication preferences, and what kinds of insights would actually help them succeed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Message Tone</Label>
                      <Select 
                        value={config.tone} 
                        onValueChange={(value: 'friendly' | 'professional' | 'firm') => 
                          updateConfig({ tone: value })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">😊 Friendly - Warm & casual</SelectItem>
                          <SelectItem value="professional">💼 Professional - Polished & formal</SelectItem>
                          <SelectItem value="firm">📋 Firm - Direct & assertive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">AI Preview</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGeneratePreview}
                          disabled={!config.clientContext.trim() || isGeneratingPreview}
                          className="text-xs"
                        >
                          {isGeneratingPreview ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          Preview
                        </Button>
                      </div>
                      
                      {(previewSubject || previewMessage) && (
                        <Card className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                          <div className="space-y-2 text-sm">
                            {previewSubject && (
                              <div>
                                <div className="font-semibold text-xs text-blue-700 uppercase tracking-wide mb-1">Subject:</div>
                                <div className="font-medium text-gray-800">{previewSubject}</div>
                              </div>
                            )}
                            {previewMessage && (
                              <div>
                                <div className="font-semibold text-xs text-blue-700 uppercase tracking-wide mb-1">Message:</div>
                                <div className="text-gray-700">{previewMessage}</div>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Schedule & Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-semibold mb-1">Set Smart Schedule</h2>
              <p className="text-gray-600 text-sm">How often should AI send follow-ups to {selectedClient?.name}?</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Schedule Settings */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Frequency
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { value: 'daily', label: '📅 Daily', desc: 'High-touch approach' },
                      { value: 'weekly', label: '🗓️ Weekly', desc: 'Most popular choice' },
                      { value: 'monthly', label: '📆 Monthly', desc: 'Long-term nurturing' }
                    ] as const).map((freq) => (
                      <Card
                        key={freq.value}
                        className={`p-4 cursor-pointer transition-all ${
                          config.frequency === freq.value 
                            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => updateConfig({ frequency: freq.value })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{freq.label}</p>
                            <p className="text-sm text-gray-500">{freq.desc}</p>
                          </div>
                          {config.frequency === freq.value && <Check className="w-5 h-5 text-blue-500" />}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Every X {config.frequency.slice(0, -2)}(s)</Label>
                    <Select 
                      value={config.interval.toString()} 
                      onValueChange={(value) => updateConfig({ interval: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time of Day</Label>
                    <Input
                      type="time"
                      value={config.timeOfDay}
                      onChange={(e) => updateConfig({ timeOfDay: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Campaign Settings */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Campaign Limits
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-sm">Maximum Messages</Label>
                    <Select 
                      value={config.maxMessages.toString()} 
                      onValueChange={(value) => updateConfig({ maxMessages: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 messages</SelectItem>
                        <SelectItem value="10">10 messages (recommended)</SelectItem>
                        <SelectItem value="20">20 messages</SelectItem>
                        <SelectItem value="999">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Smart Pause</Label>
                      <p className="text-xs text-gray-600">Stop when client replies</p>
                    </div>
                    <Switch
                      checked={config.pauseOnReply}
                      onCheckedChange={(checked) => updateConfig({ pauseOnReply: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Start Immediately</Label>
                      <p className="text-xs text-gray-600">Begin sending after setup</p>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => updateConfig({ enabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Summary */}
            <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Campaign Ready!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p><span className="font-medium">Client:</span> {selectedClient?.name}</p>
                  <p><span className="font-medium">Schedule:</span> {getFrequencyLabel()} at {config.timeOfDay}</p>
                </div>
                <div className="space-y-1">
                  <p><span className="font-medium">Tone:</span> {config.tone}</p>
                  <p><span className="font-medium">Max Messages:</span> {config.maxMessages === 999 ? 'Unlimited' : config.maxMessages}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {step < 2 ? (
            <Button 
              onClick={() => setStep(step + 1)} 
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700 px-6"
            >
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={!canProceed() || isSaving}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Starting Campaign...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Smart Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
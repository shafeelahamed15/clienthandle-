'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Check,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Eye
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
}

interface RecurringCampaignProps {
  clients: Client[];
  onSave: (campaign: CampaignConfig) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

interface CampaignConfig {
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

export function RecurringCampaign({ clients, onSave, onCancel, className = '' }: RecurringCampaignProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const [config, setConfig] = useState<CampaignConfig>({
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

  // Auto-generate campaign name when client is selected
  useEffect(() => {
    if (selectedClient && !config.name) {
      const frequency = config.frequency === 'daily' ? 'Daily' : 
                       config.frequency === 'weekly' ? 'Weekly' : 'Monthly';
      setConfig(prev => ({
        ...prev,
        name: `${frequency} Follow-up - ${selectedClient.name}`
      }));
    }
  }, [selectedClient, config.frequency, config.name]);

  // Load client context from notes if available
  useEffect(() => {
    if (selectedClient?.notes && !config.clientContext) {
      setConfig(prev => ({
        ...prev,
        clientContext: selectedClient.notes
      }));
    }
  }, [selectedClient, config.clientContext]);

  const updateConfig = (updates: Partial<CampaignConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleGeneratePreview = async () => {
    if (!config.clientId) return;
    
    setIsGeneratingPreview(true);
    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'followup',
          tone: config.tone,
          clientId: config.clientId,
          customContext: config.clientContext || 'Professional follow-up message',
          generateVariation: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewSubject(result.subject || 'No subject generated');
        setPreviewMessage(result.message || 'Unable to generate preview');
      } else {
        setPreviewSubject('Unable to generate subject');
        setPreviewMessage('Unable to generate preview at this time');
      }
    } catch (error) {
      setPreviewSubject('Error generating subject');
      setPreviewMessage('Error generating preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!canProceed()) return;
    
    setIsSaving(true);
    try {
      await onSave(config);
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
        return config.clientId && config.name;
      case 2:
        return config.clientContext.trim().length > 0;
      case 3:
        return config.frequency && config.timeOfDay;
      default:
        return false;
    }
  };

  const getFrequencyLabel = () => {
    if (config.interval === 1) {
      return config.frequency === 'daily' ? 'Every day' :
             config.frequency === 'weekly' ? 'Every week' : 'Every month';
    }
    return `Every ${config.interval} ${config.frequency === 'daily' ? 'days' :
           config.frequency === 'weekly' ? 'weeks' : 'months'}`;
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          🤖 Create Smart Follow-up Agent
        </h2>
        <p className="text-gray-600">
          Set up once and let AI handle all your follow-ups automatically with creative variations.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((stepNumber) => (
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
              {stepNumber < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  stepNumber < step ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 mb-6">
        {/* Step 1: Client & Campaign Name */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Select Client & Name Your Campaign</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client">Select Client *</Label>
                <Select 
                  value={config.clientId} 
                  onValueChange={(value) => updateConfig({ clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="e.g., Weekly Follow-up - Sarah"
                />
              </div>
            </div>

            {selectedClient && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">{selectedClient.name}</p>
                    {selectedClient.email && (
                      <p className="text-sm text-blue-700">{selectedClient.email}</p>
                    )}
                    {selectedClient.company && (
                      <p className="text-sm text-blue-600">{selectedClient.company}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Client Context & AI Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Tell AI About Your Client</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="context">Client Context & Personality *</Label>
                <Textarea
                  id="context"
                  value={config.clientContext}
                  onChange={(e) => updateConfig({ clientContext: e.target.value })}
                  placeholder="e.g., Sarah is a startup founder, prefers direct communication, working on Q4 fundraising, interested in growth marketing strategies, responds well to data-driven insights..."
                  rows={4}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  The more context you provide, the more personalized and effective the AI follow-ups will be.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Message Tone</Label>
                  <Select 
                    value={config.tone} 
                    onValueChange={(value: 'friendly' | 'professional' | 'firm') => 
                      updateConfig({ tone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">😊 Friendly - Warm & casual</SelectItem>
                      <SelectItem value="professional">💼 Professional - Formal & polished</SelectItem>
                      <SelectItem value="firm">📋 Firm - Direct & assertive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>AI Preview</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePreview}
                      disabled={!config.clientId || isGeneratingPreview}
                      className="text-xs"
                    >
                      {isGeneratingPreview ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Generate Preview
                    </Button>
                  </div>
                  
                  {(previewSubject || previewMessage) && (
                    <div className="p-3 bg-gray-50 rounded-md text-sm space-y-2">
                      {previewSubject && (
                        <div>
                          <div className="font-semibold text-xs text-gray-600 uppercase tracking-wide mb-1">Subject:</div>
                          <div className="font-medium">{previewSubject}</div>
                        </div>
                      )}
                      {previewMessage && (
                        <div>
                          <div className="font-semibold text-xs text-gray-600 uppercase tracking-wide mb-1">Message:</div>
                          <div>{previewMessage}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Set Schedule & Limits</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                      <Card
                        key={freq}
                        className={`p-3 cursor-pointer text-center transition-all ${
                          config.frequency === freq 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => updateConfig({ frequency: freq })}
                      >
                        <p className="font-medium capitalize">{freq}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Interval</Label>
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
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-700">
                  <strong>Schedule:</strong> {getFrequencyLabel()} at {config.timeOfDay}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Maximum Messages</Label>
                  <Select 
                    value={config.maxMessages.toString()} 
                    onValueChange={(value) => updateConfig({ maxMessages: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 messages</SelectItem>
                      <SelectItem value="10">10 messages</SelectItem>
                      <SelectItem value="20">20 messages</SelectItem>
                      <SelectItem value="50">50 messages</SelectItem>
                      <SelectItem value="999">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pause on Reply</Label>
                      <p className="text-xs text-gray-500">Stop sending when client responds</p>
                    </div>
                    <Switch
                      checked={config.pauseOnReply}
                      onCheckedChange={(checked) => updateConfig({ pauseOnReply: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Start Immediately</Label>
                      <p className="text-xs text-gray-500">Begin sending right after setup</p>
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
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Campaign Summary
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Client:</strong> {selectedClient?.name}</p>
                <p><strong>Schedule:</strong> {getFrequencyLabel()} at {config.timeOfDay}</p>
                <p><strong>Tone:</strong> {config.tone}</p>
                <p><strong>Max Messages:</strong> {config.maxMessages === 999 ? 'Unlimited' : config.maxMessages}</p>
                <p><strong>Status:</strong> {config.enabled ? 'Will start immediately' : 'Paused'}</p>
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
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)} 
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={!canProceed() || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Campaign...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
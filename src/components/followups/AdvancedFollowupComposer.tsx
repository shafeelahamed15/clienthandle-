'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Clock,
  Send,
  Eye,
  Sparkles,
  Loader2
} from 'lucide-react';

import { EnhancedToneSelector } from './EnhancedToneSelector';
import { EmailScheduler } from '@/components/scheduling/EmailScheduler';
import { SchedulePicker } from '@/components/scheduling/SchedulePicker';
import type { RecurrenceType } from '@/components/scheduling/EmailScheduler';

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
}

interface SchedulePattern {
  type: RecurrenceType;
  interval: number;
  timeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  endAfter?: number;
  endDate?: Date;
  daysOfWeek?: number[];
  timeOfDay: string;
}

interface AdvancedFollowupComposerProps {
  clients: Client[];
  invoices: Invoice[];
  onSchedule: (config: FollowupConfig) => Promise<void>;
  onCancel?: () => void;
  editingId?: string | null;
  className?: string;
}

interface FollowupConfig {
  clientId: string;
  invoiceId?: string;
  subject: string;
  body: string;
  tone: string;
  personalContext: string;
  scheduleType: 'immediate' | 'custom' | 'recurring';
  scheduledAt?: Date;
  recurrencePattern?: SchedulePattern;
  pauseOnReply: boolean;
  cancelIfPaid: boolean;
  maxSends?: number;
}

const steps = [
  { id: 'client', title: 'Client & Invoice', icon: Users, description: 'Select recipient and related invoice' },
  { id: 'compose', title: 'Compose', icon: MessageSquare, description: 'Write your message and choose tone' },
  { id: 'schedule', title: 'Schedule', icon: Calendar, description: 'Set timing and recurrence' },
  { id: 'review', title: 'Review', icon: Check, description: 'Review and confirm your follow-up' }
];

export function AdvancedFollowupComposer({ 
  clients, 
  invoices, 
  onSchedule, 
  onCancel,
  editingId,
  className = '' 
}: AdvancedFollowupComposerProps) {
  console.log('🏗️ Composer initialized with clients:', clients.map(c => ({ id: c.id, name: c.name })));
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [config, setConfig] = useState<FollowupConfig>({
    clientId: '',
    subject: '',
    body: '',
    tone: 'professional',
    personalContext: '',
    scheduleType: 'custom',
    pauseOnReply: true,
    cancelIfPaid: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);

  // Load existing follow-up data when editing
  useEffect(() => {
    const loadEditData = async () => {
      if (editingId && !isEditing) {
        setLoadingEditData(true);
        try {
          // Fetch the existing follow-up data
          const response = await fetch(`/api/followups/${editingId}`);
          if (response.ok) {
            const followupData = await response.json();
            
            // Update the config with existing data
            setConfig({
              clientId: followupData.client_id,
              invoiceId: followupData.related_invoice_id || undefined,
              subject: followupData.email_subject || extractSubjectFromBody(followupData.body),
              body: followupData.body || followupData.email_body,
              tone: followupData.tone || followupData.variables?.tone || 'professional',
              scheduleType: followupData.recurring_pattern ? 'recurring' : 'custom',
              scheduledAt: followupData.scheduled_at ? new Date(followupData.scheduled_at) : undefined,
              recurrencePattern: followupData.recurring_pattern ? {
                type: followupData.recurring_pattern.type,
                interval: followupData.recurring_pattern.interval || 1,
                timeUnit: 'days',
                timeOfDay: followupData.recurring_pattern.timeOfDay || '09:00',
                endAfter: followupData.recurring_pattern.endAfter
              } : undefined,
              pauseOnReply: followupData.variables?.pauseOnReply ?? true,
              cancelIfPaid: followupData.variables?.cancelIfPaid ?? true,
              maxSends: followupData.variables?.maxSends
            });
            
            setIsEditing(true);
          }
        } catch (error) {
          console.error('Failed to load edit data:', error);
        } finally {
          setLoadingEditData(false);
        }
      }
    };

    loadEditData();
  }, [editingId, isEditing]);

  // Helper function to extract subject from body if needed
  const extractSubjectFromBody = (body: string) => {
    if (!body) return '';
    const firstLine = body.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
  };

  // Filter invoices when client changes
  useEffect(() => {
    if (config.clientId) {
      const filtered = invoices.filter(inv => 
        // You'll need to add client_id to invoice or filter differently
        // For now, showing all invoices
        true
      );
      setClientInvoices(filtered);
    } else {
      setClientInvoices([]);
    }
  }, [config.clientId, invoices]);

  const selectedClient = clients.find(c => c.id === config.clientId);
  const selectedInvoice = invoices.find(i => i.id === config.invoiceId);

  const canProceed = () => {
    const result = (() => {
      switch (currentStep) {
        case 0: // Client step
          return config.clientId;
        case 1: // Compose step
          return config.subject && config.body && config.tone;
        case 2: // Schedule step
          const scheduleValid = config.scheduleType && (
            config.scheduleType === 'immediate' || 
            !!config.scheduledAt || 
            !!config.recurrencePattern
          );
          console.log('🔍 Schedule validation DEBUG:', {
            currentStep,
            scheduleType: config.scheduleType,
            scheduledAt: config.scheduledAt,
            scheduledAtISO: config.scheduledAt?.toISOString(),
            recurrencePattern: config.recurrencePattern,
            scheduledAtExists: !!config.scheduledAt,
            recurrenceExists: !!config.recurrencePattern,
            scheduleTypeValid: !!config.scheduleType,
            immediateValid: config.scheduleType === 'immediate',
            customValid: config.scheduleType === 'custom' && !!config.scheduledAt,
            recurringValid: config.scheduleType === 'recurring' && !!config.recurrencePattern,
            result: scheduleValid
          });
          return scheduleValid;
        case 3: // Review step
          return true;
        default:
          return false;
      }
    })();
    
    console.log(`🚀 Can proceed step ${currentStep}:`, result);
    return result;
  };

  const handleNext = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        // Handle update
        const response = await fetch(`/api/followups/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: config.clientId,
            relatedInvoiceId: config.invoiceId,
            subject: config.subject,
            body: config.body,
            tone: config.tone,
            scheduleType: config.scheduleType,
            scheduledAt: config.scheduledAt?.toISOString(),
            recurrencePattern: config.recurrencePattern,
            pauseOnReply: config.pauseOnReply,
            cancelIfPaid: config.cancelIfPaid,
            maxSends: config.maxSends
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: Failed to update follow-up`;
          console.error('API Error:', errorData);
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Follow-up updated:', result);

        // Call the parent component's callback (which refreshes data and closes modal)
        await onSchedule(config);
      } else {
        // Handle create (existing logic)
        await onSchedule(config);
      }
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateConfig = (updates: Partial<FollowupConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const savePersonalContextToClient = async (clientId: string, personalContext: string) => {
    try {
      console.log('💾 Saving personal context to client profile...');
      
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: personalContext,
          updated_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('✅ Personal context saved successfully');
      } else {
        console.warn('⚠️ Failed to save personal context to client profile');
      }
    } catch (error) {
      console.error('❌ Error saving personal context:', error);
    }
  };

  const handleGenerateAI = async () => {
    if (!config.clientId || config.clientId === '' || isGeneratingAI) {
      console.log('❌ Cannot generate AI: invalid client ID:', config.clientId);
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      console.log('🤖 Generating AI follow-up...');
      
      // Save personal context to client profile if provided
      if (config.personalContext && config.personalContext.trim()) {
        await savePersonalContextToClient(config.clientId, config.personalContext);
      }
      
      // Ensure tone is valid
      const validTones = ['friendly', 'professional', 'firm'];
      const tone = validTones.includes(config.tone) ? config.tone : 'professional';
      
      const requestBody = {
        type: config.invoiceId ? 'reminder' : 'followup',
        tone: tone,
        clientId: config.clientId,
        ...(config.invoiceId && { invoiceId: config.invoiceId }),
        customContext: config.personalContext || 'Professional follow-up message',
        generateVariation: true // Tell AI to create varied content
      };
      
      console.log('📝 Request body:', requestBody);
      console.log('👥 Available clients:', clients.map(c => ({ id: c.id, name: c.name })));
      console.log('🎯 Selected client ID:', config.clientId);
      
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if it's a usage limit error
        if (errorData.upgrade_required && errorData.upgrade_message) {
          alert(`⚡ ${errorData.error}\n\n${errorData.upgrade_message}\n\nWould you like to upgrade now?`);
          // TODO: Show upgrade modal instead of alert
          return;
        }
        
        throw new Error(`Failed to generate message: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.message) {
        console.log('✅ AI message generated successfully');
        
        // Use AI-generated subject if available, otherwise generate fallback
        let subject = result.subject || config.subject;
        if (!subject) {
          const client = clients.find(c => c.id === config.clientId);
          const clientName = client?.name || 'Client';
          subject = config.invoiceId ? `Payment Reminder - ${clientName}` : `Following up - ${clientName}`;
        }
        
        updateConfig({ 
          body: result.message,
          subject: subject
        });
      } else {
        throw new Error('No message generated');
      }
      
    } catch (error) {
      console.error('❌ AI generation failed:', error);
      alert('Failed to generate AI message. Please try again or write manually.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getStepProgress = () => {
    return ((currentStep + 1) / steps.length) * 100;
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {isEditing ? 'Edit Follow-up' : 'Schedule Follow-up'}
        </h2>
        <p className="text-gray-600">
          {isEditing 
            ? 'Update your scheduled follow-up email settings.' 
            : 'Create and schedule professional follow-up emails with full control.'}
        </p>
        {loadingEditData && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Loading follow-up data...
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                ${index <= currentStep 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <div className="ml-2 hidden md:block">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* Step Content */}
      <Card className="p-6 mb-6">
        {/* Step 1: Client & Invoice Selection */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Select Client & Invoice</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Select Client *</Label>
                <Select 
                  value={config.clientId} 
                  onValueChange={(value) => updateConfig({ clientId: value, invoiceId: undefined })}
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

              {/* Invoice Selection */}
              <div className="space-y-2">
                <Label htmlFor="invoice">Related Invoice (Optional)</Label>
                <Select 
                  value={config.invoiceId || 'none'} 
                  onValueChange={(value) => updateConfig({ invoiceId: value === 'none' ? undefined : value })}
                  disabled={!config.clientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an invoice..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No invoice</SelectItem>
                    {clientInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>#{invoice.number}</span>
                          <Badge 
                            variant={invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Client Summary */}
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
                    {selectedInvoice && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          Invoice #{selectedInvoice.number} - {selectedInvoice.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Compose Message */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Compose Your Message</h3>
            </div>

            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <Input
                id="subject"
                value={config.subject}
                onChange={(e) => updateConfig({ subject: e.target.value })}
                placeholder="Enter email subject..."
                className="text-sm"
              />
            </div>

            {/* Tone Selection */}
            <EnhancedToneSelector
              selectedTone={config.tone}
              onToneChange={(tone) => updateConfig({ tone })}
            />

            {/* Personal Context for AI */}
            <div className="space-y-2">
              <Label htmlFor="personalContext">Personal Context for AI (Optional)</Label>
              <Textarea
                id="personalContext"
                value={config.personalContext}
                onChange={(e) => updateConfig({ personalContext: e.target.value })}
                placeholder="e.g., Client prefers morning calls, recently launched new product, mentioned vacation plans, working on Q4 budget, prefers formal communication..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                Add any personal details about the client to help AI create more personalized messages (preferences, recent conversations, projects, etc.)
              </p>
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message Body *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={!config.clientId || isGeneratingAI}
                  className="flex items-center gap-2 text-xs"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea
                id="body"
                value={config.body}
                onChange={(e) => updateConfig({ body: e.target.value })}
                placeholder="Write your follow-up message or click 'Generate with AI' to let AI create it for you..."
                rows={6}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                Available variables: [ClientName], [InvoiceNumber], [Amount], [DueDate]
                {!config.clientId && <span className="text-amber-600"> • Select a client first to use AI generation</span>}
                {config.personalContext && <span className="text-green-600"> • Personal context added for AI personalization</span>}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Schedule Options */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Schedule Your Follow-up</h3>
            </div>

            {/* Schedule Type Selection */}
            <div className="space-y-3">
              <Label>When should this be sent?</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'immediate', title: 'Send Now', desc: 'Send immediately', icon: Send },
                  { id: 'custom', title: 'Custom Time', desc: 'Choose specific date/time', icon: Clock },
                  { id: 'recurring', title: 'Recurring', desc: 'Set up recurring sends', icon: Calendar }
                ].map((option) => (
                  <Card
                    key={option.id}
                    className={`p-4 cursor-pointer transition-all ${
                      config.scheduleType === option.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => {
                      console.log(`📅 Schedule type changed to: ${option.id}`);
                      // Clear previous scheduling data when changing type
                      updateConfig({ 
                        scheduleType: option.id as 'immediate' | 'custom' | 'recurring',
                        scheduledAt: option.id === 'custom' ? config.scheduledAt : undefined,
                        recurrencePattern: option.id === 'recurring' ? config.recurrencePattern : undefined
                      });
                    }}
                  >
                    <div className="text-center">
                      <option.icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                      <p className="font-medium text-sm">{option.title}</p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Date/Time Picker */}
            {config.scheduleType === 'custom' && (
              <div className="mt-4">
                <SchedulePicker
                  value={config.scheduledAt}
                  onChange={(date) => {
                    console.log('📅 SchedulePicker onChange called with:', date);
                    updateConfig({ scheduledAt: date || undefined });
                  }}
                  minDate={new Date()}
                />
                {config.scheduledAt && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      ✅ Scheduled for: {config.scheduledAt.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Recurring Schedule Options */}
            {config.scheduleType === 'recurring' && (
              <div className="mt-4">
                <EmailScheduler
                  onSchedule={(pattern) => {
                    console.log('📅 Recurring pattern set:', pattern);
                    updateConfig({ recurrencePattern: pattern });
                  }}
                />
                {config.recurrencePattern && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      ✅ Recurring: {config.recurrencePattern.type} at {config.recurrencePattern.timeOfDay}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Check className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Review & Confirm</h3>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Summary */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Recipient
                </h4>
                <p className="text-sm text-gray-700">{selectedClient?.name}</p>
                {selectedClient?.email && (
                  <p className="text-sm text-gray-500">{selectedClient.email}</p>
                )}
                {selectedInvoice && (
                  <Badge variant="outline" className="mt-2">
                    Invoice #{selectedInvoice.number}
                  </Badge>
                )}
              </Card>

              {/* Schedule Summary */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </h4>
                {config.scheduleType === 'immediate' && (
                  <p className="text-sm text-gray-700">Send immediately</p>
                )}
                {config.scheduleType === 'custom' && config.scheduledAt && (
                  <p className="text-sm text-gray-700">
                    {config.scheduledAt.toLocaleDateString()} at {config.scheduledAt.toLocaleTimeString()}
                  </p>
                )}
                {config.scheduleType === 'recurring' && config.recurrencePattern && (
                  <p className="text-sm text-gray-700">
                    {config.recurrencePattern.type} at {config.recurrencePattern.timeOfDay}
                  </p>
                )}
              </Card>
            </div>

            {/* Message Preview */}
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Message Preview
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">To:</span>
                  <span>{selectedClient?.email || selectedClient?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Subject:</span>
                  <span className="font-medium">{config.subject}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {config.body}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="text-xs">{config.tone}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {config.scheduleType}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <div className="relative">
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              {!canProceed() && currentStep === 2 && (
                <div className="absolute bottom-full mb-2 left-0 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {!config.scheduleType && "Select a schedule type"}
                  {config.scheduleType === 'custom' && !config.scheduledAt && "Set date and time"}
                  {config.scheduleType === 'recurring' && !config.recurrencePattern && "Configure recurring schedule"}
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!canProceed() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Scheduling...') 
                : (isEditing ? 'Update Follow-up' : 'Schedule Follow-up')
              }
              <Send className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
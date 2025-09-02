'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MessageSquare, Activity, TrendingUp, Mail, Bot, ArrowLeft } from 'lucide-react';
import { AdvancedFollowupComposer } from '@/components/followups/AdvancedFollowupComposer';
import { RecurringCampaign } from '@/components/followups/RecurringCampaign';
import { SmartFollowupWizard } from '@/components/followups/SmartFollowupWizard';
import { CampaignManager } from '@/components/followups/CampaignManager';
import { FollowupTimeline } from '@/components/followups/FollowupTimeline';
import { MessageDetailModal } from '@/components/followups/MessageDetailModal';
import { LoadingState, LoadingCard, LoadingCardList } from '@/components/common/LoadingState';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { createClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { MOCK_MODE, mockClientsService, mockInvoicesService } from '@/lib/mock-data';

interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
}

interface Invoice {
  id: string;
  number: string;
  due_date: string;
  status: string;
  amount: number;
  currency: string;
  client_id?: string;
}

interface TimelineItem {
  id: string;
  kind: 'past' | 'future';
  angle?: string;
  tone?: string;
  subject?: string;
  body?: string;
  at: string;
  status?: string;
  clientId?: string;
  client_name?: string;
}

interface FollowupConfig {
  clientId: string;
  invoiceId?: string;
  subject: string;
  body: string;
  tone: string;
  scheduleType: 'immediate' | 'custom' | 'recurring';
  scheduledAt?: Date;
  recurrencePattern?: Record<string, unknown>;
  pauseOnReply: boolean;
  cancelIfPaid: boolean;
  maxSends?: number;
}

interface Stats {
  scheduled: number;
  sent: number;
  replied: number;
  opened: number;
}

export default function FollowupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Record<string, unknown> | null>(null);
  const [messageDetailOpen, setMessageDetailOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    scheduled: 0,
    sent: 0,
    replied: 0,
    opened: 0
  });

  // Check URL parameters for different views
  const showSmartWizard = searchParams.get('action') === 'smart';
  const showCampaignManager = searchParams.get('action') === 'manage';
  const supabase = createClient();

  const loadInitialData = useCallback(async () => {
    try {
      if (MOCK_MODE) {
        console.log('🎭 Using mock mode for data loading');
        // Load mock data
        const mockClients = await mockClientsService.list('mock-user-1');
        const mockInvoices = await mockInvoicesService.list('mock-user-1');
        
        console.log('📋 Loaded mock clients:', mockClients.map(c => ({ id: c.id, name: c.name })));
        setClients(mockClients);
        const transformedInvoices = mockInvoices.map(inv => ({
          ...inv,
          amount: (inv.amount_cents || 0) / 100
        }));
        setInvoices(transformedInvoices);
        setTimelineItems([]);
        setStats({ scheduled: 0, sent: 0, replied: 0, opened: 0 });
        setIsLoading(false);
        return;
      }

      console.log('🗄️ Using real database mode for data loading');

      const user = await getCurrentUser();
      if (!user) return;

      // Load clients, invoices, messages, and scheduled emails in parallel
      const [clientsResponse, invoicesResponse, messagesResponse, schedulesResponse] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, email, company')
          .eq('owner_uid', user.id)
          .order('name'),
        
        supabase
          .from('invoices')
          .select('id, number, due_date, status, amount_cents, currency, client_id')
          .eq('owner_uid', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('messages')
          .select(`
            id, type, tone, subject, body, scheduled_at, status, sent_at, client_id,
            clients!inner(name)
          `)
          .eq('owner_uid', user.id)
          .eq('type', 'followup')
          .order('created_at', { ascending: false })
          .limit(50),
          
        supabase
          .from('email_schedules')
          .select(`
            id, name, email_subject, email_body, status, scheduled_at, next_run_at, 
            send_count, created_at, client_id,
            clients!inner(name)
          `)
          .eq('owner_uid', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (clientsResponse.data) setClients(clientsResponse.data);
      
      if (invoicesResponse.data) {
        const transformedInvoices = invoicesResponse.data.map(inv => ({
          ...inv,
          amount: (inv.amount_cents || 0) / 100
        }));
        setInvoices(transformedInvoices);
      }
      
      // Combine messages and schedules for timeline
      const allMessages = messagesResponse.data || [];
      const allSchedules = schedulesResponse.data || [];
      
      console.log('📧 Messages loaded:', allMessages);
      console.log('📅 Schedules loaded:', allSchedules);
      
      if (allMessages.length > 0 || allSchedules.length > 0) {
        loadTimelineData(allMessages, allSchedules);
        calculateStats(allMessages);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadTimelineData = (messages: Record<string, unknown>[], schedules: Record<string, unknown>[] = []) => {
    const timeline: TimelineItem[] = [];

    // Process regular messages
    messages.forEach(item => {
      const baseItem = {
        id: item.id,
        tone: item.tone,
        subject: item.subject || (item.body ? item.body.substring(0, 50) + '...' : 'Follow-up message'),
        body: item.body,
        clientId: item.client_id,
        client_name: item.clients?.name
      };

      if (item.scheduled_at && ['draft', 'queued'].includes(item.status)) {
        // Future items
        timeline.push({
          ...baseItem,
          kind: 'future',
          angle: 'followup',
          at: item.scheduled_at,
          status: item.status
        });
      } else if (item.sent_at && item.status === 'sent') {
        // Past items
        timeline.push({
          ...baseItem,
          kind: 'past',
          at: item.sent_at,
          status: item.status
        });
      }
    });

    // Process scheduled emails
    schedules.forEach(schedule => {
      const baseItem = {
        id: schedule.id,
        tone: 'professional', // Default for schedules
        subject: schedule.email_subject || schedule.name || 'Scheduled Follow-up',
        body: schedule.email_body,
        clientId: schedule.client_id,
        client_name: schedule.clients?.name
      };

      if (['scheduled', 'paused'].includes(schedule.status)) {
        // Future scheduled items
        timeline.push({
          ...baseItem,
          kind: 'future',
          angle: 'recurring',
          at: schedule.next_run_at || schedule.scheduled_at,
          status: schedule.status
        });
      } else if (schedule.status === 'sent' && schedule.send_count > 0) {
        // Past sent schedules
        timeline.push({
          ...baseItem,
          kind: 'past',
          at: schedule.scheduled_at,
          status: schedule.status
        });
      }
    });

    // Sort by date
    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    console.log('📋 Timeline items processed:', timeline);
    setTimelineItems(timeline);
  };

  const calculateStats = (messages: Record<string, unknown>[]) => {
    const stats = {
      scheduled: messages.filter(m => ['draft', 'queued'].includes(m.status)).length,
      sent: messages.filter(m => m.status === 'sent').length,
      replied: messages.filter(m => m.status === 'replied').length,
      opened: messages.filter(m => m.opened_at).length
    };
    setStats(stats);
  };

  const handleScheduleFollowup = async (config: FollowupConfig) => {
    try {
      const response = await fetch('/api/followups/schedule', {
        method: 'POST',
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
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: Failed to schedule follow-up`;
        console.error('API Error:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Follow-up scheduled:', result);

      // Refresh timeline data
      await loadInitialData();
      setShowComposer(false);
      setEditingFollowupId(null);

    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      throw error;
    }
  };

  const handleSaveCampaign = async (config: any) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to create campaign`;
        console.error('API Error:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Campaign created:', result);

      // Refresh timeline data
      await loadInitialData();
      setShowCampaignCreator(false);

    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  };

  const handlePauseToggle = async (itemId: string) => {
    try {
      const item = timelineItems.find(t => t.id === itemId);
      if (!item) return;

      // Try updating in messages table first
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', itemId)
        .single();

      if (messageData && !messageError) {
        // It's a message - toggle between draft/queued
        const newStatus = item.status === 'queued' ? 'draft' : 'queued';
        const { error } = await supabase
          .from('messages')
          .update({ status: newStatus })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      // Try updating in email_schedules table
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('email_schedules')
        .select('id')
        .eq('id', itemId)
        .single();

      if (scheduleData && !scheduleError) {
        // It's a schedule - toggle between scheduled/paused
        const newStatus = item.status === 'scheduled' ? 'paused' : 'scheduled';
        const { error } = await supabase
          .from('email_schedules')
          .update({ status: newStatus })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      console.error('Item not found in either table');
    } catch (error) {
      console.error('Failed to pause/resume:', error);
    }
  };

  const handleCancel = async (itemId: string) => {
    try {
      // Try updating in messages table first
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', itemId)
        .single();

      if (messageData && !messageError) {
        // It's a message - set status to failed
        const { error } = await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      // Try updating in email_schedules table
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('email_schedules')
        .select('id')
        .eq('id', itemId)
        .single();

      if (scheduleData && !scheduleError) {
        // It's a schedule - set status to cancelled
        const { error } = await supabase
          .from('email_schedules')
          .update({ status: 'cancelled' })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      console.error('Item not found in either table');
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleReschedule = async (itemId: string) => {
    try {
      const newTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Try updating in messages table first
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', itemId)
        .single();

      if (messageData && !messageError) {
        // It's a message - update scheduled_at
        const { error } = await supabase
          .from('messages')
          .update({ scheduled_at: newTime.toISOString() })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      // Try updating in email_schedules table
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('email_schedules')
        .select('id')
        .eq('id', itemId)
        .single();

      if (scheduleData && !scheduleError) {
        // It's a schedule - update next_run_at
        const { error } = await supabase
          .from('email_schedules')
          .update({ next_run_at: newTime.toISOString() })
          .eq('id', itemId);

        if (!error) {
          await loadInitialData();
        }
        return;
      }

      console.error('Item not found in either table');
    } catch (error) {
      console.error('Failed to reschedule:', error);
    }
  };

  const handleEdit = (itemId: string) => {
    setEditingFollowupId(itemId);
    setShowComposer(true);
  };

  const handleTimelineItemClick = async (item: TimelineItem) => {
    console.log('🖱️ Timeline item clicked:', item);
    try {
      // Try to fetch from messages table first
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          clients!inner(name, email),
          invoices(number, amount_cents, currency)
        `)
        .eq('id', item.id)
        .single();

      if (messageData && !messageError) {
        console.log('📄 Message data loaded:', messageData);
        setSelectedMessage(messageData);
        setMessageDetailOpen(true);
        return;
      }

      // If not found in messages, try email_schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('email_schedules')
        .select(`
          *,
          clients!inner(name, email)
        `)
        .eq('id', item.id)
        .single();

      if (scheduleData && !scheduleError) {
        console.log('📅 Schedule data loaded:', scheduleData);
        // Convert schedule to message format for modal
        const convertedMessage = {
          id: scheduleData.id,
          subject: scheduleData.email_subject,
          body: scheduleData.email_body,
          status: scheduleData.status,
          scheduled_at: scheduleData.scheduled_at,
          clients: scheduleData.clients,
          type: 'followup'
        };
        setSelectedMessage(convertedMessage);
        setMessageDetailOpen(true);
        return;
      }

      console.error('Item not found in either table');
    } catch (error) {
      console.error('Failed to load message details:', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    // Reload data to reflect changes
    await loadInitialData();
    
    // Update the selected message if it's currently open
    if (selectedMessage && selectedMessage.id === messageId) {
      const { data: updatedMessage } = await supabase
        .from('messages')
        .select(`
          *,
          clients!inner(name, email),
          invoices(number, amount_cents, currency)
        `)
        .eq('id', messageId)
        .single();
      
      if (updatedMessage) {
        setSelectedMessage(updatedMessage);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (!error) {
        await loadInitialData();
        setMessageDetailOpen(false);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState 
            message="Loading your follow-up campaigns" 
            size="lg" 
            variant="gradient" 
          />
          
          {/* Loading skeleton for stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingCard key={index} variant="stats" />
            ))}
          </div>
          
          {/* Loading skeleton for timeline */}
          <div className="mt-10">
            <LoadingCardList count={3} variant="timeline" />
          </div>
        </div>
      </div>
    );
  }

  // Smart Follow-up Wizard temporarily disabled for testing
  if (false) { // showSmartWizard - disabled for debugging
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs for Smart Wizard */}
          <Breadcrumbs 
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Follow-ups', href: '/followups' },
              { label: 'Smart Campaign', href: '/followups?action=smart' }
            ]} 
          />
          
          {/* Header with back button */
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/followups')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Follow-ups
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Smart Follow-up Campaign</h1>
              <p className="text-gray-600 mt-1">Set up AI-powered follow-ups that get replies</p>
            </div>
          </div>

          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Smart Follow-up Wizard</h2>
            <p className="text-gray-600">Feature temporarily disabled for testing</p>
          </div>
        </div>
      </div>
    );
  }

  // Show Campaign Manager if action=manage
  if (showCampaignManager) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs for Campaign Manager */}
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Follow-ups', href: '/followups' },
            { label: 'Campaign Manager', href: '/followups?action=manage' }
          ]} />
          
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/followups')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Follow-ups
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Smart Campaign Manager</h1>
              <p className="text-gray-600 mt-1">Manage all your AI-powered follow-up campaigns</p>
            </div>
          </div>

          {/* Campaign Manager */}
          <CampaignManager
            onCreateNew={() => {
              // Navigate to smart wizard
              router.push('/followups?action=smart');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs />
        
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Follow-ups
                  </h1>
                  <p className="text-gray-600 mt-1 text-lg">
                    Schedule and manage AI-powered follow-up campaigns
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowCampaignCreator(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <Bot className="w-5 h-5 mr-2" />
                Smart Campaign
              </Button>
              <Button
                onClick={() => setShowComposer(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Follow-up
              </Button>
            </div>
          </div>
          
          {/* Quick Stats Preview */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.scheduled} Scheduled</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.sent} Sent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.replied} Replied</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {timelineItems.length} total messages
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/50 to-blue-200/30 rounded-full -mr-10 -mt-10"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Scheduled</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{stats.scheduled}</p>
                  <p className="text-xs text-gray-500 mt-1">Queued messages</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-green-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/50 to-green-200/30 rounded-full -mr-10 -mt-10"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Sent</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{stats.sent}</p>
                  <p className="text-xs text-gray-500 mt-1">Delivered emails</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <Mail className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100/50 to-purple-200/30 rounded-full -mr-10 -mt-10"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Opened</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{stats.opened}</p>
                  <p className="text-xs text-gray-500 mt-1">Email opens</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-amber-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-100/50 to-amber-200/30 rounded-full -mr-10 -mt-10"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Replied</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">{stats.replied}</p>
                  <p className="text-xs text-gray-500 mt-1">Client responses</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Advanced Composer Modal */}
        {showComposer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <AdvancedFollowupComposer
                  clients={clients}
                  invoices={invoices}
                  onSchedule={handleScheduleFollowup}
                  onCancel={() => {
                    setShowComposer(false);
                    setEditingFollowupId(null);
                  }}
                  editingId={editingFollowupId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Smart Campaign Creator Modal */}
        {showCampaignCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <RecurringCampaign
                  clients={clients}
                  onSave={handleSaveCampaign}
                  onCancel={() => setShowCampaignCreator(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Timeline */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Follow-up Timeline</h2>
                  <p className="text-gray-600 text-sm">Track all your AI-powered campaigns</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white/70 border-blue-200 text-blue-700 px-3 py-1.5 text-sm font-medium">
                  <Activity className="w-4 h-4 mr-1" />
                  {timelineItems.length} messages
                </Badge>
                {timelineItems.filter(item => item.kind === 'future').length > 0 && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 text-sm font-medium">
                    {timelineItems.filter(item => item.kind === 'future').length} upcoming
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="p-8">

            {timelineItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageSquare className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full opacity-30"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No follow-ups yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                  Get started by creating your first AI-powered follow-up campaign.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setShowCampaignCreator(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    size="lg"
                  >
                    <Bot className="w-5 h-5 mr-3" />
                    Start Smart Campaign
                  </Button>
                  <Button
                    onClick={() => setShowComposer(true)}
                    variant="outline"
                    className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700 px-8 py-4 text-lg hover:border-blue-300 transition-all duration-200"
                    size="lg"
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Create Manual Follow-up
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🧪 Test modal clicked');
                    setSelectedMessage({
                      id: 'test',
                      subject: 'Test Subject',
                      body: 'Test message body for debugging the modal functionality',
                      status: 'draft',
                      clients: { name: 'Test Client', email: 'test@example.com' }
                    });
                    setMessageDetailOpen(true);
                  }}
                >
                  Test Modal
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('🧪 Creating test draft message');
                    try {
                      const user = await getCurrentUser();
                      if (!user || !clients.length) {
                        console.error('No user or clients found');
                        return;
                      }

                      const futureDate = new Date();
                      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

                      const { data, error } = await supabase
                        .from('messages')
                        .insert({
                          owner_uid: user.id,
                          client_id: clients[0].id,
                          type: 'followup',
                          tone: 'professional',
                          subject: 'Test Draft Subject',
                          body: 'This is a test draft message that should be clickable in the timeline.',
                          status: 'draft',
                          scheduled_at: futureDate.toISOString()
                        })
                        .select()
                        .single();

                      if (error) {
                        console.error('Error creating test message:', error);
                      } else {
                        console.log('✅ Test draft created:', data);
                        await loadInitialData(); // Refresh the timeline
                      }
                    } catch (error) {
                      console.error('Failed to create test draft:', error);
                    }
                  }}
                >
                  Create Test Draft
                </Button>
              </div>
            ) : (
              <FollowupTimeline 
                items={timelineItems}
                onPause={handlePauseToggle}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                onEdit={handleEdit}
                onItemClick={handleTimelineItemClick}
              />
            )}
          </div>
        </Card>

        {/* Message Detail Modal */}
        <MessageDetailModal
          message={selectedMessage}
          open={messageDetailOpen}
          onOpenChange={setMessageDetailOpen}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
        />
      </div>
    </div>
  );
}
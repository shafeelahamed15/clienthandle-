'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Play, 
  Pause, 
  StopCircle, 
  Calendar, 
  Mail, 
  TrendingUp,
  Settings,
  Plus,
  Bot,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface Campaign {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  status: 'scheduled' | 'paused' | 'completed' | 'cancelled';
  email_subject: string;
  email_body: string;
  next_run_at: string | null;
  send_count: number;
  max_sends: number;
  interval_days: number;
  created_at: string;
}

interface CampaignManagerProps {
  onCreateNew?: () => void;
}

export function CampaignManager({ onCreateNew }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Load campaigns with client info
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('email_schedules')
        .select(`
          id, name, client_id, status, email_subject, email_body, 
          next_run_at, send_count, max_sends, interval_days, created_at,
          clients!inner(name, email, company)
        `)
        .eq('owner_uid', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Error loading campaigns:', campaignsError);
        return;
      }

      // Transform data to include client name
      const transformedCampaigns = (campaignsData || []).map(campaign => ({
        ...campaign,
        client_name: campaign.clients.name
      }));

      setCampaigns(transformedCampaigns);

      // Load all clients for filtering
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, company')
        .eq('owner_uid', user.id)
        .order('name');

      if (!clientsError && clientsData) {
        setClients(clientsData);
      }

    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      let newStatus: string;
      switch (action) {
        case 'pause':
          newStatus = 'paused';
          break;
        case 'resume':
          newStatus = 'scheduled';
          break;
        case 'stop':
          newStatus = 'cancelled';
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('email_schedules')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) {
        console.error('Failed to update campaign:', error);
        return;
      }

      // Reload campaigns
      await loadCampaigns();
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const filteredCampaigns = selectedClientId 
    ? campaigns.filter(c => c.client_id === selectedClientId)
    : campaigns;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <StopCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNextRun = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading campaigns...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Campaign Manager</h2>
          <p className="text-gray-600 mt-1">
            Manage your AI-powered follow-up campaigns
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Bot className="w-4 h-4 mr-2" />
          New Smart Campaign
        </Button>
      </div>

      {/* Client Filter */}
      {clients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedClientId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedClientId(null)}
          >
            All Clients ({campaigns.length})
          </Button>
          {clients.map(client => {
            const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
            if (clientCampaigns.length === 0) return null;
            
            return (
              <Button
                key={client.id}
                variant={selectedClientId === client.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClientId(client.id)}
              >
                {client.name} ({clientCampaigns.length})
              </Button>
            );
          })}
        </div>
      )}

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedClientId ? 'No campaigns for this client' : 'No Smart Campaigns yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedClientId 
              ? 'This client doesn\'t have any active campaigns.' 
              : 'Create your first AI-powered follow-up campaign to automatically engage with clients.'
            }
          </p>
          <Button 
            onClick={onCreateNew}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Smart Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Campaign Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <h3 className="font-medium text-gray-900">
                      {campaign.client_name}
                    </h3>
                    <Badge className={`flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Campaign Details */}
                  <div className="mb-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-1">
                      {campaign.name}
                    </h4>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {campaign.email_subject}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{campaign.send_count}/{campaign.max_sends} sent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Every {campaign.interval_days}d</span>
                    </div>
                    {campaign.next_run_at && campaign.status === 'scheduled' && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Next: {formatNextRun(campaign.next_run_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {campaign.status === 'scheduled' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCampaignAction(campaign.id, 'pause')}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : campaign.status === 'paused' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCampaignAction(campaign.id, 'resume')}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  ) : null}
                  
                  {['scheduled', 'paused'].includes(campaign.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCampaignAction(campaign.id, 'stop')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <StopCircle className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Campaign Progress</span>
                  <span>{Math.round((campaign.send_count / campaign.max_sends) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((campaign.send_count / campaign.max_sends) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
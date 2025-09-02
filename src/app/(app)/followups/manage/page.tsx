"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { MessageDetailModal } from "@/components/followups/MessageDetailModal";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import { 
  ManageIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  DeleteIcon,
  SendIcon,
  PauseIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  CopyIcon
} from "@/components/icons";

interface FollowupMessage {
  id: string;
  client_id: string;
  type: 'followup' | 'reminder' | 'update';
  tone: 'friendly' | 'professional' | 'firm';
  channel: 'email' | 'whatsapp';
  subject?: string;
  body: string;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  clients?: {
    name: string;
    email: string;
  };
  related_invoice_id?: string;
  invoices?: {
    number: string;
    amount_cents: number;
    currency: string;
  };
}

interface EmailSchedule {
  id: string;
  name: string;
  email_subject?: string;
  email_body?: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'paused';
  scheduled_at: string;
  next_run_at?: string;
  send_count: number;
  max_sends?: number;
  clients?: {
    name: string;
  };
}

export default function FollowupManagePage() {
  const [messages, setMessages] = useState<FollowupMessage[]>([]);
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'messages' | 'schedules'>('messages');
  const [selectedMessage, setSelectedMessage] = useState<FollowupMessage | null>(null);
  const [messageDetailOpen, setMessageDetailOpen] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Function to reload data
  const reloadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Reload messages with client and invoice data
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          clients!inner(name, email),
          invoices(number, amount_cents, currency)
        `)
        .eq('owner_uid', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Reload email schedules
      const { data: schedulesData } = await supabase
        .from('email_schedules')
        .select(`
          id,
          name,
          email_subject,
          email_body,
          status,
          scheduled_at,
          next_run_at,
          send_count,
          max_sends,
          created_at,
          clients!inner(name)
        `)
        .eq('owner_uid', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setMessages(messagesData || []);
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error("Failed to reload data:", error);
    }
  };

  // Check URL params for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'schedules') {
      setActiveTab('schedules');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        // Load messages with client and invoice data
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            *,
            clients!inner(name, email),
            invoices(number, amount_cents, currency)
          `)
          .eq('owner_uid', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Load email schedules
        const { data: schedulesData } = await supabase
          .from('email_schedules')
          .select(`
            id,
            name,
            email_subject,
            email_body,
            status,
            scheduled_at,
            next_run_at,
            send_count,
            max_sends,
            created_at,
            clients!inner(name)
          `)
          .eq('owner_uid', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setMessages(messagesData || []);
        setSchedules(schedulesData || []);

      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon size="sm" className="text-green-600" />;
      case 'failed':
        return <AlertCircleIcon size="sm" className="text-red-600" />;
      case 'queued':
        return <ClockIcon size="sm" className="text-yellow-600" />;
      case 'scheduled':
        return <ClockIcon size="sm" className="text-blue-600" />;
      case 'paused':
        return <PauseIcon size="sm" className="text-gray-600" />;
      default:
        return <EditIcon size="sm" className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      queued: 'default',
      sent: 'default',
      failed: 'destructive',
      scheduled: 'default',
      cancelled: 'secondary',
      paused: 'secondary'
    } as const;

    const colors = {
      draft: 'text-gray-600',
      queued: 'text-yellow-600',
      sent: 'text-green-600',
      failed: 'text-red-600',
      scheduled: 'text-blue-600',
      cancelled: 'text-gray-500',
      paused: 'text-orange-600'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amountCents / 100);
  };

  const handlePauseSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('email_schedules')
        .update({ status: 'paused' })
        .eq('id', scheduleId);

      if (!error) {
        setSchedules(prev => 
          prev.map(s => s.id === scheduleId ? { ...s, status: 'paused' as const } : s)
        );
      }
    } catch (error) {
      console.error('Failed to pause schedule:', error);
    }
  };

  const handleResumeSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('email_schedules')
        .update({ status: 'scheduled' })
        .eq('id', scheduleId);

      if (!error) {
        setSchedules(prev => 
          prev.map(s => s.id === scheduleId ? { ...s, status: 'scheduled' as const } : s)
        );
      }
    } catch (error) {
      console.error('Failed to resume schedule:', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    // Reload data to reflect changes
    await reloadData();
    
    // Update the selected message if it's currently open
    if (selectedMessage && selectedMessage.id === messageId) {
      const updatedMessage = messages.find(m => m.id === messageId);
      if (updatedMessage) {
        setSelectedMessage(updatedMessage);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (!error) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    const matchesType = typeFilter === 'all' || msg.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (schedule as Record<string, unknown>).email_subject?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (schedule as Record<string, unknown>).email_body?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading follow-up management..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">📋 Manage Follow-ups</h1>
          <p className="text-gray-600">
            Track, edit, and manage all your follow-up messages and schedules.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/followups">
            <Button variant="outline" className="animate-apple-press">
              <SendIcon size="sm" className="mr-2" />
              Compose New
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      {(messages.length > 0 || schedules.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <ManageIcon size="sm" variant="accent" />
              <span className="text-body-small font-medium">Total Messages</span>
            </div>
            <p className="text-h2 font-semibold">{messages.length}</p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon size="sm" variant="success" />
              <span className="text-body-small font-medium">Sent</span>
            </div>
            <p className="text-h2 font-semibold text-green-600">
              {messages.filter(m => m.status === 'sent').length}
            </p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon size="sm" variant="warning" />
              <span className="text-body-small font-medium">Scheduled</span>
            </div>
            <p className="text-h2 font-semibold text-blue-600">
              {schedules.filter(s => s.status === 'scheduled').length}
            </p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircleIcon size="sm" variant="error" />
              <span className="text-body-small font-medium">Failed</span>
            </div>
            <p className="text-h2 font-semibold text-red-600">
              {messages.filter(m => m.status === 'failed').length + 
               schedules.filter(s => s.status === 'failed').length}
            </p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'messages'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Messages ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'schedules'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Schedules ({schedules.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'messages' ? "Search messages..." : "Search schedules..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <FilterIcon size="sm" className="mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        {activeTab === 'messages' && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {activeTab === 'messages' ? (
        <>
          {/* Messages List */}
          {filteredMessages.length > 0 ? (
            <div className="space-y-3">
              {filteredMessages.map((message) => (
                <Card key={message.id} className="p-4 border-0 shadow-apple-sm animate-apple-hover">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(message.status)}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.clients?.name || 'Unknown Client'}</span>
                          <Badge variant="outline" className="text-xs">
                            {message.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {message.tone}
                          </Badge>
                        </div>
                        {getStatusBadge(message.status)}
                        {message.related_invoice_id && message.invoices && (
                          <Badge variant="secondary" className="text-xs">
                            #{message.invoices.number} • {formatAmount(message.invoices.amount_cents, message.invoices.currency)}
                          </Badge>
                        )}
                      </div>
                      
                      {message.subject && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Subject: </span>
                          <span className="text-sm text-gray-600">{message.subject}</span>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {message.body}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {new Date(message.created_at).toLocaleDateString()}</span>
                        {message.scheduled_at && (
                          <span>Scheduled: {new Date(message.scheduled_at).toLocaleString()}</span>
                        )}
                        {message.sent_at && (
                          <span>Sent: {new Date(message.sent_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(message.body)}>
                        <CopyIcon size="sm" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(message);
                          setMessageDetailOpen(true);
                        }}
                      >
                        <EyeIcon size="sm" />
                      </Button>
                      
                      {message.status === 'draft' && (
                        <Link href={`/followups?editMessage=${message.id}`}>
                          <Button variant="outline" size="sm">
                            <EditIcon size="sm" />
                          </Button>
                        </Link>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteMessage(message.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <DeleteIcon size="sm" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ManageIcon size="xl" variant="muted" />}
              title="No messages found"
              description="No follow-up messages match your current filters."
              action={{
                label: "Create New Message",
                onClick: () => router.push("/followups"),
              }}
            />
          )}
        </>
      ) : (
        <>
          {/* Schedules List */}
          {filteredSchedules.length > 0 ? (
            <div className="space-y-3">
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className="p-4 border-0 shadow-apple-sm animate-apple-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(schedule.status)}
                        <span className="font-medium">{schedule.name}</span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>Client: {schedule.clients?.name}</span>
                        <span>Sent: {schedule.send_count}/{schedule.max_sends || '∞'}</span>
                      </div>
                      
                      {schedule.email_subject && (
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Subject:</strong> {schedule.email_subject}
                        </div>
                      )}
                      
                      {schedule.email_body && (
                        <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                          {schedule.email_body.length > 100 
                            ? schedule.email_body.substring(0, 100) + '...' 
                            : schedule.email_body
                          }
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Scheduled: {new Date(schedule.scheduled_at).toLocaleString()}</span>
                        {schedule.next_run_at && (
                          <span>Next: {new Date(schedule.next_run_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {schedule.status === 'scheduled' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePauseSchedule(schedule.id)}
                        >
                          <PauseIcon size="sm" />
                        </Button>
                      ) : schedule.status === 'paused' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResumeSchedule(schedule.id)}
                        >
                          <PlayIcon size="sm" />
                        </Button>
                      ) : null}
                      
                      <Button variant="outline" size="sm">
                        <EyeIcon size="sm" />
                      </Button>
                      
                      <Link href={`/followups?editSchedule=${schedule.id}`}>
                        <Button variant="outline" size="sm">
                          <EditIcon size="sm" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClockIcon size="xl" variant="muted" />}
              title="No schedules found"
              description="No scheduled follow-ups match your current filters."
              action={{
                label: "Create Scheduled Follow-up",
                onClick: () => router.push("/followups"),
              }}
            />
          )}
        </>
      )}

      {/* Message Detail Modal */}
      <MessageDetailModal
        message={selectedMessage}
        open={messageDetailOpen}
        onOpenChange={setMessageDetailOpen}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
      />
    </div>
  );
}
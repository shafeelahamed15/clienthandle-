'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/LoadingState';
import { REMINDER_STRATEGIES, EMAIL_TEMPLATES } from '@/lib/email/index';
import { Mail, Clock, Send, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface EmailJob {
  id: string;
  client_id: string;
  invoice_id?: string;
  template_id: string;
  recipient_email: string;
  recipient_name: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export function EmailAutomationSettings() {
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('gentle-3-7-14');

  useEffect(() => {
    loadEmailJobs();
  }, []);

  const loadEmailJobs = async () => {
    try {
      const response = await fetch('/api/emails/jobs');
      if (response.ok) {
        const data = await response.json();
        setEmailJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load email jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEmails = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/emails/process');
      if (response.ok) {
        const data = await response.json();
        console.log('Email processing result:', data);
        await loadEmailJobs(); // Reload to see updated statuses
      }
    } catch (error) {
      console.error('Failed to process emails:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOverdue = async () => {
    try {
      const response = await fetch('/api/emails/check-overdue', { method: 'POST' });
      if (response.ok) {
        await loadEmailJobs(); // Reload to see new jobs
      }
    } catch (error) {
      console.error('Failed to check overdue invoices:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      sent: 'default',
      failed: 'destructive',
      cancelled: 'outline'
    } as const;

    const colors = {
      pending: 'text-blue-600',
      sent: 'text-green-600',
      failed: 'text-red-600',
      cancelled: 'text-gray-600'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTemplateName = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    return template?.name || templateId;
  };

  if (loading) {
    return <LoadingState message="Loading email automation..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h2 mb-2">Email Automation</h2>
          <p className="text-body text-muted-foreground">
            Manage automated email reminders and follow-ups for your clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCheckOverdue}
            className="animate-apple-press"
          >
            <Clock className="h-4 w-4 mr-2" />
            Check Overdue
          </Button>
          <Button
            onClick={handleProcessEmails}
            disabled={processing}
            className="animate-apple-press shadow-apple-sm"
          >
            {processing ? (
              <LoadingState message="Processing..." />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Process Emails
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Strategy Selector */}
      <Card className="p-6 border-0 shadow-apple-sm">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-h3">Reminder Strategy</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Default Payment Reminder Strategy
            </label>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    <div>
                      <div className="font-medium">{strategy.name}</div>
                      <div className="text-sm text-muted-foreground">{strategy.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <strong>Selected Strategy:</strong> {REMINDER_STRATEGIES.find(s => s.id === selectedStrategy)?.description}
          </div>
        </div>
      </Card>

      {/* Email Queue */}
      <Card className="p-6 border-0 shadow-apple-sm">
        <div className="flex items-center gap-2 mb-6">
          <Send className="h-5 w-5 text-blue-600" />
          <h3 className="text-h3">Email Queue</h3>
          <Badge variant="outline" className="ml-auto">
            {emailJobs.length} total
          </Badge>
        </div>

        {emailJobs.length > 0 ? (
          <div className="space-y-3">
            {emailJobs.map((job) => (
              <Card key={job.id} className="p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium">{getTemplateName(job.template_id)}</div>
                      <div className="text-sm text-muted-foreground">
                        To: {job.recipient_name} ({job.recipient_email})
                      </div>
                      {job.invoice_id && (
                        <div className="text-sm text-muted-foreground">
                          Invoice: {job.invoice_id}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(job.status)}
                    <div className="text-sm text-muted-foreground mt-1">
                      {job.status === 'sent' && job.sent_at
                        ? `Sent ${formatDate(job.sent_at)}`
                        : job.status === 'pending'
                        ? `Scheduled ${formatDate(job.scheduled_for)}`
                        : job.status === 'failed'
                        ? `Failed (${job.attempts} attempts)`
                        : 'Cancelled'
                      }
                    </div>
                    {job.error_message && (
                      <div className="text-xs text-red-600 mt-1">
                        {job.error_message}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled emails found.</p>
            <p className="text-sm">Email reminders will appear here when invoices become overdue.</p>
          </div>
        )}
      </Card>

      {/* Email Templates Preview */}
      <Card className="p-6 border-0 shadow-apple-sm">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-h3">Available Templates</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMAIL_TEMPLATES.map((template) => (
            <Card key={template.id} className="p-4 border border-gray-200">
              <div className="font-medium mb-2">{template.name}</div>
              <div className="text-sm text-muted-foreground mb-3">
                Subject: {template.subject}
              </div>
              <div className="text-xs text-muted-foreground">
                Variables: {template.variables.slice(0, 3).join(', ')}
                {template.variables.length > 3 && ` +${template.variables.length - 3} more`}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
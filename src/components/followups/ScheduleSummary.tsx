'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Repeat, 
  Send, 
  User, 
  FileText, 
  Mail,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
}

interface SchedulePattern {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  timeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  endAfter?: number;
  endDate?: Date;
  daysOfWeek?: number[];
  timeOfDay: string;
}

interface ScheduleSummaryProps {
  client: Client;
  invoice?: Invoice;
  subject: string;
  body: string;
  tone: string;
  scheduleType: 'immediate' | 'custom' | 'recurring';
  scheduledAt?: Date;
  recurrencePattern?: SchedulePattern;
  pauseOnReply: boolean;
  cancelIfPaid: boolean;
  maxSends?: number;
  className?: string;
}

const toneColors = {
  friendly: 'bg-green-100 text-green-800',
  professional: 'bg-blue-100 text-blue-800',
  firm: 'bg-orange-100 text-orange-800',
  gentle: 'bg-pink-100 text-pink-800',
  urgent: 'bg-red-100 text-red-800',
  casual: 'bg-purple-100 text-purple-800',
  helpful_service: 'bg-indigo-100 text-indigo-800',
  assertive: 'bg-yellow-100 text-yellow-800'
};

export function ScheduleSummary({
  client,
  invoice,
  subject,
  body,
  tone,
  scheduleType,
  scheduledAt,
  recurrencePattern,
  pauseOnReply,
  cancelIfPaid,
  maxSends,
  className = ''
}: ScheduleSummaryProps) {
  
  const getScheduleDescription = () => {
    switch (scheduleType) {
      case 'immediate':
        return 'Send immediately';
      case 'custom':
        if (scheduledAt) {
          return `Send on ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`;
        }
        return 'Custom schedule';
      case 'recurring':
        if (recurrencePattern) {
          const { type, interval, timeOfDay, endAfter } = recurrencePattern;
          let desc = `Send ${type}`;
          if (interval > 1) desc += ` every ${interval} ${type}s`;
          desc += ` at ${timeOfDay}`;
          if (endAfter) desc += `, stop after ${endAfter} sends`;
          return desc;
        }
        return 'Recurring schedule';
      default:
        return 'Not configured';
    }
  };

  const getNextSendDate = () => {
    if (scheduleType === 'immediate') {
      return 'Now';
    } else if (scheduleType === 'custom' && scheduledAt) {
      return scheduledAt.toLocaleDateString();
    } else if (scheduleType === 'recurring' && recurrencePattern) {
      const now = new Date();
      const [hours, minutes] = recurrencePattern.timeOfDay.split(':').map(Number);
      const nextSend = new Date();
      nextSend.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for next occurrence
      if (nextSend <= now) {
        if (recurrencePattern.type === 'daily') {
          nextSend.setDate(nextSend.getDate() + 1);
        } else if (recurrencePattern.type === 'weekly') {
          nextSend.setDate(nextSend.getDate() + 7);
        } else if (recurrencePattern.type === 'monthly') {
          nextSend.setMonth(nextSend.getMonth() + 1);
        }
      }
      
      return nextSend.toLocaleDateString();
    }
    return 'Not set';
  };

  const getEstimatedSends = () => {
    if (scheduleType === 'immediate' || scheduleType === 'custom') {
      return 1;
    } else if (scheduleType === 'recurring' && recurrencePattern?.endAfter) {
      return recurrencePattern.endAfter;
    }
    return 'Unlimited';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Follow-up Summary</h3>
        <p className="text-gray-600">Review your follow-up configuration before scheduling</p>
      </div>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recipient Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Recipient</h4>
              <p className="text-gray-700 font-medium">{client.name}</p>
              {client.email && (
                <p className="text-sm text-gray-500">{client.email}</p>
              )}
              {invoice && (
                <Badge variant="outline" className="mt-2">
                  <FileText className="w-3 h-3 mr-1" />
                  Invoice #{invoice.number}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Schedule Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Schedule</h4>
              <p className="text-gray-700 text-sm mb-2">{getScheduleDescription()}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Next: {getNextSendDate()}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Message Preview */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Mail className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Message Preview</h4>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={toneColors[tone as keyof typeof toneColors] || 'bg-gray-100 text-gray-800'}>
                {tone}
              </Badge>
              {scheduleType === 'recurring' && (
                <Badge variant="outline">
                  <Repeat className="w-3 h-3 mr-1" />
                  Recurring
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Email Preview */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-medium">To:</span>
            <span className="text-gray-900">{client.email || client.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-medium">Subject:</span>
            <span className="text-gray-900 font-medium">{subject}</span>
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2">Message body:</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {body}
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Settings */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Advanced Settings</h4>
            <p className="text-sm text-gray-500">Automatic behavior and limitations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pause on Reply</span>
              <div className="flex items-center gap-1">
                {pauseOnReply ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {pauseOnReply ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cancel if Paid</span>
              <div className="flex items-center gap-1">
                {cancelIfPaid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {cancelIfPaid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Maximum Sends</span>
              <Badge variant="outline">
                {getEstimatedSends()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Schedule Type</span>
              <Badge variant="secondary">
                {scheduleType}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Final Status */}
      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-green-800 font-medium">Ready to Schedule</p>
        <p className="text-green-600 text-sm">
          Your follow-up is configured and ready to be scheduled.
        </p>
      </div>
    </div>
  );
}
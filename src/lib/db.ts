import { supabase } from './supabase';

// Types
export interface Client {
  id?: string;
  owner_uid: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  last_contact_at?: string;
  last_reply_at?: string;
  followups_paused?: boolean;
  unsubscribed?: boolean;
  bounce_count?: number;
  last_bounce_at?: string;
  engagement_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id?: string;
  owner_uid: string;
  client_id: string;
  number: string;
  currency: string;
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  due_date: string;
  line_items: Array<{
    description: string;
    qty: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
  tax_percentage: number;
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id?: string;
  owner_uid: string;
  client_id: string;
  type: 'followup' | 'reminder' | 'update';
  tone?: 'friendly' | 'professional' | 'firm' | 'helpful_service';
  angle?: 'forgot_to_add' | 'resource' | 'next_step_question' | 'benefit_framing' | 'deadline_or_capacity' | 'easy_out';
  channel?: 'email' | 'whatsapp' | 'sms';
  subject?: string;
  body: string;
  redacted_body: string;
  related_invoice_id?: string;
  sent_at?: string;
  scheduled_at?: string;
  schedule_timezone?: string;
  recurring_pattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    days?: string[];
    until?: string;
  };
  sequence_id?: string;
  sequence_step?: number;
  tracking_data?: Record<string, string | number | boolean>;
  reply_detected_at?: string;
  unsubscribed_at?: string;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  created_at?: string;
}

export interface Reminder {
  id?: string;
  owner_uid: string;
  invoice_id: string;
  enabled: boolean;
  strategy: 'gentle-3-7-14' | 'firm-7-14-21' | 'custom';
  next_run_at: string;
  last_run_at?: string;
  created_at?: string;
}

export interface EmailSchedule {
  id?: string;
  owner_uid: string;
  client_id: string;
  template_id?: string;
  name: string;
  scheduled_at: string;
  timezone?: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'paused';
  recurring_pattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    days?: string[];
    until?: string;
  };
  sequence_step?: number;
  parent_sequence_id?: string;
  email_subject: string;
  email_body: string;
  variables?: Record<string, string | number | boolean>;
  last_sent_at?: string;
  next_run_at?: string;
  send_count?: number;
  max_sends?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmailTemplate {
  id?: string;
  owner_uid: string;
  name: string;
  category?: 'welcome' | 'followup' | 'payment' | 'acquisition' | 'update' | 'general';
  description?: string;
  subject_template: string;
  body_template: string;
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    default_value?: string | number | boolean | Date;
  }>;
  tone?: 'friendly' | 'professional' | 'firm';
  channel?: 'email' | 'whatsapp';
  is_active?: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FollowupSequence {
  id?: string;
  owner_uid: string;
  name: string;
  description?: string;
  is_active?: boolean;
  steps: Array<{
    step_number: number;
    days_after: number;
    angle: 'forgot_to_add' | 'resource' | 'next_step_question' | 'benefit_framing' | 'deadline_or_capacity' | 'easy_out';
    tone: 'friendly' | 'professional' | 'firm' | 'helpful_service';
    subject_template?: string;
    body_template: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface FollowupQueue {
  id?: string;
  owner_uid: string;
  client_id: string;
  related_invoice_id?: string;
  angle: 'forgot_to_add' | 'resource' | 'next_step_question' | 'benefit_framing' | 'deadline_or_capacity' | 'easy_out';
  tone: 'friendly' | 'professional' | 'firm' | 'helpful_service';
  subject?: string;
  body: string;
  scheduled_at: string;
  sequence_id?: string;
  sequence_step?: number;
  retry_count?: number;
  max_retries?: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  pause_on_reply?: boolean;
  cancel_if_paid?: boolean;
  status: 'queued' | 'sent' | 'paused' | 'cancelled' | 'failed';
  sent_at?: string;
  created_at?: string;
}

export interface EmailAnalytics {
  id?: string;
  owner_uid: string;
  message_id?: string;
  schedule_id?: string;
  client_id: string;
  event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  event_data?: Record<string, string | number | boolean>;
  user_agent?: string;
  ip_address?: string;
  created_at?: string;
}

// Generic CRUD operations
export class SupabaseService<T extends { owner_uid: string }> {
  constructor(private tableName: string) {}

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'> & { owner_uid: string }): Promise<string> {
    try {
      console.log(`🔍 Creating new ${this.tableName} for user:`, data.owner_uid);
      
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert([data])
        .select('id')
        .single();
      
      if (error) {
        console.error(`❌ Error creating ${this.tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Created ${this.tableName} successfully:`, result.id);
      return result.id;
    } catch (error: unknown) {
    const err = error as Error;
      console.error(`❌ Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async get(id: string, ownerUid: string): Promise<T | null> {
    try {
      console.log(`🔍 Getting ${this.tableName} for user:`, ownerUid, 'id:', id);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('owner_uid', ownerUid)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error(`❌ Error getting ${this.tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Retrieved ${this.tableName} successfully`);
      return data;
    } catch (error: unknown) {
    const err = error as Error;
      console.error(`❌ Error getting ${this.tableName}:`, error);
      return null;
    }
  }

  async list(ownerUid: string, options: {
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    filters?: Array<{ column: string; operator: string; value: string | number | boolean }>;
  } = {}): Promise<T[]> {
    try {
      console.log(`🔍 Querying ${this.tableName} for user:`, ownerUid);
      
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('owner_uid', ownerUid);
      
      // Apply filters
      if (options.filters) {
        options.filters.forEach(filter => {
          query = query.filter(filter.column, filter.operator, filter.value);
        });
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      console.log(`📋 Executing query for ${this.tableName}...`);
      const { data, error } = await query;
      
      if (error) {
        console.error(`❌ Error querying ${this.tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Query successful for ${this.tableName}:`, {
        tableName: this.tableName,
        recordCount: data?.length || 0,
        ownerUid
      });
      
      return data || [];
    } catch (error: unknown) {
    const err = error as Error;
      console.error(`❌ Error querying ${this.tableName}:`, {
        error,
        message: err.message,
        code: (err as { code?: string }).code,
        ownerUid,
        tableName: this.tableName
      });
      
      // Provide more specific error messages
      if ((err as { code?: string }).code === 'PGRST301') {
        throw new Error(`Permission denied accessing ${this.tableName}. Check RLS policies and authentication.`);
      } else if (err.message?.includes('connect')) {
        throw new Error(`Database service unavailable. Check your internet connection.`);
      }
      
      throw error;
    }
  }

  async update(id: string, ownerUid: string, updates: Partial<T>): Promise<void> {
    try {
      console.log(`🔍 Updating ${this.tableName} for user:`, ownerUid, 'id:', id);
      
      const { error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .eq('owner_uid', ownerUid);
      
      if (error) {
        console.error(`❌ Error updating ${this.tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Updated ${this.tableName} successfully`);
    } catch (error: unknown) {
    const err = error as Error;
      console.error(`❌ Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id: string, ownerUid: string): Promise<void> {
    try {
      console.log(`🔍 Deleting ${this.tableName} for user:`, ownerUid, 'id:', id);
      
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('owner_uid', ownerUid);
      
      if (error) {
        console.error(`❌ Error deleting ${this.tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Deleted ${this.tableName} successfully`);
    } catch (error: unknown) {
    const err = error as Error;
      console.error(`❌ Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }
}

// Enhanced clients service
class ClientsService extends SupabaseService<Client> {
  constructor() {
    super('clients');
  }
}

// Enhanced invoices service
class InvoicesService extends SupabaseService<Invoice> {
  constructor() {
    super('invoices');
  }
}

// Service instances
export const clientsService = new ClientsService();
export const invoicesService = new InvoicesService();
export const messagesService = new SupabaseService<Message>('messages');
export const remindersService = new SupabaseService<Reminder>('reminders');
export const emailSchedulesService = new SupabaseService<EmailSchedule>('email_schedules');
export const emailTemplatesService = new SupabaseService<EmailTemplate>('email_templates');
export const emailAnalyticsService = new SupabaseService<EmailAnalytics>('email_analytics');
export const followupSequencesService = new SupabaseService<FollowupSequence>('followup_sequences');
export const followupQueueService = new SupabaseService<FollowupQueue>('followup_queue');

// Helper functions for common queries
export const getClientsByName = (ownerUid: string, searchTerm: string) => 
  clientsService.list(ownerUid, {
    orderBy: { column: 'name', ascending: true },
    filters: searchTerm ? [{ column: 'name', operator: 'ilike', value: `%${searchTerm}%` }] : undefined
  });

export const getOverdueInvoices = (ownerUid: string) => 
  invoicesService.list(ownerUid, {
    filters: [{ column: 'status', operator: 'eq', value: 'overdue' }],
    orderBy: { column: 'due_date', ascending: true }
  });

export const getRecentMessages = (ownerUid: string, clientId: string) => 
  messagesService.list(ownerUid, {
    filters: [{ column: 'client_id', operator: 'eq', value: clientId }],
    orderBy: { column: 'created_at', ascending: false },
    limit: 10
  });

export const getPendingReminders = (ownerUid: string) => 
  remindersService.list(ownerUid, {
    filters: [
      { column: 'enabled', operator: 'eq', value: true },
      { column: 'next_run_at', operator: 'lte', value: new Date().toISOString() }
    ],
    orderBy: { column: 'next_run_at', ascending: true }
  });

// Email scheduling helper functions
export const getScheduledEmails = (ownerUid: string) =>
  emailSchedulesService.list(ownerUid, {
    filters: [{ column: 'status', operator: 'eq', value: 'scheduled' }],
    orderBy: { column: 'scheduled_at', ascending: true }
  });

export const getPendingScheduledEmails = (ownerUid: string) =>
  emailSchedulesService.list(ownerUid, {
    filters: [
      { column: 'status', operator: 'eq', value: 'scheduled' },
      { column: 'next_run_at', operator: 'lte', value: new Date().toISOString() }
    ],
    orderBy: { column: 'next_run_at', ascending: true }
  });

export const getEmailTemplatesByCategory = (ownerUid: string, category?: string) =>
  emailTemplatesService.list(ownerUid, {
    filters: [
      { column: 'is_active', operator: 'eq', value: true },
      ...(category ? [{ column: 'category', operator: 'eq', value: category }] : [])
    ],
    orderBy: { column: 'name', ascending: true }
  });

export const getEmailAnalyticsByEvent = (ownerUid: string, eventType: string, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return emailAnalyticsService.list(ownerUid, {
    filters: [
      { column: 'event_type', operator: 'eq', value: eventType },
      { column: 'created_at', operator: 'gte', value: since.toISOString() }
    ],
    orderBy: { column: 'created_at', ascending: false }
  });
};
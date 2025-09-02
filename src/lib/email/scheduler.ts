// Email scheduling service for automated reminders
import { EmailJob, REMINDER_STRATEGIES, getNextReminderDate, calculateDaysOverdue, formatCurrency } from './index';
import { mockInvoicesService, mockClientsService, MOCK_MODE } from '../mock-data';
import { createServerSupabaseClient } from '../supabase-server';

// In-memory storage for development (mock mode)
const emailJobStorage: EmailJob[] = [];

// Email Job Service
export class EmailJobService {
  // Create a new email job
  async create(job: Omit<EmailJob, 'id' | 'created_at' | 'updated_at'>): Promise<EmailJob> {
    const emailJob: EmailJob = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (MOCK_MODE) {
      emailJobStorage.push(emailJob);
      console.log('🎭 Mock email job created:', emailJob.id);
    } else {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('email_jobs')
        .insert([emailJob]);
      
      if (error) {
        throw new Error(`Failed to create email job: ${error.message}`);
      }
    }

    return emailJob;
  }

  // Get pending jobs that are ready to be sent
  async getPendingJobs(): Promise<EmailJob[]> {
    const now = new Date().toISOString();

    if (MOCK_MODE) {
      return emailJobStorage.filter(job => 
        job.status === 'pending' && 
        job.scheduled_for <= now &&
        job.attempts < 3
      );
    } else {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('email_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .lt('attempts', 3)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Failed to fetch pending jobs:', error);
        return [];
      }

      return data || [];
    }
  }

  // Update job status
  async updateJob(jobId: string, updates: Partial<EmailJob>): Promise<void> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (MOCK_MODE) {
      const jobIndex = emailJobStorage.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        emailJobStorage[jobIndex] = { ...emailJobStorage[jobIndex], ...updateData };
      }
    } else {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from('email_jobs')
        .update(updateData)
        .eq('id', jobId);
    }
  }

  // List jobs for a user
  async listJobs(ownerUid: string, limit = 50): Promise<EmailJob[]> {
    if (MOCK_MODE) {
      return emailJobStorage
        .filter(job => job.owner_uid === ownerUid)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    } else {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('email_jobs')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to list jobs:', error);
        return [];
      }

      return data || [];
    }
  }

  // Cancel pending jobs for an invoice (e.g., when paid)
  async cancelInvoiceJobs(invoiceId: string): Promise<void> {
    if (MOCK_MODE) {
      emailJobStorage.forEach(job => {
        if (job.invoice_id === invoiceId && job.status === 'pending') {
          job.status = 'cancelled';
          job.updated_at = new Date().toISOString();
        }
      });
    } else {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from('email_jobs')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending');
    }
  }
}

// Reminder Scheduler Service
export class ReminderScheduler {
  private emailJobService = new EmailJobService();

  // Schedule payment reminders for an invoice
  async schedulePaymentReminders(invoiceId: string, ownerUid: string, strategyId = 'gentle-3-7-14'): Promise<EmailJob[]> {
    const strategy = REMINDER_STRATEGIES.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error(`Unknown reminder strategy: ${strategyId}`);
    }

    // Get invoice and client data
    const invoice = await mockInvoicesService.get(invoiceId, ownerUid);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const client = await mockClientsService.get(invoice.client_id, ownerUid);
    if (!client) {
      throw new Error('Client not found');
    }

    if (!client.email) {
      throw new Error('Client has no email address');
    }

    // Cancel any existing reminders for this invoice
    await this.emailJobService.cancelInvoiceJobs(invoiceId);

    const jobs: EmailJob[] = [];

    // Schedule reminders for each interval
    for (let i = 0; i < strategy.intervals.length; i++) {
      const reminderDate = getNextReminderDate(invoice.due_date, strategy, i);
      if (!reminderDate) continue;

      const templateId = strategy.templates[i] || strategy.templates[strategy.templates.length - 1];
      
      // Prepare variables for template
      const variables = {
        CLIENT_NAME: client.name,
        INVOICE_NUMBER: invoice.number,
        AMOUNT: formatCurrency(invoice.amount_cents, invoice.currency),
        DUE_DATE: new Date(invoice.due_date).toLocaleDateString(),
        DAYS_OVERDUE: calculateDaysOverdue(invoice.due_date).toString(),
        USER_NAME: 'Demo User', // TODO: Get from user profile
        COMPANY_NAME: 'ClientHandle', // TODO: Get from user profile
        USER_EMAIL: 'demo@clienthandle.app' // TODO: Get from user profile
      };

      const job = await this.emailJobService.create({
        owner_uid: ownerUid,
        client_id: client.id!,
        invoice_id: invoiceId,
        template_id: templateId,
        recipient_email: client.email,
        recipient_name: client.name,
        variables,
        scheduled_for: reminderDate.toISOString(),
        status: 'pending',
        attempts: 0
      });

      jobs.push(job);
    }

    console.log(`📅 Scheduled ${jobs.length} payment reminders for invoice ${invoice.number}`);
    return jobs;
  }

  // Schedule a follow-up check-in
  async scheduleFollowUp(clientId: string, ownerUid: string, daysFromNow = 7, templateId = 'followup-check-in'): Promise<EmailJob> {
    const client = await mockClientsService.get(clientId, ownerUid);
    if (!client) {
      throw new Error('Client not found');
    }

    if (!client.email) {
      throw new Error('Client has no email address');
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + daysFromNow);

    const variables = {
      CLIENT_NAME: client.name,
      PROJECT_NAME: 'your project', // TODO: Get from project context
      HAS_DELIVERABLES: 'false',
      DELIVERABLES_LIST: '',
      USER_NAME: 'Demo User',
      COMPANY_NAME: 'ClientHandle',
      USER_EMAIL: 'demo@clienthandle.app'
    };

    const job = await this.emailJobService.create({
      owner_uid: ownerUid,
      client_id: clientId,
      template_id: templateId,
      recipient_email: client.email,
      recipient_name: client.name,
      variables,
      scheduled_for: scheduledDate.toISOString(),
      status: 'pending',
      attempts: 0
    });

    console.log(`📧 Scheduled follow-up for ${client.name} in ${daysFromNow} days`);
    return job;
  }

  // Check and schedule reminders for overdue invoices
  async checkOverdueInvoices(ownerUid: string): Promise<void> {
    const invoices = await mockInvoicesService.list(ownerUid);
    const now = new Date();

    for (const invoice of invoices) {
      // Skip if already paid or void
      if (invoice.status === 'paid' || invoice.status === 'void') {
        continue;
      }

      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Only process overdue invoices
      if (daysOverdue > 0) {
        // Check if we already have reminders scheduled
        const existingJobs = await this.emailJobService.listJobs(ownerUid);
        const hasReminders = existingJobs.some(job => 
          job.invoice_id === invoice.id && 
          job.status === 'pending'
        );

        if (!hasReminders) {
          console.log(`⏰ Invoice ${invoice.number} is ${daysOverdue} days overdue, scheduling reminders`);
          await this.schedulePaymentReminders(invoice.id!, ownerUid);
        }
      }
    }
  }
}

// Email processor for sending scheduled emails
export class EmailProcessor {
  private emailJobService = new EmailJobService();

  async processJobs(): Promise<{ processed: number; sent: number; failed: number }> {
    const pendingJobs = await this.emailJobService.getPendingJobs();
    
    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      processed++;
      
      try {
        // Import email service dynamically to avoid circular dependency
        const { emailService } = await import('./index');
        
        await this.emailJobService.updateJob(job.id, {
          attempts: job.attempts + 1,
          last_attempt_at: new Date().toISOString()
        });

        const result = await emailService.sendEmail(job);

        if (result.success) {
          await this.emailJobService.updateJob(job.id, {
            status: 'sent',
            sent_at: new Date().toISOString()
          });
          sent++;
          console.log(`✅ Email sent: ${job.template_id} to ${job.recipient_email}`);
        } else {
          const newStatus = job.attempts >= 2 ? 'failed' : 'pending';
          await this.emailJobService.updateJob(job.id, {
            status: newStatus,
            error_message: result.error
          });
          failed++;
          console.error(`❌ Email failed: ${result.error}`);
        }
      } catch (error) {
        await this.emailJobService.updateJob(job.id, {
          status: job.attempts >= 2 ? 'failed' : 'pending',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
        console.error(`❌ Job processing failed:`, error);
      }
    }

    if (processed > 0) {
      console.log(`📊 Email processing complete: ${processed} processed, ${sent} sent, ${failed} failed`);
    }

    return { processed, sent, failed };
  }
}

// Export services
export const emailJobService = new EmailJobService();
export const reminderScheduler = new ReminderScheduler();
export const emailProcessor = new EmailProcessor();
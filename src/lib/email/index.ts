// Email service for ClientHandle
import { MOCK_MODE } from '../mock-data';

// Conditionally import SendGrid only on server-side
let sgMail: unknown = null;
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sgMail = require('@sendgrid/mail');
  } catch {
    console.warn('SendGrid not available, using mock mode');
  }
}

// Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface EmailJob {
  id: string;
  owner_uid: string;
  client_id: string;
  invoice_id?: string;
  template_id: string;
  recipient_email: string;
  recipient_name: string;
  variables: Record<string, string>;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  last_attempt_at?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderStrategy {
  id: string;
  name: string;
  description: string;
  intervals: number[]; // Days after due date
  templates: string[]; // Template IDs for each interval
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY && !MOCK_MODE && sgMail) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Built-in reminder strategies
export const REMINDER_STRATEGIES: ReminderStrategy[] = [
  {
    id: 'gentle-3-7-14',
    name: 'Gentle Progression',
    description: 'Friendly reminders at 3, 7, and 14 days after due date',
    intervals: [3, 7, 14],
    templates: ['payment-reminder-gentle', 'payment-reminder-standard', 'payment-reminder-firm']
  },
  {
    id: 'professional-7-14',
    name: 'Professional Standard',
    description: 'Professional reminders at 7 and 14 days',
    intervals: [7, 14],
    templates: ['payment-reminder-standard', 'payment-reminder-firm']
  },
  {
    id: 'firm-7-21',
    name: 'Firm Approach',
    description: 'Direct reminders at 7 and 21 days',
    intervals: [7, 21],
    templates: ['payment-reminder-firm', 'payment-reminder-final']
  }
];

// Email templates
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'payment-reminder-gentle',
    name: 'Gentle Payment Reminder',
    subject: 'Friendly reminder: {{INVOICE_NUMBER}} payment',
    content: `Hi {{CLIENT_NAME}},

I hope this email finds you well! I wanted to gently follow up on invoice {{INVOICE_NUMBER}} for {{AMOUNT}}, which was due on {{DUE_DATE}}.

I know things can get busy, so I thought I'd send a friendly reminder. If you've already sent the payment, please disregard this message.

{{#if PAYMENT_LINK}}
For your convenience, you can pay securely online: {{PAYMENT_LINK}}
{{/if}}

If you have any questions or need to discuss the payment terms, please don't hesitate to reach out. I'm here to help!

Best regards,
{{USER_NAME}}

--
{{COMPANY_NAME}}
{{USER_EMAIL}}`,
    variables: ['CLIENT_NAME', 'INVOICE_NUMBER', 'AMOUNT', 'DUE_DATE', 'PAYMENT_LINK', 'USER_NAME', 'COMPANY_NAME', 'USER_EMAIL']
  },
  {
    id: 'payment-reminder-standard',
    name: 'Standard Payment Reminder',
    subject: 'Payment due: Invoice {{INVOICE_NUMBER}}',
    content: `Dear {{CLIENT_NAME}},

I hope you're doing well. I'm writing to follow up on invoice {{INVOICE_NUMBER}} for {{AMOUNT}}, which was due on {{DUE_DATE}}.

This is a friendly reminder that payment is now {{DAYS_OVERDUE}} days past due. If you've already processed this payment, please let me know so I can update my records.

{{#if PAYMENT_LINK}}
You can pay securely online using this link: {{PAYMENT_LINK}}
{{/if}}

If there are any issues or if you need to discuss payment arrangements, please reach out to me as soon as possible.

Thank you for your attention to this matter.

Best regards,
{{USER_NAME}}

--
{{COMPANY_NAME}}
{{USER_EMAIL}}`,
    variables: ['CLIENT_NAME', 'INVOICE_NUMBER', 'AMOUNT', 'DUE_DATE', 'DAYS_OVERDUE', 'PAYMENT_LINK', 'USER_NAME', 'COMPANY_NAME', 'USER_EMAIL']
  },
  {
    id: 'payment-reminder-firm',
    name: 'Firm Payment Reminder',
    subject: 'Urgent: Payment required for {{INVOICE_NUMBER}}',
    content: `Dear {{CLIENT_NAME}},

This is an urgent reminder regarding invoice {{INVOICE_NUMBER}} for {{AMOUNT}}, which is now {{DAYS_OVERDUE}} days overdue (due date: {{DUE_DATE}}).

Despite previous reminders, this payment remains outstanding. To maintain our professional relationship and avoid any service interruptions, please process this payment immediately.

{{#if PAYMENT_LINK}}
Pay now: {{PAYMENT_LINK}}
{{/if}}

If you're experiencing any issues with payment or need to discuss this matter, please contact me within 48 hours.

Thank you for your immediate attention.

{{USER_NAME}}

--
{{COMPANY_NAME}}
{{USER_EMAIL}}`,
    variables: ['CLIENT_NAME', 'INVOICE_NUMBER', 'AMOUNT', 'DUE_DATE', 'DAYS_OVERDUE', 'PAYMENT_LINK', 'USER_NAME', 'COMPANY_NAME', 'USER_EMAIL']
  },
  {
    id: 'payment-reminder-final',
    name: 'Final Payment Notice',
    subject: 'FINAL NOTICE: Payment required for {{INVOICE_NUMBER}}',
    content: `Dear {{CLIENT_NAME}},

This is a final notice regarding the outstanding payment for invoice {{INVOICE_NUMBER}} ({{AMOUNT}}), which is now {{DAYS_OVERDUE}} days overdue.

Despite multiple reminders, this payment remains unpaid. Please be advised that if payment is not received within 7 business days, we may need to:

• Suspend any ongoing services
• Engage a collections agency
• Report this matter to credit agencies

{{#if PAYMENT_LINK}}
Make payment immediately: {{PAYMENT_LINK}}
{{/if}}

To avoid these actions, please contact me immediately to arrange payment or discuss this matter.

{{USER_NAME}}

--
{{COMPANY_NAME}}
{{USER_EMAIL}}`,
    variables: ['CLIENT_NAME', 'INVOICE_NUMBER', 'AMOUNT', 'DUE_DATE', 'DAYS_OVERDUE', 'PAYMENT_LINK', 'USER_NAME', 'COMPANY_NAME', 'USER_EMAIL']
  },
  {
    id: 'followup-check-in',
    name: 'Project Check-in',
    subject: 'Checking in on {{PROJECT_NAME}}',
    content: `Hi {{CLIENT_NAME}},

I hope you're having a great week! I wanted to check in on the {{PROJECT_NAME}} project and see how everything is progressing from your end.

{{#if HAS_DELIVERABLES}}
As discussed, I've completed the following deliverables:
{{DELIVERABLES_LIST}}
{{/if}}

Is there anything you need from me at this point? Any questions, feedback, or adjustments you'd like to discuss?

I'm always here to ensure the project meets your expectations and timeline.

Looking forward to hearing from you!

Best regards,
{{USER_NAME}}

--
{{COMPANY_NAME}}
{{USER_EMAIL}}`,
    variables: ['CLIENT_NAME', 'PROJECT_NAME', 'HAS_DELIVERABLES', 'DELIVERABLES_LIST', 'USER_NAME', 'COMPANY_NAME', 'USER_EMAIL']
  }
];

// Mock email service for development
class MockEmailService {
  async sendEmail(emailJob: Partial<EmailJob>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('🎭 Mock email sent:', {
      to: emailJob.recipient_email,
      subject: this.renderTemplate(emailJob.template_id!, emailJob.variables!).subject,
      scheduledFor: emailJob.scheduled_for
    });
    
    // Simulate email delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}`
    };
  }

  renderTemplate(templateId: string, variables: Record<string, string>) {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let { subject, content } = template;

    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, content };
  }
}

// Production email service
class ProductionEmailService {
  async sendEmail(emailJob: Partial<EmailJob>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { subject, content } = this.renderTemplate(emailJob.template_id!, emailJob.variables!);
      
      const msg = {
        to: emailJob.recipient_email!,
        from: process.env.FROM_EMAIL || 'noreply@clienthandle.app',
        subject,
        html: content.replace(/\n/g, '<br>'),
        text: content
      };

      const [response] = await sgMail.send(msg);
      
      console.log('✅ Email sent successfully:', {
        messageId: response.headers['x-message-id'],
        to: emailJob.recipient_email
      });

      return {
        success: true,
        messageId: response.headers['x-message-id']
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  renderTemplate(templateId: string, variables: Record<string, string>) {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let { subject, content } = template;

    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, content };
  }
}

// Export the appropriate service
export const emailService = MOCK_MODE ? new MockEmailService() : new ProductionEmailService();

// Utility functions
export function calculateReminderDates(dueDate: string, strategy: ReminderStrategy): Date[] {
  const due = new Date(dueDate);
  return strategy.intervals.map(interval => {
    const reminderDate = new Date(due);
    reminderDate.setDate(due.getDate() + interval);
    return reminderDate;
  });
}

export function getNextReminderDate(dueDate: string, strategy: ReminderStrategy, currentAttempt: number): Date | null {
  const reminderDates = calculateReminderDates(dueDate, strategy);
  if (currentAttempt >= reminderDates.length) {
    return null; // No more reminders
  }
  return reminderDates[currentAttempt];
}

export function formatCurrency(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  });
  return formatter.format(amount);
}

export function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
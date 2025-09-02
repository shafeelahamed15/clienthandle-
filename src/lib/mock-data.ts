// Mock data for development and testing
import { Client, Invoice, Message } from './db';

// Mock clients for testing
export const mockClients: Client[] = [
  {
    id: '1',
    owner_uid: 'mock-user-1',
    name: 'Sarah Johnson',
    email: 'sarah@techstartup.com',
    phone: '+1 (555) 123-4567',
    company: 'TechStartup Inc',
    notes: 'Prefers email communication. Works on mobile app projects.',
    last_contact_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    owner_uid: 'mock-user-1',
    name: 'David Chen',
    email: 'david@designagency.com',
    phone: '+1 (555) 987-6543',
    company: 'Creative Design Agency',
    notes: 'Frequent client, loves detailed mockups.',
    last_contact_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    owner_uid: 'mock-user-1',
    name: 'Emily Rodriguez',
    email: 'emily@consulting.com',
    phone: '+1 (555) 456-7890',
    company: 'Business Consulting LLC',
    notes: 'Needs quarterly reports and analysis.',
    last_contact_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    owner_uid: 'mock-user-1',
    name: 'Michael Thompson',
    email: 'mike@ecommerce.shop',
    company: 'E-commerce Solutions',
    notes: 'Building an online store platform.',
    last_contact_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    owner_uid: 'mock-user-1',
    name: 'Lisa Park',
    email: 'lisa@healthcare.org',
    phone: '+1 (555) 321-9876',
    company: 'Healthcare Solutions',
    notes: 'Works on patient management systems.',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock invoices
export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    owner_uid: 'mock-user-1',
    client_id: '1',
    number: 'INV-2024-001',
    currency: 'USD',
    amount_cents: 250000, // $2,500
    status: 'sent',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    line_items: [
      {
        description: 'Mobile App Development - Phase 1',
        qty: 1,
        unit_price_cents: 250000,
        total_cents: 250000
      }
    ],
    tax_percentage: 0,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inv-2',
    owner_uid: 'mock-user-1',
    client_id: '2',
    number: 'INV-2024-002',
    currency: 'USD',
    amount_cents: 180000, // $1,800
    status: 'paid',
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    line_items: [
      {
        description: 'Website Design & Development',
        qty: 1,
        unit_price_cents: 150000,
        total_cents: 150000
      },
      {
        description: 'Brand Logo Design',
        qty: 1,
        unit_price_cents: 30000,
        total_cents: 30000
      }
    ],
    tax_percentage: 0,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inv-3',
    owner_uid: 'mock-user-1',
    client_id: '3',
    number: 'INV-2024-003',
    currency: 'INR',
    amount_cents: 15000000, // ₹1,50,000
    status: 'draft',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
    line_items: [
      {
        description: 'Business Consulting Services',
        qty: 1,
        unit_price_cents: 15000000,
        total_cents: 15000000
      }
    ],
    tax_percentage: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock messages
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    owner_uid: 'mock-user-1',
    client_id: '1',
    type: 'followup',
    tone: 'friendly',
    channel: 'email',
    subject: 'Quick follow-up on your project',
    body: 'Hi Sarah! Just wanted to check in on the mobile app project. Everything is progressing smoothly and we should have the first milestone ready for review by end of week. Let me know if you have any questions!',
    redacted_body: 'Hi {{CLIENT_NAME}}! Just wanted to check in on the {{PROJECT_TYPE}} project...',
    related_invoice_id: 'inv-1',
    status: 'sent',
    sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Storage for mock data (simulating database) - empty by default
let clientStorage: Client[] = [];
const invoiceStorage: Invoice[] = [];
const messageStorage: Message[] = [];

// Mock database operations
export const mockClientsService = {
  async list(ownerUid: string): Promise<Client[]> {
    return clientStorage.filter(client => client.owner_uid === ownerUid);
  },

  async get(id: string, ownerUid: string): Promise<Client | null> {
    const client = clientStorage.find(c => c.id === id && c.owner_uid === ownerUid);
    return client || null;
  },

  async create(data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const newClient: Client = {
      ...data,
      id: `client-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    clientStorage.push(newClient);
    return newClient.id!;
  },

  async update(id: string, ownerUid: string, data: Partial<Client>): Promise<void> {
    const index = clientStorage.findIndex(c => c.id === id && c.owner_uid === ownerUid);
    if (index !== -1) {
      clientStorage[index] = {
        ...clientStorage[index],
        ...data,
        updated_at: new Date().toISOString()
      };
    }
  },

  async delete(id: string): Promise<void> {
    clientStorage = clientStorage.filter(c => c.id !== id);
  }
};

export const mockInvoicesService = {
  async list(ownerUid: string): Promise<Invoice[]> {
    return invoiceStorage.filter(invoice => invoice.owner_uid === ownerUid);
  },

  async getByClient(clientId: string, ownerUid: string): Promise<Invoice[]> {
    return invoiceStorage.filter(invoice => 
      invoice.client_id === clientId && invoice.owner_uid === ownerUid
    );
  },

  async create(data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const newInvoice: Invoice = {
      ...data,
      id: `inv-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    invoiceStorage.push(newInvoice);
    return newInvoice.id!;
  },

  async get(id: string, ownerUid: string): Promise<Invoice | null> {
    const invoice = invoiceStorage.find(inv => inv.id === id && inv.owner_uid === ownerUid);
    return invoice || null;
  },

  async update(id: string, ownerUid: string, data: Partial<Invoice>): Promise<void> {
    const index = invoiceStorage.findIndex(inv => inv.id === id && inv.owner_uid === ownerUid);
    if (index !== -1) {
      invoiceStorage[index] = {
        ...invoiceStorage[index],
        ...data,
        updated_at: new Date().toISOString()
      };
    }
  },

  async delete(id: string): Promise<void> {
    const index = invoiceStorage.findIndex(inv => inv.id === id);
    if (index !== -1) {
      invoiceStorage.splice(index, 1);
    }
  }
};

export const mockMessagesService = {
  async list(ownerUid: string): Promise<Message[]> {
    return messageStorage.filter(message => message.owner_uid === ownerUid);
  },

  async getByClient(clientId: string, ownerUid: string): Promise<Message[]> {
    return messageStorage.filter(message => 
      message.client_id === clientId && message.owner_uid === ownerUid
    );
  },

  async create(data: Omit<Message, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const newMessage: Message = {
      ...data,
      id: `msg-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    messageStorage.push(newMessage);
    return newMessage.id!;
  }
};

// Reply-focused mock AI templates
const mockAITemplates = {
  followup: {
    friendly: [
      "Hey {{CLIENT_NAME}}! 🤔 Quick question - I just had an idea that could save you time on this project. Got 2 minutes to chat about it?",
      "Hi {{CLIENT_NAME}}! Something interesting came up that might affect our timeline (in a good way). When would be a good time to fill you in?",
      "{{CLIENT_NAME}} - I was just thinking about your project and remembered you mentioned wanting to [specific detail]. How's that going on your end?"
    ],
    professional: [
      "Hi {{CLIENT_NAME}}, I've identified a potential optimization in our approach that could deliver results 2 weeks earlier. Would you like me to explain the details?",
      "{{CLIENT_NAME}}, based on our progress, I have a strategic question about the next phase that needs your input. When can we discuss?",
      "Hello {{CLIENT_NAME}}, I need your decision on two different approaches for the final deliverable. Each has distinct advantages - which direction interests you more?"
    ],
    firm: [
      "{{CLIENT_NAME}}, I need your approval on the final specifications by Thursday to maintain our launch date. Which option do you prefer: A or B?",
      "Hi {{CLIENT_NAME}}, we're at a decision point that affects the project timeline. I need your input by tomorrow - can you respond with your preference?",
      "{{CLIENT_NAME}}, the project is ready for your review, but I need feedback by Friday to stay on schedule. What questions do you have?"
    ]
  },
  reminder: {
    friendly: [
      "Hi {{CLIENT_NAME}}! Just a gentle reminder about invoice {{INVOICE_NUMBER}} for {{CURRENCY}} {{AMOUNT}}. No rush, but it was due on {{DUE_DATE}}. Thanks! 😊",
      "Hey {{CLIENT_NAME}}! Hope you're well. Just wanted to remind you about the outstanding invoice {{INVOICE_NUMBER}} ({{CURRENCY}} {{AMOUNT}}). Let me know if you have any questions!",
      "Hi {{CLIENT_NAME}}! Friendly reminder about invoice {{INVOICE_NUMBER}} for {{CURRENCY}} {{AMOUNT}}. It was due {{DUE_DATE}}. Thanks for taking care of this!"
    ],
    professional: [
      "Dear {{CLIENT_NAME}}, This is a reminder that invoice {{INVOICE_NUMBER}} for {{CURRENCY}} {{AMOUNT}} was due on {{DUE_DATE}}. Please process payment at your earliest convenience.",
      "Hello {{CLIENT_NAME}}, I'm writing to remind you that invoice {{INVOICE_NUMBER}} ({{CURRENCY}} {{AMOUNT}}) is now overdue. Payment was due on {{DUE_DATE}}.",
      "Hi {{CLIENT_NAME}}, Please note that invoice {{INVOICE_NUMBER}} for {{CURRENCY}} {{AMOUNT}} remains outstanding. The due date was {{DUE_DATE}}."
    ],
    firm: [
      "Dear {{CLIENT_NAME}}, Invoice {{INVOICE_NUMBER}} for {{CURRENCY}} {{AMOUNT}} is now {{DAYS_PAST_DUE}} days overdue. Please remit payment immediately.",
      "{{CLIENT_NAME}}, Payment for invoice {{INVOICE_NUMBER}} ({{CURRENCY}} {{AMOUNT}}) is seriously overdue. Please settle this account within 48 hours.",
      "Dear {{CLIENT_NAME}}, Invoice {{INVOICE_NUMBER}} totaling {{CURRENCY}} {{AMOUNT}} requires immediate attention. Payment is {{DAYS_PAST_DUE}} days past due."
    ]
  },
  update: {
    friendly: [
      "Hi {{CLIENT_NAME}}! 🎉 Great news! I've completed the latest milestone on your project. Everything is looking fantastic and we're right on schedule!",
      "Hey {{CLIENT_NAME}}! Just wanted to give you a quick update - the project is coming along beautifully! Can't wait to show you what we've accomplished.",
      "Hi {{CLIENT_NAME}}! Hope you're having a great day! I've got some exciting updates on your project to share with you."
    ],
    professional: [
      "Dear {{CLIENT_NAME}}, I'm pleased to provide you with an update on your project. We have successfully completed the current phase and are proceeding as scheduled.",
      "Hello {{CLIENT_NAME}}, I wanted to update you on the project progress. All deliverables for this milestone have been completed and are ready for your review.",
      "Hi {{CLIENT_NAME}}, I'm writing to inform you that we've reached an important milestone in your project. All objectives have been met according to our timeline."
    ],
    firm: [
      "Dear {{CLIENT_NAME}}, Project update: Current phase completed. Your review and approval required by end of week to maintain schedule.",
      "{{CLIENT_NAME}}, Status update: Milestone delivered as agreed. Need your feedback within 48 hours to proceed with next phase.",
      "Dear {{CLIENT_NAME}}, Project milestone completed on schedule. Please review deliverables and confirm approval to continue."
    ]
  }
};

// Mock AI generation service
export const mockAIService = {
  async generateFollowup(
    type: 'followup' | 'reminder' | 'update',
    tone: 'friendly' | 'professional' | 'firm',
    context: { clientName: string; invoiceNumber?: string; amount?: string; currency?: string; dueDate?: string; daysPastDue?: number }
  ): Promise<{ subject: string; message: string; provider: string; redactedContext: string }> {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const templates = mockAITemplates[type][tone];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Generate subject line based on type and tone
    let subject = '';
    switch (type) {
      case 'followup':
        subject = tone === 'friendly' ? `Quick follow-up - ${context.clientName}` :
                 tone === 'professional' ? `Following up on our project` :
                 `Action needed - ${context.clientName}`;
        break;
      case 'reminder':
        subject = tone === 'friendly' ? `Gentle reminder - Invoice ${context.invoiceNumber}` :
                 tone === 'professional' ? `Payment reminder - Invoice ${context.invoiceNumber}` :
                 `Urgent: Overdue payment - Invoice ${context.invoiceNumber}`;
        break;
      case 'update':
        subject = tone === 'friendly' ? `Great news about your project! 🎉` :
                 tone === 'professional' ? `Project update - ${context.clientName}` :
                 `Project milestone completed`;
        break;
    }
    
    // Replace variables in template
    let message = template
      .replace(/\{\{CLIENT_NAME\}\}/g, context.clientName)
      .replace(/\{\{INVOICE_NUMBER\}\}/g, context.invoiceNumber || '')
      .replace(/\{\{AMOUNT\}\}/g, context.amount || '')
      .replace(/\{\{CURRENCY\}\}/g, context.currency || '')
      .replace(/\{\{DUE_DATE\}\}/g, context.dueDate || '')
      .replace(/\{\{DAYS_PAST_DUE\}\}/g, context.daysPastDue?.toString() || '');
    
    // Clean up any remaining empty placeholders
    message = message.replace(/\s+/g, ' ').trim();
    
    return {
      subject,
      message,
      provider: 'mock-ai',
      redactedContext: JSON.stringify({ ...context, clientName: '{{CLIENT_NAME}}' })
    };
  }
};

// Initialize mock data
function initializeMockData() {
  if (clientStorage.length === 0) {
    clientStorage.push(...mockClients);
  }
  if (invoiceStorage.length === 0) {
    invoiceStorage.push(...mockInvoices);
  }
  if (messageStorage.length === 0) {
    messageStorage.push(...mockMessages);
  }
}

// Auto-initialize when module is loaded
initializeMockData();

// Simplified mock business profile
export const mockBusinessProfile = {
  business_name: 'Digital Solutions Pro',
  what_you_do: 'I build custom websites and web apps that help businesses grow online',
  communication_style: 'professional'
};

// Enable/disable mock mode
export const MOCK_MODE = false; // Switching to real database mode
# 🧑‍💻 ClientHandle - Apple-Grade Freelancer SaaS

**Vision:** The Apple of freelancer tools - calm, precise, premium. Making users look professional with elegant invoices, polite AI follow-ups, and frictionless workflows.

**Tagline:** *Follow-ups & invoices, the Apple way.*

---

## 🎯 Project Overview

ClientHandle is an AI-powered web application that helps freelancers manage client relationships, follow-ups, and invoices with an Apple-inspired interface. It solves critical pain points: chasing payments, awkward follow-ups, disorganized client management, and lost opportunities.

### Core Features
- **AI Follow-ups**: Creative, reply-focused follow-up emails that get client responses
- **Smart Invoicing**: Auto-fill from CRM, branded minimal PDF, email/WhatsApp send
- **Automatic Reminders**: Scheduled reminders for overdue payments and no-reply nudges
- **Light CRM**: Client history, past invoices, conversation context in one dashboard
- **Global Payments**: Razorpay (India) + Stripe/PayPal (global)

---

## 🎯 AI Follow-up Core Principle

**SINGLE GOAL**: Generate creative, varied follow-up emails that get clients to REPLY

**What AI Needs to Know:**
- What business/service the user provides (simple 1-line description)
- Client context provided by user (personality, project details, relationship notes)

**What AI Should Do:**
- Write engaging, reply-worthy follow-ups that spark curiosity
- Use different creative approaches each time (never repeat styles)
- Reference user's business naturally without over-explaining
- Make messages personal using client context
- Focus on getting opens and replies, not showing off expertise
- Use psychological triggers: questions, curiosity gaps, value hints

**What to AVOID:**
- Complex business profiles with too many fields
- Over-engineered industry templates or jargon
- Lengthy onboarding flows that distract from core goal
- Generic "checking in" messages
- Going off-topic from the core goal: GET REPLIES

**Success Metric**: Client response rate, not message sophistication

---

## 🛠 Tech Stack (Apple-Grade)

### Core Architecture
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI Framework**: Shadcn UI + Tailwind CSS + Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **AI**: OpenAI API (GPT-4)
- **Payments**: Razorpay, Stripe, PayPal (sandbox first)
- **Deployment**: Vercel (frontend), Supabase (backend)
- **Development**: Cursor IDE

### Dependencies
```json
{
  "dependencies": {
    "next": "^15.4.6",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^4.0.0",
    "framer-motion": "^12.23.12",
    "@supabase/supabase-js": "^2.39.3",
    "openai": "^4.0.0",
    "resend": "^4.0.0",
    "razorpay": "^2.9.0",
    "stripe": "^13.0.0",
    "zod": "^4.0.17",
    "jspdf": "^2.5.0"
  }
}
```

---

## 🎨 UI/UX Design Philosophy (Apple-Inspired)

### Experience Pillars
- **Clarity**: One primary action per view, nothing unnecessary
- **Calm**: Abundant whitespace, soft shadows, subtle motion
- **Consistency**: Single visual system - same radii, spacing, typography
- **Trust**: Pristine PDFs, gentle copy, zero dark patterns

### Visual Language

#### Colors
```css
/* Near-monochrome palette */
--bg-primary: #FFFFFF;
--bg-secondary: #FAFAFA;
--text-primary: #0A0A0A;
--text-secondary: #6B7280;
--border: #E5E7EB;
--accent: #0A84FF; /* iOS blue - used sparingly */
```

#### Typography
```css
/* System font stack */
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;

/* Hierarchy */
--display: 44-56px, SemiBold;
--h2-h3: 24-32px, Medium;
--body: 14-16px, Regular;
--line-height: 1.5-1.7;
```

#### Design Tokens
```css
/* Radii & Shadows */
--radius-surface: 16-20px;
--radius-control: 12px;
--shadow-soft: 0 10px 30px rgba(0,0,0,0.06);

/* Motion */
--easing: ease-out / ease-in-out;
--duration: 150-250ms;
--hover-lift: 2-4px;
--press-scale: 0.98;
```

### Key Design Features
- **Hero Simplicity**: Single message + two clear CTAs
- **Dashboard at a Glance**: 3 cards (Overdue, Pending, This Week Paid) + Quick Actions
- **Timeline Views**: iMessage-like client history (invoices & messages interleaved)
- **Composer with Tone Presets**: Friendly/Professional/Firm + "Soft Nudge vs Clear Ask"
- **Invoice Preview**: Live, minimal template with pristine spacing
- **Empty States**: Welcoming, illustrated lightly, single "Add" CTA
- **Settings Minimalism**: Profile, Brand, Payments, AI & Privacy, Plan

### Accessibility
- WCAG AA contrast compliance
- Visible & elegant focus rings
- Keyboard navigation with logical tab order
- Reduced-motion preference respect

---

## 📁 File Structure (Next.js App Router + Supabase)

```
clienthandle/
├─ app/
│  ├─ (marketing)/
│  │  └─ page.tsx                     # Landing page (Apple-inspired)
│  ├─ (auth)/
│  │  ├─ sign-in/page.tsx
│  │  └─ sign-up/page.tsx
│  ├─ (app)/
│  │  ├─ layout.tsx                   # Authenticated shell
│  │  ├─ dashboard/page.tsx           # Cards + quick actions + charts
│  │  ├─ clients/
│  │  │  ├─ page.tsx                  # Client list
│  │  │  └─ [id]/page.tsx             # Client profile + timeline
│  │  ├─ invoices/
│  │  │  ├─ page.tsx                  # Invoices list
│  │  │  └─ create/page.tsx           # Invoice form + live preview
│  │  ├─ followups/
│  │  │  └─ page.tsx                  # AI composer + templates
│  │  └─ settings/
│  │     └─ page.tsx                  # Profile/Brand/Payments/AI
│  ├─ api/
│  │  ├─ ai/compose/route.ts          # AI follow-up generation
│  │  ├─ payments/
│  │  │  ├─ razorpay/route.ts
│  │  │  ├─ stripe/route.ts
│  │  │  └─ paypal/route.ts
│  │  └─ webhooks/
│  │     ├─ razorpay/route.ts
│  │     ├─ stripe/route.ts
│  │     └─ paypal/route.ts
│  └─ layout.tsx                       # Global layout
├─ components/
│  ├─ ui/                              # shadcn/ui components
│  ├─ layout/
│  │  ├─ AppSidebar.tsx
│  │  └─ Topbar.tsx
│  ├─ dashboard/
│  │  ├─ StatsCard.tsx
│  │  └─ QuickActions.tsx
│  ├─ clients/
│  │  ├─ ClientList.tsx
│  │  └─ ClientTimeline.tsx
│  ├─ invoices/
│  │  ├─ InvoiceForm.tsx
│  │  ├─ InvoicePreview.tsx
│  │  └─ PdfActions.tsx
│  ├─ followups/
│  │  ├─ ToneSelector.tsx
│  │  └─ FollowupComposer.tsx
│  ├─ common/
│  │  ├─ EmptyState.tsx
│  │  ├─ ConfirmDialog.tsx
│  │  └─ LoadingState.tsx
│  └─ charts/
│     └─ TinyArea.tsx
├─ lib/
│  ├─ supabase.ts                      # SDK initialization
│  ├─ auth.ts                          # Auth helpers
│  ├─ db.ts                            # PostgreSQL CRUD wrappers
│  ├─ redact.ts                        # PII redaction utilities
│  ├─ ai.ts                            # OpenAI/Claude clients
│  ├─ pdf.ts                           # Invoice PDF generator
│  ├─ payments/
│  │  ├─ razorpay.ts
│  │  ├─ stripe.ts
│  │  └─ paypal.ts
│  ├─ csp.ts                           # Security headers
│  └─ rate-limit.ts                    # Rate limiting middleware
├─ styles/
│  ├─ globals.css
│  └─ theme.css                        # Design tokens
├─ supabase/
│  ├─ schema.sql                       # Database schema & RLS policies
│  ├─ functions/
│  │  ├─ reminders/
│  │  │  └─ index.ts                   # Scheduled jobs
│  │  └─ webhooks/
│  │     └─ index.ts                   # Webhook verification
│  └─ migrations/                      # Database migrations
├─ public/
│  └─ brand/placeholder-logo.svg
├─ scripts/
│  └─ seed.ts                          # Local seeding
├─ .env.example
└─ SECURITY.md
```

---

## 🗂 Database Schemas (PostgreSQL)

### Security Model
- Every table has `owner_uid` field referencing auth.users(id)
- Row Level Security (RLS) enforces `owner_uid = auth.uid()`
- PostgreSQL triggers for automatic timestamps
- UUID primary keys for all tables

### Tables

#### `users`
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan user_plan DEFAULT 'free',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  brand_logo_url TEXT,
  brand_accent_color TEXT DEFAULT '#0A84FF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `clients`
```sql
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**: `(owner_uid, name)`, `(owner_uid, email)`, `(owner_uid, last_contact_at DESC)`

#### `invoices`
```typescript
{
  id: string;
  ownerUid: string;
  clientId: string;           // -> clients.id
  number: string;             // human-readable, unique per owner
  currency: string;           // INR, USD, etc.
  amountCents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  dueDate: Timestamp;
  lineItems: Array<{
    description: string;
    qty: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
  paymentProvider?: 'razorpay' | 'stripe' | 'paypal';
  paymentIntentId?: string;
  paymentLink?: string;
  pdfUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**: `(ownerUid, status)`, `(ownerUid, dueDate asc)`

#### `messages`
```typescript
{
  id: string;
  ownerUid: string;
  clientId: string;
  type: 'followup' | 'reminder' | 'update';
  tone: 'friendly' | 'professional' | 'firm';
  channel: 'email' | 'whatsapp';
  body: string;               // final content
  redactedBody: string;       // AI prompt without PII
  relatedInvoiceId?: string;
  sentAt?: Timestamp;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  createdAt: Timestamp;
}
```

**Indexes**: `(ownerUid, clientId, createdAt desc)`

#### `reminders`
```typescript
{
  id: string;
  ownerUid: string;
  invoiceId: string;
  enabled: boolean;
  strategy: 'gentle-3-7-14' | 'firm-7-14-21' | 'custom';
  nextRunAt: Timestamp;
  lastRunAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### `auditLogs`
```typescript
{
  id: string;
  ownerUid: string;
  action: string;             // 'create_invoice', 'send_followup'
  entityType: string;         // 'invoice' | 'client' | 'message'
  entityId: string;
  deltaHash: string;          // hash of changes
  ipHash: string;             // hashed IP
  at: Timestamp;
}
```

---

## 🔐 Security Policies (Row Level Security)

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Generic policies for all other tables
CREATE POLICY "Users can view own records" ON public.clients
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert own records" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update own records" ON public.clients
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete own records" ON public.clients
  FOR DELETE USING (auth.uid() = owner_uid);

-- Similar policies apply to invoices, messages, reminders, audit_logs
```

---

## 🤖 AI Layer & Security

### PII Redaction
Replace sensitive data in AI prompts:
- Emails → `{{EMAIL}}`
- Phone numbers → `{{PHONE}}`
- Payment links → `{{PAYMENT_LINK}}`
- Internal IDs → Generic references

### AI System Prompt (Follow-up Composer)
```
You are a polite, professional assistant. Write a short, friendly message that gently reminds a client about an invoice or project update. Avoid aggressive language. 

Use provided variables: {{CLIENT_NAME}}, {{INVOICE_NUMBER}}, {{DUE_DATE}}, {{PAYMENT_LINK}}.

Keep under 90 words. Offer help if needed.
```

### Tone Presets
- **Friendly**: Warm, casual language
- **Professional**: Formal but approachable
- **Firm**: Direct but polite

### Rate Limiting
- AI compose: 30 requests/min/user
- Invoice creation: 10 requests/min/user
- Auth attempts: Basic IP + UID throttling
- Trigger reCAPTCHA v3 on suspicious activity

---

## 📅 Development Roadmap

### Phase 1: MVP (4-6 weeks)
- [x] Supabase Auth + onboarding flow
- [x] Client CRUD operations
- [ ] Invoice creation + Apple-style PDF generation
- [ ] AI follow-up composer (OpenAI + Claude)
- [ ] Razorpay sandbox integration
- [ ] Basic dashboard with key metrics

### Phase 2: Automation (3-4 weeks)
- [ ] Scheduled reminder system (Supabase Edge Functions)
- [ ] Stripe & PayPal integration + webhook verification
- [ ] Client conversation history timeline
- [ ] Secure invoice sharing links
- [ ] Email delivery system

### Phase 3: Premium UX (2-3 weeks)
- [ ] Micro-animations and motion polish
- [ ] Advanced analytics dashboard
- [ ] Multilingual follow-up support
- [ ] Team collaboration features (optional)
- [ ] Mobile-responsive refinements

---

## 🛠 Development Guidelines

### Code Standards
- **TypeScript**: Strict mode, no `any` types
- **Validation**: Zod schemas for all inputs
- **Testing**: Jest + React Testing Library for components
- **Linting**: ESLint + Prettier with strict rules
- **Components**: Small, single-responsibility, accessible

### Performance
- **Bundle Size**: Monitor with `@next/bundle-analyzer`
- **Images**: Next.js Image component with optimization
- **Caching**: Implement proper cache headers
- **Core Web Vitals**: Maintain excellent scores

### Security
- **CSP**: Strict Content Security Policy
- **Headers**: Security headers for all routes
- **Input Validation**: Server-side validation for all inputs
- **Secrets**: Environment variables, never in code
- **Audit**: Regular dependency vulnerability scans

---

## 🚀 Commands & Environment

### Development Commands
```bash
# Development server (localhost:3001)
npm run dev:stable

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format

# Supabase local development
npx supabase start
npx supabase db reset
```

### Environment Variables
```env
# Core
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
OPENAI_API_KEY=sk-your_openai_key

# Payments
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email
RESEND_API_KEY=re_your_resend_api_key
```

---

## 🎯 Success Metrics

### User Experience
- **Time to first invoice**: < 5 minutes
- **Follow-up generation**: < 30 seconds
- **Payment collection improvement**: 25% faster
- **User satisfaction**: 4.5+ stars

### Technical Excellence
- **Core Web Vitals**: All green scores
- **Uptime**: 99.9% availability
- **Security**: Zero critical vulnerabilities
- **Performance**: < 2s page load times

---

*Built with Apple's attention to detail and user experience excellence.*
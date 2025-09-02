# ClientHandle - AI-Powered Freelancer SaaS

**Follow-ups & invoices, the Apple way.**

A premium, Apple-inspired freelancer management tool that helps you manage clients, create beautiful invoices, and send AI-powered follow-ups that get responses.

[![Production Status](https://img.shields.io/badge/status-live-brightgreen)](https://clienthandle.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.8-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-latest-green)](https://supabase.com)

## 🌐 Live Production Site

**Visit:** [https://clienthandle.com](https://clienthandle.com)

## ✨ Features

- **🤖 AI-Powered Follow-ups** - Creative, reply-focused emails that get client responses
- **📄 Beautiful Invoices** - Pristine, branded PDFs with professional design
- **⚡ Auto Reminders** - Scheduled reminders for overdue payments
- **💼 Light CRM** - Client history, past invoices, and conversation context
- **🌍 Global Payments** - Razorpay, Stripe, and PayPal integration
- **🔒 Secure Authentication** - Email confirmation and session management

## 🛠 Tech Stack

### Core
- **Framework:** Next.js 14.2.8 (App Router) + TypeScript
- **UI/UX:** Shadcn UI + Tailwind CSS + Framer Motion
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **AI:** OpenAI API (GPT-4)
- **Payments:** Razorpay, Stripe, PayPal
- **Deployment:** Vercel (Frontend), Supabase (Backend)

### Key Dependencies
```json
{
  "next": "^14.2.8",
  "@supabase/supabase-js": "^2.39.3",
  "openai": "^4.104.0",
  "tailwindcss": "^4.0.0",
  "framer-motion": "^12.23.12",
  "stripe": "^18.4.0",
  "razorpay": "^2.9.6"
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/shafeelahamed15/clienthandle-.git
cd clienthandle

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) to see the app.

## 🔧 Environment Setup

Create a `.env.local` file with the following variables:

```env
# Core
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Email
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=your_from_email

# Payments (optional for development)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=your_stripe_secret
```

## 📁 Project Structure

```
clienthandle/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Landing page
│   │   ├── (auth)/             # Authentication pages
│   │   ├── (app)/              # Protected app pages
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── layout/             # Layout components
│   │   ├── auth/               # Authentication components
│   │   └── dashboard/          # Dashboard components
│   ├── lib/                    # Utilities and configurations
│   │   ├── supabase.ts         # Supabase client
│   │   ├── auth.ts             # Authentication helpers
│   │   └── ai.ts               # AI integration
│   └── contexts/               # React contexts
├── public/                     # Static assets
└── supabase/                   # Database migrations
```

## 🎨 Design Philosophy

ClientHandle follows Apple's design principles:

- **Clarity:** One primary action per view
- **Calm:** Abundant whitespace and subtle animations
- **Consistency:** Unified design system
- **Trust:** Professional appearance and reliable functionality

## 🔐 Authentication System

- **Email Confirmation Required:** New users must verify their email
- **Session Management:** Secure JWT-based sessions
- **Password Validation:** Minimum security requirements
- **OAuth Support:** Google Sign-In integration
- **Error Handling:** Clear, user-friendly error messages

## 🧪 Testing

The project includes comprehensive authentication tests:

- **Unit Tests:** Core authentication functions
- **Integration Tests:** Full authentication flow
- **Production Tests:** Live environment validation

**Test Results:**
- ✅ 100% Pass Rate (16/16 tests)
- ✅ Production Ready
- ✅ All Security Measures Active

## 📊 Performance

- **Page Load Times:** < 1 second
- **Core Web Vitals:** All green scores
- **CDN:** Cloudflare global acceleration
- **SSL:** HTTPS enforced with valid certificates

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod

# Or connect your GitHub repo to Vercel for automatic deployments
```

### Environment Variables in Production
Make sure to set all environment variables in your deployment platform.

## 🔒 Security Features

- **HTTPS Enforcement:** All traffic encrypted
- **Email Verification:** Required for account activation
- **Input Validation:** Server-side validation for all forms
- **Session Security:** Secure session management
- **CORS Protection:** Properly configured origins
- **Rate Limiting:** Built-in Supabase protection

## 📈 Monitoring & Analytics

### Recommended Tools
- **Error Monitoring:** Sentry integration ready
- **Analytics:** Vercel Analytics enabled
- **Performance:** Core Web Vitals tracking
- **Uptime:** Status page monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Design Inspiration:** Apple's Human Interface Guidelines
- **UI Components:** Shadcn UI component library
- **Authentication:** Supabase Auth
- **AI Integration:** OpenAI GPT-4
- **Deployment:** Vercel Platform

## 📞 Support

- **Live Site:** [https://clienthandle.com](https://clienthandle.com)
- **Issues:** [GitHub Issues](https://github.com/shafeelahamed15/clienthandle-/issues)
- **Discussions:** [GitHub Discussions](https://github.com/shafeelahamed15/clienthandle-/discussions)

---

**Built with Apple's attention to detail and user experience excellence.**

*ClientHandle - Making freelancers look professional, one invoice at a time.* 🚀

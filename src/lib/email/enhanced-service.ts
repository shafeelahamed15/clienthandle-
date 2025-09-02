import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { rateLimit } from '../rate-limit'

// Email provider types
export type EmailProvider = 'resend' | 'nodemailer' | 'simulation'

// Enhanced email interfaces
export interface EmailAttachment {
  content: string // Base64 encoded content
  filename: string
  type: string // MIME type
  disposition: 'attachment' | 'inline'
}

export interface EmailOptions {
  to: string
  from?: string
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  trackingSettings?: {
    clickTracking?: boolean
    openTracking?: boolean
  }
  priority?: 'low' | 'normal' | 'high'
  replyTo?: string
  tags?: Record<string, string>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  provider?: EmailProvider
  retryCount?: number
  error?: string
  deliveryTime?: number
}

export interface EmailServiceConfig {
  primaryProvider: EmailProvider
  fallbackProviders: EmailProvider[]
  retryAttempts: number
  retryDelayMs: number
  enableRateLimit: boolean
  rateLimitPerMinute: number
}

// Enhanced Email Service Class
export class EnhancedEmailService {
  private resend: Resend | null = null
  private nodemailerTransporter: nodemailer.Transporter | null = null
  private config: EmailServiceConfig

  constructor(config: Partial<EmailServiceConfig> = {}) {
    this.config = {
      primaryProvider: 'resend',
      fallbackProviders: ['nodemailer', 'simulation'],
      retryAttempts: 3,
      retryDelayMs: 1000,
      enableRateLimit: true,
      rateLimitPerMinute: 60,
      ...config
    }

    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Initialize Resend
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }

    // Initialize Nodemailer (SMTP fallback)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.nodemailerTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      })
    }
  }

  async sendEmail(
    options: EmailOptions, 
    userId?: string,
    specificProvider?: EmailProvider
  ): Promise<EmailResult> {
    const startTime = Date.now()
    
    // Rate limiting if enabled
    if (this.config.enableRateLimit && userId) {
      try {
        await rateLimit(userId, 'email-send', this.config.rateLimitPerMinute, 60000)
      } catch (error) {
        return {
          success: false,
          error: `Rate limit exceeded: ${error.message}`,
          deliveryTime: Date.now() - startTime
        }
      }
    }

    // Determine provider order
    const providers = specificProvider 
      ? [specificProvider]
      : [this.config.primaryProvider, ...this.config.fallbackProviders]

    let lastError: string = 'No providers available'
    let retryCount = 0

    // Try each provider with retry logic
    for (const provider of providers) {
      for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
        try {
          const result = await this.sendWithProvider(provider, options)
          
          if (result.success) {
            return {
              ...result,
              provider,
              retryCount,
              deliveryTime: Date.now() - startTime
            }
          }

          lastError = result.error || 'Unknown error'
          retryCount++

          // Wait before retry (exponential backoff)
          if (attempt < this.config.retryAttempts - 1) {
            await this.delay(this.config.retryDelayMs * Math.pow(2, attempt))
          }

        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          retryCount++

          if (attempt < this.config.retryAttempts - 1) {
            await this.delay(this.config.retryDelayMs * Math.pow(2, attempt))
          }
        }
      }
    }

    return {
      success: false,
      error: `All providers failed. Last error: ${lastError}`,
      retryCount,
      deliveryTime: Date.now() - startTime
    }
  }

  private async sendWithProvider(provider: EmailProvider, options: EmailOptions): Promise<EmailResult> {
    switch (provider) {
      case 'resend':
        return this.sendWithResend(options)
      case 'nodemailer':
        return this.sendWithNodemailer(options)
      case 'simulation':
        return this.sendWithSimulation(options)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  private async sendWithResend(options: EmailOptions): Promise<EmailResult> {
    if (!this.resend) {
      throw new Error('Resend not configured')
    }

    const fromEmail = options.from || process.env.FROM_EMAIL || 'noreply@clienthandle.com'
    
    console.log('📧 Sending email via Resend:', {
      to: options.to,
      subject: options.subject,
      from: fromEmail
    })

    const data = await this.resend.emails.send({
      from: `ClientHandle <${fromEmail}>`,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        content_type: att.type
      })),
      reply_to: options.replyTo || fromEmail,
      tags: options.tags
    })

    if (data.error) {
      throw new Error(`Resend API error: ${data.error}`)
    }

    return {
      success: true,
      messageId: data.data?.id || 'unknown'
    }
  }

  private async sendWithNodemailer(options: EmailOptions): Promise<EmailResult> {
    if (!this.nodemailerTransporter) {
      throw new Error('Nodemailer not configured')
    }

    const fromEmail = options.from || process.env.FROM_EMAIL || 'noreply@clienthandle.com'

    console.log('📧 Sending email via Nodemailer:', {
      to: options.to,
      subject: options.subject,
      from: fromEmail
    })

    const info = await this.nodemailerTransporter.sendMail({
      from: `ClientHandle <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        content: Buffer.from(att.content, 'base64'),
        filename: att.filename,
        contentType: att.type,
        disposition: att.disposition
      })),
      replyTo: options.replyTo || fromEmail,
      priority: options.priority || 'normal'
    })

    return {
      success: true,
      messageId: info.messageId
    }
  }

  private async sendWithSimulation(options: EmailOptions): Promise<EmailResult> {
    console.log('📧 [SIMULATION] Email would have been sent:', {
      to: options.to,
      subject: options.subject,
      text: options.text?.substring(0, 100) + '...',
      hasHtml: !!options.html,
      attachmentCount: options.attachments?.length || 0
    })

    // Simulate 95% success rate
    const success = Math.random() > 0.05

    if (!success) {
      throw new Error('Simulated email failure')
    }

    return {
      success: true,
      messageId: 'simulation-' + Date.now()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Health check methods
  async testProvider(provider: EmailProvider): Promise<boolean> {
    try {
      const testResult = await this.sendWithProvider(provider, {
        to: 'test@example.com',
        subject: 'Health Check',
        text: 'This is a health check email.',
        html: '<p>This is a health check email.</p>'
      })
      return testResult.success
    } catch {
      return false
    }
  }

  async getProviderStatus(): Promise<Record<EmailProvider, boolean>> {
    const status: Record<string, boolean> = {}

    status.resend = !!this.resend && !!process.env.RESEND_API_KEY
    status.nodemailer = !!this.nodemailerTransporter
    status.simulation = true

    return status as Record<EmailProvider, boolean>
  }

  // Configuration methods
  updateConfig(newConfig: Partial<EmailServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): EmailServiceConfig {
    return { ...this.config }
  }
}

// Global service instance
export const emailService = new EnhancedEmailService()

// Backwards compatibility exports
export const sendEmail = (options: EmailOptions, userId?: string) => 
  emailService.sendEmail(options, userId)

export const isEmailServiceConfigured = () => 
  Object.values(emailService.getProviderStatus()).some(status => status)

// Enhanced template functions with better error handling
export function createEmailTemplate(options: {
  content: string
  clientName: string
  senderName: string
  brandColor?: string
  includeUnsubscribe?: boolean
  unsubscribeUrl?: string
}): string {
  const { 
    content, 
    clientName, 
    senderName, 
    brandColor = '#0A84FF', 
    includeUnsubscribe = true,
    unsubscribeUrl = '#'
  } = options

  // Sanitize inputs to prevent XSS
  const sanitize = (str: string) => str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const safeContent = content.replace(/\n/g, '<br>')
  const safeSenderName = sanitize(senderName)
  const safeClientName = sanitize(clientName)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from ${safeSenderName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
            line-height: 1.6;
            color: #1D1D1F;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #FAFAFA;
        }
        .email-container {
            background-color: #FFFFFF;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        .header {
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            color: ${brandColor};
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        .greeting {
            color: #6B7280;
            font-size: 14px;
            margin: 5px 0 0 0;
        }
        .content {
            white-space: pre-line;
            font-size: 16px;
            line-height: 1.7;
            margin: 20px 0;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #9CA3AF;
            font-size: 12px;
        }
        .unsubscribe {
            color: #6B7280;
            text-decoration: none;
            font-size: 11px;
        }
        .unsubscribe:hover {
            text-decoration: underline;
        }
        .powered-by {
            margin-top: 10px;
            color: #D1D5DB;
        }
        .powered-by a {
            color: ${brandColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="logo">ClientHandle</h1>
            <p class="greeting">Professional Business Communication</p>
        </div>
        
        <div class="content">
            ${safeContent}
        </div>
        
        <div class="signature">
            Best regards,<br>
            <strong>${safeSenderName}</strong>
        </div>
        
        <div class="footer">
            ${includeUnsubscribe ? `
            <p>
                <a href="${unsubscribeUrl}" class="unsubscribe">Unsubscribe from these emails</a>
            </p>
            ` : ''}
            <p class="powered-by">
                Sent with ❤️ using <a href="https://clienthandle.com">ClientHandle</a>
            </p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

export function createPlainTextEmail(options: {
  content: string
  senderName: string
  includeUnsubscribe?: boolean
  unsubscribeUrl?: string
}): string {
  const { content, senderName, includeUnsubscribe = true, unsubscribeUrl = 'https://clienthandle.com/unsubscribe' } = options

  let emailText = `${content}

Best regards,
${senderName}

---
Sent using ClientHandle - Professional Business Communication
https://clienthandle.com`

  if (includeUnsubscribe) {
    emailText += `

To unsubscribe from these emails, visit: ${unsubscribeUrl}`
  }

  return emailText.trim()
}
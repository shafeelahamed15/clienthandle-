import { Resend } from 'resend'
import { emailService as enhancedEmailService } from './email/enhanced-service'
import { emailTrackingService, enhanceEmailWithTracking } from './email/tracking'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

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
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send email using enhanced email service with fallback and tracking
 */
export async function sendEmail(options: EmailOptions, userId?: string, messageId?: string): Promise<EmailResult> {
  try {
    // Use the enhanced email service for better reliability
    const result = await enhancedEmailService.sendEmail({
      ...options,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
        ...options.trackingSettings
      }
    }, userId)

    // If successful and we have tracking info, record the sent event
    if (result.success && messageId && userId) {
      await emailTrackingService.recordEvent({
        messageId,
        ownerUid: userId,
        clientId: options.to, // This should be client ID, but using email as fallback
        event: 'sent',
        eventData: {
          timestamp: new Date().toISOString(),
          provider: result.provider,
          subject: options.subject
        }
      })
    }

    return result

  } catch (error: unknown) {
    console.error('Enhanced email service error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

/**
 * Legacy send email function (backwards compatibility)
 */
export async function sendEmailLegacy(options: EmailOptions): Promise<EmailResult> {
  try {
    // Check if we have Resend configured - if not, simulate
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 [SIMULATION] Resend not configured - would have sent:')
      console.log({
        to: options.to,
        from: options.from || process.env.FROM_EMAIL || 'noreply@clienthandle.com',
        subject: options.subject,
        text: options.text?.substring(0, 100) + '...',
        hasAttachments: !!options.attachments?.length
      })
      
      return {
        success: true,
        messageId: 'simulation-' + Date.now()
      }
    }

    const fromEmail = options.from || process.env.FROM_EMAIL || 'noreply@clienthandle.com'
    
    console.log('📧 Sending email via Resend (legacy):', {
      from: `ClientHandle <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      hasText: !!options.text,
      hasHtml: !!options.html,
      attachmentCount: options.attachments?.length || 0
    })

    const data = await resend.emails.send({
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
      reply_to: fromEmail,
    })
    
    console.log('📧 Resend response:', {
      success: !!data.data?.id,
      messageId: data.data?.id,
      error: data.error || null
    })
    
    return {
      success: true,
      messageId: data.data?.id || 'unknown'
    }

  } catch (error: unknown) {
    console.error('Resend email error:', error)
    
    // Handle Resend specific errors
    if (error.message) {
      return {
        success: false,
        error: `Resend Error: ${error.message}`
      }
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Create HTML email template with dynamic business branding and tracking
 */
export function createEmailTemplate(options: {
  content: string
  clientName: string
  senderName: string
  businessName?: string
  brandColor?: string
  includeUnsubscribe?: boolean
  messageId?: string
  clientId?: string
}): string {
  const { content, clientName, senderName, businessName, brandColor = '#0A84FF', includeUnsubscribe = true, messageId, clientId } = options

  let htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from ${senderName}</title>
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
            <h1 class="logo">${businessName || senderName}</h1>
            <p class="greeting">Professional Business Communication</p>
        </div>
        
        <div class="content">
            ${content.replace(/\n/g, '<br>')}
        </div>
        
        <div class="signature">
            Best regards,<br>
            <strong>${businessName || senderName}</strong>
        </div>
        
        <div class="footer">
            ${includeUnsubscribe ? `
            <p>
                <a href="#" class="unsubscribe">Unsubscribe from these emails</a>
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

  // Add tracking if messageId and clientId are provided
  if (messageId && clientId) {
    htmlTemplate = enhanceEmailWithTracking(htmlTemplate, messageId, clientId)
  }

  return htmlTemplate
}

/**
 * Create plain text version of email
 */
export function createPlainTextEmail(options: {
  content: string
  senderName: string
  businessName?: string
}): string {
  const { content, senderName, businessName } = options

  return `
${content}

Best regards,
${businessName || senderName}

---
Sent using ClientHandle - Professional Business Communication
https://clienthandle.com
  `.trim()
}

/**
 * Convert PDF buffer to Resend attachment format
 */
export function createPDFAttachment(pdfBuffer: Buffer, filename: string): EmailAttachment {
  return {
    content: pdfBuffer.toString('base64'),
    filename: filename,
    type: 'application/pdf',
    disposition: 'attachment'
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if Resend is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
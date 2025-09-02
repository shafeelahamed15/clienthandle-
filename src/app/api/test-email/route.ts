import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, createEmailTemplate, createPlainTextEmail, isEmailServiceConfigured } from '@/lib/email'
import { z } from 'zod'

// Simple test email schema
const TestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').default('Test Email from ClientHandle'),
  message: z.string().min(1, 'Message is required').default('This is a test email from your ClientHandle app using Resend!'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const data = TestEmailSchema.parse(body)

    console.log('🧪 Testing email with data:', {
      to: data.to,
      subject: data.subject,
      hasMessage: !!data.message,
      isConfigured: isEmailServiceConfigured()
    })

    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      return NextResponse.json({
        error: 'Resend API key not configured',
        configured: false,
        message: 'Please add RESEND_API_KEY to your environment variables'
      }, { status: 500 })
    }

    // Create email templates
    const htmlContent = createEmailTemplate({
      content: data.message,
      clientName: 'Test User',
      senderName: 'ClientHandle Team',
      brandColor: '#0A84FF',
      includeUnsubscribe: false
    })

    const textContent = createPlainTextEmail({
      content: data.message,
      senderName: 'ClientHandle Team'
    })

    // Send email using Resend
    const emailResult = await sendEmail({
      to: data.to,
      subject: data.subject,
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    })

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
        configured: true
      }, { status: 500 })
    }

    console.log('✅ Test email sent successfully via Resend')
    console.log('📧 Message ID:', emailResult.messageId)

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      message: 'Test email sent successfully via Resend!',
      configured: true,
      sentTo: data.to,
      subject: data.subject
    })

  } catch (error) {
    console.error('Test email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        configured: isEmailServiceConfigured()
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : String(error),
      configured: isEmailServiceConfigured()
    }, { status: 500 })
  }
}

// GET endpoint for simple testing
export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint ready',
    configured: isEmailServiceConfigured(),
    service: 'Resend',
    usage: {
      method: 'POST',
      body: {
        to: 'test@example.com',
        subject: 'Optional - Test Email Subject',
        message: 'Optional - Test message content'
      }
    }
  })
}
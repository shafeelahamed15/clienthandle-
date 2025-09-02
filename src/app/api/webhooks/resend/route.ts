import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/email/tracking'
import { createClient } from '@/lib/supabase'

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.bounced' | 'email.complained'
  created_at: string
  data: {
    id: string
    to: string[]
    from: string
    subject: string
    created_at: string
    bounce?: {
      type: string
      message: string
    }
    complaint?: {
      type: string
      message: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production, you'd verify the signature)
    const signature = request.headers.get('resend-signature')
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    
    if (webhookSecret && !signature) {
      console.error('Missing Resend webhook signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Parse the webhook payload
    const event: ResendWebhookEvent = await request.json()
    
    console.log('📧 Received Resend webhook:', {
      type: event.type,
      messageId: event.data.id,
      to: event.data.to[0]
    })

    // Find the message in our database by Resend message ID
    const supabase = createClient()
    const { data: message, error } = await supabase
      .from('messages')
      .select('id, owner_uid, client_id')
      .eq('status', 'sent')
      .contains('tracking_data', { resend_id: event.data.id })
      .single()

    if (error || !message) {
      console.log(`📧 Message not found for Resend ID: ${event.data.id}`)
      // Still return 200 to acknowledge the webhook
      return NextResponse.json({ received: true })
    }

    // Process different event types
    switch (event.type) {
      case 'email.delivered':
        await emailTrackingService.recordEvent({
          messageId: message.id,
          ownerUid: message.owner_uid,
          clientId: message.client_id,
          event: 'delivered',
          eventData: {
            timestamp: event.created_at,
            provider: 'resend',
            resend_id: event.data.id
          }
        })
        break

      case 'email.bounced':
        await emailTrackingService.recordBounce({
          messageId: message.id,
          ownerUid: message.owner_uid,
          clientId: message.client_id,
          event: 'bounced',
          bounceReason: event.data.bounce?.message,
          eventData: {
            timestamp: event.created_at,
            provider: 'resend',
            bounce_type: event.data.bounce?.type,
            resend_id: event.data.id
          }
        })
        break

      case 'email.complained':
        await emailTrackingService.recordEvent({
          messageId: message.id,
          ownerUid: message.owner_uid,
          clientId: message.client_id,
          event: 'complained',
          eventData: {
            timestamp: event.created_at,
            provider: 'resend',
            complaint_type: event.data.complaint?.type,
            complaint_message: event.data.complaint?.message,
            resend_id: event.data.id
          }
        })
        break

      case 'email.delivery_delayed':
        console.log(`📧 Email delivery delayed for message ${message.id}`)
        break

      default:
        console.log(`📧 Unhandled Resend event type: ${event.type}`)
    }

    return NextResponse.json({ 
      received: true,
      processed: true,
      messageId: message.id 
    })

  } catch (error) {
    console.error('Error processing Resend webhook:', error)
    
    // Return 200 even on errors to prevent webhook retries
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'resend-webhook',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// SendGrid webhook event types
type SendGridEvent = {
  email: string
  timestamp: number
  'smtp-id': string
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe'
  category?: string[]
  sg_event_id: string
  sg_message_id: string
  useragent?: string
  ip?: string
  url?: string
  reason?: string
  status?: string
  response?: string
  attempt?: string
  type?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production, you should verify this)
    // const signature = request.headers.get('x-twilio-email-event-webhook-signature')
    
    const events: SendGridEvent[] = await request.json()
    
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Process each event
    for (const event of events) {
      try {
        console.log('📧 SendGrid webhook event:', {
          type: event.event,
          email: event.email,
          messageId: event.sg_message_id,
          timestamp: new Date(event.timestamp * 1000).toISOString()
        })

        // Find the message record by email and approximate timestamp
        const eventTime = new Date(event.timestamp * 1000)
        const timeWindow = 5 * 60 * 1000 // 5 minutes window
        const startTime = new Date(eventTime.getTime() - timeWindow)
        const endTime = new Date(eventTime.getTime() + timeWindow)

        // Try to find matching message
        const { data: messages } = await supabase
          .from('messages')
          .select(`
            id,
            client_id,
            clients!inner(email)
          `)
          .eq('clients.email', event.email)
          .gte('created_at', startTime.toISOString())
          .lte('created_at', endTime.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (messages && messages.length > 0) {
          const message = messages[0]

          // Update message status based on event
          let newStatus = 'sent'
          switch (event.event) {
            case 'delivered':
              newStatus = 'sent'
              break
            case 'bounce':
            case 'dropped':
              newStatus = 'failed'
              break
            default:
              newStatus = 'sent'
          }

          // Update message status
          await supabase
            .from('messages')
            .update({ status: newStatus })
            .eq('id', message.id)

          // Record analytics event
          await supabase
            .from('email_analytics')
            .insert({
              owner_uid: (message as Record<string, unknown>).owner_uid as string, // We'll need to get this from the message
              message_id: message.id,
              client_id: message.client_id,
              event_type: event.event,
              event_data: {
                sg_event_id: event.sg_event_id,
                sg_message_id: event.sg_message_id,
                timestamp: event.timestamp,
                reason: event.reason,
                status: event.status,
                response: event.response,
                url: event.url
              },
              user_agent: event.useragent,
              ip_address: event.ip,
              created_at: eventTime.toISOString()
            })

          console.log(`✅ Processed ${event.event} event for message ${message.id}`)
        } else {
          console.log(`⚠️  No matching message found for ${event.email} at ${eventTime.toISOString()}`)
        }

      } catch (eventError) {
        console.error('Failed to process event:', eventError)
        // Continue processing other events
      }
    }

    return NextResponse.json({ success: true, processed: events.length })

  } catch (error) {
    console.error('SendGrid webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'SendGrid webhook endpoint',
    timestamp: new Date().toISOString()
  })
}
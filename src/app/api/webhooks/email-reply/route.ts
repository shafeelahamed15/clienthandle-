import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/email/tracking'
import { createClient } from '@/lib/supabase'

// Generic email reply webhook payload
interface EmailReplyPayload {
  messageId?: string // Our internal message ID
  externalId?: string // Provider's message ID
  from: string // Reply sender email
  to: string // Original recipient (our from address)
  subject: string
  body?: string
  timestamp: string
  provider?: 'resend' | 'sendgrid' | 'postmark' | 'manual'
  headers?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    // Basic authentication - in production, use proper webhook signature verification
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error('Invalid email reply webhook authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: EmailReplyPayload = await request.json()
    
    console.log('📧 Received email reply webhook:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject?.substring(0, 50) + '...',
      provider: payload.provider || 'unknown',
      messageId: payload.messageId,
      externalId: payload.externalId
    })

    // Find the original message and client
    const supabase = createClient()
    let message = null

    // Try to find by internal message ID first
    if (payload.messageId) {
      const { data, error } = await supabase
        .from('messages')
        .select('id, owner_uid, client_id')
        .eq('id', payload.messageId)
        .single()
      
      if (!error && data) {
        message = data
      }
    }

    // If not found, try to find by client email and recent messages
    if (!message) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, owner_uid')
        .eq('email', payload.from)
        .single()

      if (!clientError && client) {
        // Find the most recent message to this client
        const { data: recentMessage, error: messageError } = await supabase
          .from('messages')
          .select('id, owner_uid, client_id')
          .eq('client_id', client.id)
          .eq('owner_uid', client.owner_uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!messageError && recentMessage) {
          message = recentMessage
        }
      }
    }

    if (!message) {
      console.log(`📧 Could not find original message for reply from ${payload.from}`)
      return NextResponse.json({ 
        received: true, 
        warning: 'Original message not found' 
      })
    }

    // Record the reply event
    await emailTrackingService.recordReply({
      messageId: message.id,
      ownerUid: message.owner_uid,
      clientId: message.client_id,
      event: 'clicked', // Using clicked as reply proxy
      eventData: {
        timestamp: payload.timestamp,
        reply_from: payload.from,
        reply_subject: payload.subject,
        reply_body_preview: payload.body?.substring(0, 200),
        provider: payload.provider || 'unknown',
        external_id: payload.externalId
      }
    })

    // Check if this client has active followups that should be paused
    const { data: activeFollowups, error: followupError } = await supabase
      .from('followup_queue')
      .select('id')
      .eq('client_id', message.client_id)
      .eq('owner_uid', message.owner_uid)
      .eq('status', 'queued')
      .eq('pause_on_reply', true)

    if (!followupError && activeFollowups && activeFollowups.length > 0) {
      // Pause all active followups for this client
      await supabase
        .from('followup_queue')
        .update({ status: 'paused' })
        .eq('client_id', message.client_id)
        .eq('owner_uid', message.owner_uid)
        .eq('status', 'queued')
        .eq('pause_on_reply', true)

      console.log(`🔄 Paused ${activeFollowups.length} followups for client ${message.client_id} due to reply`)
    }

    // Update client engagement score (positive interaction)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('engagement_score')
      .eq('id', message.client_id)
      .eq('owner_uid', message.owner_uid)
      .single()

    if (!clientError && client) {
      const newScore = Math.min(100, (client.engagement_score || 50) + 10)
      await supabase
        .from('clients')
        .update({ engagement_score: newScore })
        .eq('id', message.client_id)
        .eq('owner_uid', message.owner_uid)
    }

    return NextResponse.json({
      received: true,
      processed: true,
      messageId: message.id,
      clientId: message.client_id,
      followupsPaused: activeFollowups?.length || 0
    })

  } catch (error) {
    console.error('Error processing email reply webhook:', error)
    
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Manual reply reporting endpoint (for testing or manual reporting)
export async function PUT(request: NextRequest) {
  try {
    const { clientId, ownerUid, messageId } = await request.json()

    // Basic validation
    if (!clientId || !ownerUid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await emailTrackingService.recordReply({
      messageId: messageId || 'manual-' + Date.now(),
      ownerUid,
      clientId,
      event: 'clicked',
      eventData: {
        timestamp: new Date().toISOString(),
        source: 'manual',
        type: 'reply'
      }
    })

    console.log(`📧 Manual reply recorded for client ${clientId}`)

    return NextResponse.json({
      success: true,
      clientId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error recording manual reply:', error)
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 'email-reply-webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Process incoming email reply',
      PUT: 'Manual reply reporting',
      GET: 'Health check'
    }
  })
}
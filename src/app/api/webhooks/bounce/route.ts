import { NextRequest, NextResponse } from 'next/server'
import { bounceHandler, BounceEvent } from '@/lib/email/bounce-handler'
import { createClient } from '@/lib/supabase'

// Generic bounce webhook payload
interface BounceWebhookPayload {
  messageId?: string // Our internal message ID
  externalId?: string // Provider's message ID
  recipient: string // Email that bounced
  bounceType: 'hard' | 'soft' | 'complaint' | 'unsubscribe'
  reason: string
  timestamp: string
  provider: string
  diagnosticCode?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.BOUNCE_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error('Invalid bounce webhook authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: BounceWebhookPayload = await request.json()
    
    console.log('📧 Received bounce webhook:', {
      recipient: payload.recipient,
      bounceType: payload.bounceType,
      reason: payload.reason?.substring(0, 100),
      provider: payload.provider,
      messageId: payload.messageId,
      externalId: payload.externalId
    })

    // Find the message and client
    const supabase = createClient()
    let message = null
    let client = null

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

    // If not found by message ID, try to find by client email
    if (!message) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, owner_uid')
        .eq('email', payload.recipient)
        .single()

      if (!clientError && clientData) {
        client = clientData
        
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

    if (!message && !client) {
      console.log(`📧 Could not find message or client for bounce recipient: ${payload.recipient}`)
      return NextResponse.json({ 
        received: true, 
        warning: 'Message or client not found' 
      })
    }

    // Use found message or create a placeholder for client-only bounces
    const messageId = message?.id || `bounce-${Date.now()}`
    const ownerUid = message?.owner_uid || client?.owner_uid
    const clientId = message?.client_id || client?.id

    if (!ownerUid || !clientId) {
      console.error('Missing required IDs for bounce processing')
      return NextResponse.json({ 
        received: true, 
        error: 'Missing required data' 
      })
    }

    // Create bounce event
    const bounceEvent: BounceEvent = {
      messageId,
      ownerUid,
      clientId,
      bounceType: payload.bounceType,
      reason: payload.reason,
      timestamp: payload.timestamp,
      provider: payload.provider,
      diagnosticCode: payload.diagnosticCode
    }

    // Process the bounce
    await bounceHandler.handleBounce(bounceEvent)

    return NextResponse.json({
      received: true,
      processed: true,
      messageId,
      clientId,
      bounceType: payload.bounceType
    })

  } catch (error) {
    console.error('Error processing bounce webhook:', error)
    
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Bounce statistics endpoint
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const ownerUid = url.searchParams.get('owner_uid')
    const days = parseInt(url.searchParams.get('days') || '30')

    if (!ownerUid) {
      return NextResponse.json({ error: 'Missing owner_uid parameter' }, { status: 400 })
    }

    const stats = await bounceHandler.getBounceStats(ownerUid, days)

    return NextResponse.json({
      success: true,
      period_days: days,
      stats
    })

  } catch (error) {
    console.error('Error getting bounce stats:', error)
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Reactivate client endpoint
export async function PUT(request: NextRequest) {
  try {
    const { clientId, ownerUid, action } = await request.json()

    if (!clientId || !ownerUid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action === 'reactivate') {
      await bounceHandler.reactivateClient(clientId, ownerUid)
      
      return NextResponse.json({
        success: true,
        clientId,
        action: 'reactivated',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing client reactivation:', error)
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check
export async function OPTIONS() {
  return NextResponse.json({
    service: 'bounce-webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Process bounce events',
      GET: 'Get bounce statistics',
      PUT: 'Reactivate client',
      OPTIONS: 'Health check'
    }
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic'

const EmailStatusRequestSchema = z.object({
  messageId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(10)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const params = {
      messageId: url.searchParams.get('messageId') || undefined,
      clientId: url.searchParams.get('clientId') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '10')
    }

    const validatedParams = EmailStatusRequestSchema.parse(params)

    // Base query for messages with analytics
    let query = supabase
      .from('messages')
      .select(`
        id,
        client_id,
        type,
        tone,
        channel,
        subject,
        body,
        status,
        sent_at,
        created_at,
        clients!inner(name, email, company),
        email_analytics(
          id,
          event_type,
          event_data,
          user_agent,
          ip_address,
          created_at
        )
      `)
      .eq('owner_uid', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedParams.messageId) {
      query = query.eq('id', validatedParams.messageId)
    }

    if (validatedParams.clientId) {
      query = query.eq('client_id', validatedParams.clientId)
    }

    query = query.limit(validatedParams.limit)

    const { data: messages, error } = await query

    if (error) {
      console.error('Failed to fetch email status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email status' },
        { status: 500 }
      )
    }

    // Process the data to create a comprehensive status view
    const emailStatuses = messages?.map(message => {
      const analytics = (message.email_analytics as Record<string, unknown>[]) || []
      
      // Group analytics by event type
      const eventCounts = analytics.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Get latest event of each type
      const latestEvents = analytics.reduce((acc, event) => {
        if (!acc[event.event_type] || 
            new Date(event.created_at) > new Date(acc[event.event_type].created_at)) {
          acc[event.event_type] = event
        }
        return acc
      }, {} as Record<string, unknown>)

      // Calculate delivery status
      let deliveryStatus = 'unknown'
      if (eventCounts.bounce || eventCounts.dropped) {
        deliveryStatus = 'failed'
      } else if (eventCounts.delivered) {
        deliveryStatus = 'delivered'
      } else if (message.sent_at) {
        deliveryStatus = 'sent'
      } else {
        deliveryStatus = 'pending'
      }

      // Calculate engagement metrics
      const engagementMetrics = {
        opened: eventCounts.open || 0,
        clicked: eventCounts.click || 0,
        bounced: eventCounts.bounce || 0,
        unsubscribed: eventCounts.unsubscribe || 0,
        spamReports: eventCounts.spamreport || 0
      }

      return {
        id: message.id,
        client: {
          id: message.client_id,
          name: (message.clients as Record<string, unknown>).name as string,
          email: (message.clients as Record<string, unknown>).email as string,
          company: (message.clients as Record<string, unknown>).company as string
        },
        subject: message.subject,
        type: message.type,
        tone: message.tone,
        status: message.status,
        deliveryStatus,
        sentAt: message.sent_at,
        createdAt: message.created_at,
        engagementMetrics,
        eventCounts,
        latestEvents: Object.values(latestEvents).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5) // Get 5 most recent events
      }
    }) || []

    // Calculate summary statistics
    const summary = {
      totalMessages: emailStatuses.length,
      delivered: emailStatuses.filter(msg => msg.deliveryStatus === 'delivered').length,
      failed: emailStatuses.filter(msg => msg.deliveryStatus === 'failed').length,
      pending: emailStatuses.filter(msg => msg.deliveryStatus === 'pending').length,
      totalOpens: emailStatuses.reduce((sum, msg) => sum + msg.engagementMetrics.opened, 0),
      totalClicks: emailStatuses.reduce((sum, msg) => sum + msg.engagementMetrics.clicked, 0),
      openRate: emailStatuses.length > 0 ? 
        emailStatuses.filter(msg => msg.engagementMetrics.opened > 0).length / emailStatuses.length : 0,
      clickRate: emailStatuses.length > 0 ? 
        emailStatuses.filter(msg => msg.engagementMetrics.clicked > 0).length / emailStatuses.length : 0
    }

    return NextResponse.json({
      success: true,
      messages: emailStatuses,
      summary
    })

  } catch (error) {
    console.error('Email status API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
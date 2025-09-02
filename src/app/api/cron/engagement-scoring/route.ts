import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job call
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📊 Starting engagement scoring cron job...')
    
    const supabase = createClient()
    const now = new Date()
    
    // Calculate engagement scores for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all clients that have had email activity in the last 30 days
    const { data: activeClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, owner_uid, engagement_score, last_reply_at')
      .not('unsubscribed', 'eq', true)

    if (clientsError) {
      console.error('Failed to fetch clients:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    if (!activeClients || activeClients.length === 0) {
      console.log('📭 No active clients found for engagement scoring')
      return NextResponse.json({ 
        success: true, 
        processed: 0,
        message: 'No active clients found'
      })
    }

    console.log(`📊 Processing engagement scores for ${activeClients.length} clients`)

    const results = []
    let processed = 0
    let errors = 0

    for (const client of activeClients) {
      try {
        // Calculate engagement score based on recent activity
        const score = await calculateEngagementScore(supabase, client.id, client.owner_uid, thirtyDaysAgo)
        
        // Update client engagement score if it changed significantly
        const currentScore = client.engagement_score || 50
        const scoreDiff = Math.abs(score - currentScore)

        if (scoreDiff >= 5) { // Only update if change is significant
          await supabase
            .from('clients')
            .update({ engagement_score: score })
            .eq('id', client.id)
            .eq('owner_uid', client.owner_uid)

          results.push({
            clientId: client.id,
            oldScore: currentScore,
            newScore: score,
            change: score - currentScore
          })
          processed++
        }

      } catch (error) {
        console.error(`Failed to update engagement score for client ${client.id}:`, error)
        results.push({
          clientId: client.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errors++
      }
    }

    // Calculate overall engagement trends
    const trends = await calculateEngagementTrends(supabase, thirtyDaysAgo)

    console.log(`✅ Engagement scoring completed: ${processed} updated, ${errors} errors`)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      clients_processed: activeClients.length,
      scores_updated: processed,
      errors,
      results,
      trends
    })

  } catch (error) {
    console.error('Engagement scoring cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Engagement scoring failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Calculate engagement score for a client
async function calculateEngagementScore(supabase: any, clientId: string, ownerUid: string, since: Date): Promise<number> {
  try {
    // Get email analytics for this client
    const { data: analytics, error } = await supabase
      .from('email_analytics')
      .select('event_type, created_at')
      .eq('client_id', clientId)
      .eq('owner_uid', ownerUid)
      .gte('created_at', since.toISOString())

    if (error) {
      console.error('Error fetching analytics:', error)
      return 50 // Default neutral score
    }

    // Base score
    let score = 50

    if (!analytics || analytics.length === 0) {
      return score // No activity = neutral
    }

    // Count different types of engagement
    const events = {
      sent: analytics.filter(a => a.event_type === 'sent').length,
      delivered: analytics.filter(a => a.event_type === 'delivered').length,
      opened: analytics.filter(a => a.event_type === 'opened').length,
      clicked: analytics.filter(a => a.event_type === 'clicked').length,
      bounced: analytics.filter(a => a.event_type === 'bounced').length,
      complained: analytics.filter(a => a.event_type === 'complained').length
    }

    // Positive engagement factors
    if (events.sent > 0) {
      const openRate = events.opened / events.sent
      const clickRate = events.clicked / events.sent
      const deliveryRate = events.delivered / events.sent

      // High open rate = positive
      if (openRate > 0.25) score += 20
      else if (openRate > 0.15) score += 10
      else if (openRate > 0.05) score += 5

      // High click rate = very positive
      if (clickRate > 0.1) score += 25
      else if (clickRate > 0.05) score += 15
      else if (clickRate > 0.02) score += 10

      // Good delivery rate = baseline positive
      if (deliveryRate > 0.95) score += 5
      else if (deliveryRate < 0.8) score -= 10
    }

    // Check for recent replies (very positive)
    const { data: client } = await supabase
      .from('clients')
      .select('last_reply_at')
      .eq('id', clientId)
      .eq('owner_uid', ownerUid)
      .single()

    if (client?.last_reply_at) {
      const replyDate = new Date(client.last_reply_at)
      if (replyDate > since) {
        score += 30 // Recent reply is very positive
      }
    }

    // Negative engagement factors
    if (events.bounced > 0) {
      score -= events.bounced * 10 // -10 per bounce
    }

    if (events.complained > 0) {
      score -= events.complained * 30 // -30 per complaint
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)))

  } catch (error) {
    console.error('Error calculating engagement score:', error)
    return 50 // Default neutral score
  }
}

// Calculate overall engagement trends
async function calculateEngagementTrends(supabase: any, since: Date): Promise<any> {
  try {
    // Get overall email metrics
    const { data: allAnalytics } = await supabase
      .from('email_analytics')
      .select('event_type, owner_uid, created_at')
      .gte('created_at', since.toISOString())

    if (!allAnalytics) return null

    const totalEvents = allAnalytics.length
    const eventCounts = allAnalytics.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})

    // Calculate rates
    const sent = eventCounts.sent || 0
    const trends = {
      total_events: totalEvents,
      sent_emails: sent,
      open_rate: sent > 0 ? ((eventCounts.opened || 0) / sent * 100).toFixed(2) : 0,
      click_rate: sent > 0 ? ((eventCounts.clicked || 0) / sent * 100).toFixed(2) : 0,
      bounce_rate: sent > 0 ? ((eventCounts.bounced || 0) / sent * 100).toFixed(2) : 0,
      complaint_rate: sent > 0 ? ((eventCounts.complained || 0) / sent * 100).toFixed(2) : 0,
      delivery_rate: sent > 0 ? ((eventCounts.delivered || 0) / sent * 100).toFixed(2) : 0
    }

    return trends

  } catch (error) {
    console.error('Error calculating engagement trends:', error)
    return null
  }
}

// Manual engagement scoring endpoint
export async function POST(request: NextRequest) {
  try {
    const { clientId, ownerUid } = await request.json()

    if (!clientId || !ownerUid) {
      return NextResponse.json({ error: 'Missing clientId or ownerUid' }, { status: 400 })
    }

    const supabase = createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Calculate score for specific client
    const score = await calculateEngagementScore(supabase, clientId, ownerUid, thirtyDaysAgo)

    // Update client record
    const { data, error } = await supabase
      .from('clients')
      .update({ engagement_score: score })
      .eq('id', clientId)
      .eq('owner_uid', ownerUid)
      .select('engagement_score')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clientId,
      engagement_score: score,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual engagement scoring error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
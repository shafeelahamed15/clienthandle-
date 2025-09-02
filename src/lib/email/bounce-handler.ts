import { createClient } from '@/lib/supabase'
import { emailTrackingService } from './tracking'

export type BounceType = 'hard' | 'soft' | 'complaint' | 'unsubscribe'

export interface BounceEvent {
  messageId: string
  ownerUid: string
  clientId: string
  bounceType: BounceType
  reason: string
  timestamp: string
  provider: string
  diagnosticCode?: string
}

export class BounceHandler {
  private supabase = createClient()

  async handleBounce(event: BounceEvent): Promise<void> {
    try {
      console.log(`📧 Processing ${event.bounceType} bounce for client ${event.clientId}`)

      // Record the bounce event
      await emailTrackingService.recordBounce({
        messageId: event.messageId,
        ownerUid: event.ownerUid,
        clientId: event.clientId,
        event: 'bounced',
        bounceReason: event.reason,
        eventData: {
          bounce_type: event.bounceType,
          timestamp: event.timestamp,
          provider: event.provider,
          diagnostic_code: event.diagnosticCode
        }
      })

      // Get current client bounce information
      const { data: client, error } = await this.supabase
        .from('clients')
        .select('bounce_count, last_bounce_at, followups_paused, unsubscribed')
        .eq('id', event.clientId)
        .eq('owner_uid', event.ownerUid)
        .single()

      if (error || !client) {
        console.error('Could not find client for bounce processing:', event.clientId)
        return
      }

      const currentBounceCount = client.bounce_count || 0
      const newBounceCount = currentBounceCount + 1

      // Handle different bounce types
      switch (event.bounceType) {
        case 'hard':
          await this.handleHardBounce(event, client, newBounceCount)
          break
          
        case 'soft':
          await this.handleSoftBounce(event, client, newBounceCount)
          break
          
        case 'complaint':
          await this.handleComplaint(event, client)
          break
          
        case 'unsubscribe':
          await this.handleUnsubscribe(event, client)
          break
      }

      console.log(`📧 Bounce processed: ${event.bounceType} bounce for client ${event.clientId}`)

    } catch (error) {
      console.error('Error processing bounce:', error)
    }
  }

  private async handleHardBounce(event: BounceEvent, client: any, bounceCount: number): Promise<void> {
    // Hard bounces are permanent delivery failures
    const updates: any = {
      bounce_count: bounceCount,
      last_bounce_at: event.timestamp
    }

    // Pause followups immediately after first hard bounce
    if (!client.followups_paused) {
      updates.followups_paused = true
      
      // Cancel all queued followups
      await this.supabase
        .from('followup_queue')
        .update({ status: 'cancelled' })
        .eq('client_id', event.clientId)
        .eq('owner_uid', event.ownerUid)
        .eq('status', 'queued')

      console.log(`🚫 Hard bounce: Paused followups for client ${event.clientId}`)
    }

    // Update client record
    await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', event.clientId)
      .eq('owner_uid', event.ownerUid)

    // Update engagement score (negative impact)
    await this.updateEngagementScore(event.clientId, event.ownerUid, -20)
  }

  private async handleSoftBounce(event: BounceEvent, client: any, bounceCount: number): Promise<void> {
    // Soft bounces are temporary delivery failures
    const updates: any = {
      bounce_count: bounceCount,
      last_bounce_at: event.timestamp
    }

    // Pause followups after 3 soft bounces
    if (bounceCount >= 3 && !client.followups_paused) {
      updates.followups_paused = true
      
      await this.supabase
        .from('followup_queue')
        .update({ status: 'cancelled' })
        .eq('client_id', event.clientId)
        .eq('owner_uid', event.ownerUid)
        .eq('status', 'queued')

      console.log(`🔄 Soft bounce limit reached: Paused followups for client ${event.clientId}`)
    }

    // Update client record
    await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', event.clientId)
      .eq('owner_uid', event.ownerUid)

    // Update engagement score (minor negative impact)
    await this.updateEngagementScore(event.clientId, event.ownerUid, -5)
  }

  private async handleComplaint(event: BounceEvent, client: any): Promise<void> {
    // Complaints (spam reports) are serious
    const updates: any = {
      bounce_count: (client.bounce_count || 0) + 1,
      last_bounce_at: event.timestamp,
      followups_paused: true
    }

    // Cancel all queued followups
    await this.supabase
      .from('followup_queue')
      .update({ status: 'cancelled' })
      .eq('client_id', event.clientId)
      .eq('owner_uid', event.ownerUid)
      .eq('status', 'queued')

    // Update client record
    await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', event.clientId)
      .eq('owner_uid', event.ownerUid)

    // Major negative impact on engagement score
    await this.updateEngagementScore(event.clientId, event.ownerUid, -30)

    console.log(`📢 Complaint received: All followups cancelled for client ${event.clientId}`)
  }

  private async handleUnsubscribe(event: BounceEvent, client: any): Promise<void> {
    // Mark as unsubscribed and cancel all followups
    await emailTrackingService.recordUnsubscribe({
      messageId: event.messageId,
      ownerUid: event.ownerUid,
      clientId: event.clientId,
      event: 'complained',
      eventData: {
        timestamp: event.timestamp,
        type: 'unsubscribe',
        source: 'bounce_handler'
      }
    })

    console.log(`✋ Unsubscribe processed for client ${event.clientId}`)
  }

  private async updateEngagementScore(clientId: string, ownerUid: string, change: number): Promise<void> {
    try {
      const { data: client, error } = await this.supabase
        .from('clients')
        .select('engagement_score')
        .eq('id', clientId)
        .eq('owner_uid', ownerUid)
        .single()

      if (!error && client) {
        const currentScore = client.engagement_score || 50
        const newScore = Math.max(0, Math.min(100, currentScore + change))
        
        await this.supabase
          .from('clients')
          .update({ engagement_score: newScore })
          .eq('id', clientId)
          .eq('owner_uid', ownerUid)

        console.log(`📊 Updated engagement score for client ${clientId}: ${currentScore} → ${newScore}`)
      }
    } catch (error) {
      console.error('Error updating engagement score:', error)
    }
  }

  // Get bounce statistics for a user
  async getBounceStats(ownerUid: string, days = 30): Promise<{
    totalBounces: number
    hardBounces: number
    softBounces: number
    complaints: number
    bounceRate: number
    affectedClients: number
  }> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data: analytics, error } = await this.supabase
        .from('email_analytics')
        .select('event_type, event_data, client_id')
        .eq('owner_uid', ownerUid)
        .eq('event_type', 'bounced')
        .gte('created_at', since.toISOString())

      if (error || !analytics) {
        return {
          totalBounces: 0,
          hardBounces: 0,
          softBounces: 0,
          complaints: 0,
          bounceRate: 0,
          affectedClients: 0
        }
      }

      const hardBounces = analytics.filter(a => 
        a.event_data && a.event_data.bounce_type === 'hard'
      ).length

      const softBounces = analytics.filter(a => 
        a.event_data && a.event_data.bounce_type === 'soft'
      ).length

      const complaints = analytics.filter(a => 
        a.event_data && a.event_data.bounce_type === 'complaint'
      ).length

      const affectedClients = new Set(analytics.map(a => a.client_id)).size

      // Get total sent emails for bounce rate calculation
      const { data: sentEmails, error: sentError } = await this.supabase
        .from('email_analytics')
        .select('id')
        .eq('owner_uid', ownerUid)
        .eq('event_type', 'sent')
        .gte('created_at', since.toISOString())

      const totalSent = sentEmails?.length || 0
      const bounceRate = totalSent > 0 ? (analytics.length / totalSent) * 100 : 0

      return {
        totalBounces: analytics.length,
        hardBounces,
        softBounces,
        complaints,
        bounceRate: Math.round(bounceRate * 100) / 100,
        affectedClients
      }

    } catch (error) {
      console.error('Error getting bounce stats:', error)
      return {
        totalBounces: 0,
        hardBounces: 0,
        softBounces: 0,
        complaints: 0,
        bounceRate: 0,
        affectedClients: 0
      }
    }
  }

  // Reactivate client after bounce (manual intervention)
  async reactivateClient(clientId: string, ownerUid: string): Promise<void> {
    try {
      await this.supabase
        .from('clients')
        .update({
          followups_paused: false,
          bounce_count: 0,
          engagement_score: 50 // Reset to neutral
        })
        .eq('id', clientId)
        .eq('owner_uid', ownerUid)

      console.log(`🔄 Reactivated client ${clientId} after bounce resolution`)
    } catch (error) {
      console.error('Error reactivating client:', error)
      throw error
    }
  }
}

export const bounceHandler = new BounceHandler()
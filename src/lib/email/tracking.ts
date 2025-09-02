import { createClient } from '@/lib/supabase'
import { emailAnalyticsService, EmailAnalytics } from '../db'

export type EmailEvent = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'

export interface EmailTrackingData {
  messageId: string
  ownerUid: string
  clientId: string
  scheduleId?: string
  event: EmailEvent
  eventData?: Record<string, any>
  userAgent?: string
  ipAddress?: string
}

// Email tracking service
export class EmailTrackingService {
  private supabase = createClient()

  async recordEvent(data: EmailTrackingData): Promise<void> {
    try {
      await emailAnalyticsService.create({
        owner_uid: data.ownerUid,
        message_id: data.messageId,
        schedule_id: data.scheduleId,
        client_id: data.clientId,
        event_type: data.event,
        event_data: data.eventData,
        user_agent: data.userAgent,
        ip_address: this.hashIP(data.ipAddress)
      })

      // Update message status based on event
      if (data.event === 'delivered') {
        await this.updateMessageStatus(data.messageId, 'sent', {
          tracking_data: { delivered: true, delivered_at: new Date().toISOString() }
        })
      }

      if (data.event === 'opened') {
        await this.updateMessageStatus(data.messageId, 'sent', {
          tracking_data: { opened: true, first_opened_at: new Date().toISOString() }
        })
      }

      console.log(`📊 Tracked email event: ${data.event} for message ${data.messageId}`)
    } catch (error) {
      console.error('Failed to record email tracking event:', error)
    }
  }

  async recordBounce(data: EmailTrackingData & { bounceReason?: string }): Promise<void> {
    try {
      await this.recordEvent({
        ...data,
        event: 'bounced',
        eventData: { reason: data.bounceReason }
      })

      // Update client bounce count
      const { data: client, error } = await this.supabase
        .from('clients')
        .select('bounce_count')
        .eq('id', data.clientId)
        .eq('owner_uid', data.ownerUid)
        .single()

      if (!error && client) {
        await this.supabase
          .from('clients')
          .update({
            bounce_count: (client.bounce_count || 0) + 1,
            last_bounce_at: new Date().toISOString()
          })
          .eq('id', data.clientId)
          .eq('owner_uid', data.ownerUid)

        // Auto-pause followups if bounce count is high
        if ((client.bounce_count || 0) >= 2) {
          await this.supabase
            .from('clients')
            .update({ followups_paused: true })
            .eq('id', data.clientId)
            .eq('owner_uid', data.ownerUid)

          console.log(`🚫 Auto-paused followups for client ${data.clientId} due to bounces`)
        }
      }
    } catch (error) {
      console.error('Failed to record bounce:', error)
    }
  }

  async recordReply(data: EmailTrackingData): Promise<void> {
    try {
      await this.recordEvent({
        ...data,
        event: 'clicked', // Use clicked as a proxy for reply
        eventData: { type: 'reply' }
      })

      // Update client last_reply_at
      await this.supabase
        .from('clients')
        .update({ last_reply_at: new Date().toISOString() })
        .eq('id', data.clientId)
        .eq('owner_uid', data.ownerUid)

      // Update message with reply detection
      await this.updateMessageStatus(data.messageId, 'sent', {
        reply_detected_at: new Date().toISOString()
      })

      console.log(`💬 Recorded reply for client ${data.clientId}`)
    } catch (error) {
      console.error('Failed to record reply:', error)
    }
  }

  async recordUnsubscribe(data: EmailTrackingData): Promise<void> {
    try {
      await this.recordEvent({
        ...data,
        event: 'complained', // Use complained as unsubscribe
        eventData: { type: 'unsubscribe' }
      })

      // Mark client as unsubscribed
      await this.supabase
        .from('clients')
        .update({ unsubscribed: true })
        .eq('id', data.clientId)
        .eq('owner_uid', data.ownerUid)

      // Cancel all future followups
      await this.supabase
        .from('followup_queue')
        .update({ status: 'cancelled' })
        .eq('client_id', data.clientId)
        .eq('owner_uid', data.ownerUid)
        .eq('status', 'queued')

      // Update message with unsubscribe
      await this.updateMessageStatus(data.messageId, 'sent', {
        unsubscribed_at: new Date().toISOString()
      })

      console.log(`✋ Client ${data.clientId} unsubscribed`)
    } catch (error) {
      console.error('Failed to record unsubscribe:', error)
    }
  }

  async getMessageAnalytics(messageId: string, ownerUid: string): Promise<EmailAnalytics[]> {
    return emailAnalyticsService.list(ownerUid, {
      filters: [{ column: 'message_id', operator: 'eq', value: messageId }],
      orderBy: { column: 'created_at', ascending: false }
    })
  }

  async getClientEngagementMetrics(clientId: string, ownerUid: string, days = 30): Promise<{
    emailsSent: number
    emailsOpened: number
    emailsClicked: number
    bounces: number
    openRate: number
    clickRate: number
    bounceRate: number
  }> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const analytics = await emailAnalyticsService.list(ownerUid, {
      filters: [
        { column: 'client_id', operator: 'eq', value: clientId },
        { column: 'created_at', operator: 'gte', value: since.toISOString() }
      ]
    })

    const emailsSent = analytics.filter(a => a.event_type === 'sent').length
    const emailsOpened = analytics.filter(a => a.event_type === 'opened').length
    const emailsClicked = analytics.filter(a => a.event_type === 'clicked').length
    const bounces = analytics.filter(a => a.event_type === 'bounced').length

    return {
      emailsSent,
      emailsOpened,
      emailsClicked,
      bounces,
      openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
      clickRate: emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0,
      bounceRate: emailsSent > 0 ? (bounces / emailsSent) * 100 : 0
    }
  }

  private async updateMessageStatus(
    messageId: string, 
    status: string, 
    additionalData: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          status,
          ...additionalData
        })
        .eq('id', messageId)

      if (error) {
        console.error('Failed to update message status:', error)
      }
    } catch (error) {
      console.error('Error updating message status:', error)
    }
  }

  private hashIP(ip?: string): string | undefined {
    if (!ip) return undefined
    
    // Simple hash for privacy (use a proper hash in production)
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  // Tracking pixel/webhook endpoint helpers
  generateTrackingPixel(messageId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${messageId}.gif`
  }

  generateClickTrackingUrl(messageId: string, originalUrl: string): string {
    const encodedUrl = encodeURIComponent(originalUrl)
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/click/${messageId}?url=${encodedUrl}`
  }

  generateUnsubscribeUrl(clientId: string, messageId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/track/unsubscribe/${clientId}/${messageId}`
  }
}

export const emailTrackingService = new EmailTrackingService()

// Utility functions for email templates
export function injectTrackingPixel(html: string, messageId: string): string {
  const trackingPixel = `<img src="${emailTrackingService.generateTrackingPixel(messageId)}" width="1" height="1" style="display:none" alt="">`
  
  // Try to inject before closing body tag, or append at the end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`)
  } else {
    return html + trackingPixel
  }
}

export function wrapLinksWithTracking(html: string, messageId: string): string {
  // Match all href attributes in anchor tags
  return html.replace(/href="([^"]+)"/g, (match, url) => {
    // Don't track unsubscribe links or tracking pixels
    if (url.includes('unsubscribe') || url.includes('track/') || url.includes('.gif')) {
      return match
    }
    
    const trackedUrl = emailTrackingService.generateClickTrackingUrl(messageId, url)
    return `href="${trackedUrl}"`
  })
}

// Enhanced template functions with tracking
export function enhanceEmailWithTracking(
  html: string,
  messageId: string,
  clientId: string,
  unsubscribeUrl?: string
): string {
  let enhancedHtml = html

  // Add tracking pixel
  enhancedHtml = injectTrackingPixel(enhancedHtml, messageId)

  // Wrap links with click tracking
  enhancedHtml = wrapLinksWithTracking(enhancedHtml, messageId)

  // Update unsubscribe link if provided
  if (unsubscribeUrl) {
    const actualUnsubscribeUrl = emailTrackingService.generateUnsubscribeUrl(clientId, messageId)
    enhancedHtml = enhancedHtml.replace(/href="#"/g, `href="${actualUnsubscribeUrl}"`)
  }

  return enhancedHtml
}
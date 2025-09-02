import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { emailService } from '@/lib/email/enhanced-service'
import { createEmailTemplate, createPlainTextEmail } from '@/lib/email'
import { emailTrackingService } from '@/lib/email/tracking'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job call
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting followup processing cron job...')
    
    const supabase = createClient()
    const now = new Date()
    
    // Get due followups from the queue
    const { data: dueFollowups, error: fetchError } = await supabase
      .from('followup_queue')
      .select(`
        *,
        clients!inner(name, email, company, owner_uid, last_reply_at, followups_paused, unsubscribed)
      `)
      .eq('status', 'queued')
      .lte('scheduled_at', now.toISOString())
      .limit(100) // Process max 100 followups at a time

    if (fetchError) {
      console.error('Failed to fetch due followups:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch followups' }, { status: 500 })
    }

    if (!dueFollowups || dueFollowups.length === 0) {
      console.log('📭 No due followups found')
      return NextResponse.json({ 
        success: true, 
        processed: 0,
        message: 'No due followups' 
      })
    }

    console.log(`📊 Found ${dueFollowups.length} due followups to process`)

    const results = []
    let processed = 0
    let skipped = 0
    let failed = 0

    for (const followup of dueFollowups) {
      try {
        const client = followup.clients

        // Skip if client is unsubscribed
        if (client.unsubscribed) {
          await supabase
            .from('followup_queue')
            .update({ status: 'cancelled' })
            .eq('id', followup.id)

          results.push({
            followupId: followup.id,
            status: 'cancelled',
            reason: 'Client unsubscribed'
          })
          skipped++
          continue
        }

        // Skip if followups are paused
        if (client.followups_paused) {
          await supabase
            .from('followup_queue')
            .update({ status: 'paused' })
            .eq('id', followup.id)

          results.push({
            followupId: followup.id,
            status: 'paused',
            reason: 'Client followups paused'
          })
          skipped++
          continue
        }

        // Check pause on reply condition
        if (followup.pause_on_reply && client.last_reply_at) {
          const replyDate = new Date(client.last_reply_at)
          const scheduledDate = new Date(followup.scheduled_at)
          
          if (replyDate > scheduledDate) {
            await supabase
              .from('followup_queue')
              .update({ status: 'paused' })
              .eq('id', followup.id)

            results.push({
              followupId: followup.id,
              status: 'paused',
              reason: 'Client replied after scheduling'
            })
            skipped++
            continue
          }
        }

        // Check cancellation: if invoice paid and cancel_if_paid = true
        if (followup.cancel_if_paid && followup.related_invoice_id) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('status')
            .eq('id', followup.related_invoice_id)
            .single()

          if (invoice?.status === 'paid') {
            await supabase
              .from('followup_queue')
              .update({ status: 'cancelled' })
              .eq('id', followup.id)

            results.push({
              followupId: followup.id,
              status: 'cancelled',
              reason: 'Invoice paid'
            })
            skipped++
            continue
          }
        }

        // Process the followup
        const emailResult = await sendFollowupEmail(followup, client)

        if (emailResult.success) {
          // Mark as sent and create message record
          await supabase
            .from('followup_queue')
            .update({ 
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', followup.id)

          // Create message record for tracking
          const messageData = await supabase
            .from('messages')
            .insert({
              owner_uid: client.owner_uid,
              client_id: followup.client_id,
              type: 'followup',
              tone: followup.tone,
              angle: followup.angle,
              channel: 'email',
              subject: followup.subject || `Follow-up: ${followup.angle}`,
              body: followup.body,
              redacted_body: followup.body,
              related_invoice_id: followup.related_invoice_id,
              sequence_id: followup.sequence_id,
              sequence_step: followup.sequence_step,
              tracking_data: { 
                resend_id: emailResult.messageId,
                sent_via_cron: true,
                scheduled_at: followup.scheduled_at
              },
              status: 'sent',
              sent_at: now.toISOString()
            })
            .select('id')
            .single()

          // Record tracking event if message was created
          if (messageData.data?.id) {
            await emailTrackingService.recordEvent({
              messageId: messageData.data.id,
              ownerUid: client.owner_uid,
              clientId: followup.client_id,
              event: 'sent',
              eventData: {
                timestamp: now.toISOString(),
                provider: emailResult.provider || 'unknown',
                via_cron: true,
                followup_angle: followup.angle
              }
            })
          }

          results.push({
            followupId: followup.id,
            status: 'sent',
            client: client.name,
            messageId: emailResult.messageId
          })
          processed++

        } else {
          // Handle retry logic
          const retryCount = (followup.retry_count || 0) + 1
          const maxRetries = followup.max_retries || 3

          if (retryCount <= maxRetries) {
            // Schedule for retry (exponential backoff)
            const retryDelay = Math.pow(2, retryCount) * 60 * 1000 // 2^n minutes
            const retryAt = new Date(Date.now() + retryDelay)

            await supabase
              .from('followup_queue')
              .update({
                retry_count: retryCount,
                error_message: emailResult.error,
                scheduled_at: retryAt.toISOString()
              })
              .eq('id', followup.id)

            results.push({
              followupId: followup.id,
              status: 'retry_scheduled',
              retryAt: retryAt.toISOString(),
              retryCount,
              error: emailResult.error
            })
          } else {
            // Mark as failed
            await supabase
              .from('followup_queue')
              .update({ 
                status: 'failed',
                error_message: emailResult.error
              })
              .eq('id', followup.id)

            results.push({
              followupId: followup.id,
              status: 'failed',
              error: emailResult.error,
              client: client.name
            })
            failed++
          }
        }

      } catch (error) {
        console.error(`Failed to process followup ${followup.id}:`, error)
        results.push({
          followupId: followup.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    console.log(`✅ Cron job completed: ${processed} sent, ${skipped} skipped, ${failed} failed`)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      total_found: dueFollowups.length,
      processed,
      skipped,
      failed,
      results
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Send followup email
async function sendFollowupEmail(followup: any, client: any): Promise<{
  success: boolean
  messageId?: string
  provider?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending followup: ${followup.angle} to ${client.email}`)

    // Create email templates
    const htmlContent = createEmailTemplate({
      content: followup.body,
      clientName: client.name,
      senderName: 'ClientHandle User', // Would come from user profile
      brandColor: '#0A84FF',
      includeUnsubscribe: true
    })

    const textContent = createPlainTextEmail({
      content: followup.body,
      senderName: 'ClientHandle User'
    })

    // Send via enhanced email service
    const result = await emailService.sendEmail({
      to: client.email,
      subject: followup.subject || `Follow-up: ${followup.angle}`,
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    }, client.owner_uid)

    if (result.success) {
      console.log(`✅ Followup sent to ${client.email}`)
      return {
        success: true,
        messageId: result.messageId,
        provider: result.provider
      }
    } else {
      console.error(`❌ Failed to send followup to ${client.email}: ${result.error}`)
      return {
        success: false,
        error: result.error
      }
    }

  } catch (error) {
    console.error('Error sending followup email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Health check endpoint
export async function POST() {
  return NextResponse.json({
    service: 'followup-processor',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}
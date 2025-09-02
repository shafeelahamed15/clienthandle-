import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { sendEmail, createEmailTemplate, createPlainTextEmail, createPDFAttachment, isEmailServiceConfigured } from '@/lib/email'
import { generateInvoicePDFBuffer, type InvoiceData } from '@/lib/pdf'

interface SchedulePattern {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  timeOfDay: string;
  daysOfWeek?: number[];
  endAfter?: number;
}

interface EmailSchedule {
  id: string;
  email_subject: string;
  email_body: string;
  schedule_pattern: SchedulePattern;
  clients: {
    email: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a scheduled job call (you'd use a secret token in production)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    const now = new Date()

    // Get all scheduled emails that are due to be sent
    const { data: dueEmails, error: fetchError } = await supabase
      .from('email_schedules')
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .eq('status', 'scheduled')
      .lte('next_run_at', now.toISOString())
      .limit(50) // Process max 50 emails at a time

    if (fetchError) {
      console.error('Failed to fetch due emails:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    // Also get due followups from the followup_queue
    const { data: dueFollowups, error: followupError } = await supabase
      .from('followup_queue')
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .eq('status', 'queued')
      .lte('scheduled_at', now.toISOString())
      .limit(50) // Process max 50 followups at a time

    if (followupError) {
      console.error('Failed to fetch due followups:', followupError)
    }

    const results = []

    // Process scheduled emails
    for (const schedule of dueEmails || []) {
      try {
        // In a real implementation, you'd send the email here
        // For now, we'll simulate sending and update the message status
        
        const emailSent = await sendScheduledEmail(schedule)
        
        if (emailSent) {
          // Update the schedule for next run or mark as completed
          const nextRun = calculateNextRun(schedule.recurring_pattern, schedule.timezone)
          const hasReachedLimit = schedule.max_sends && schedule.send_count >= schedule.max_sends - 1

          if (nextRun && !hasReachedLimit) {
            // Update for next occurrence
            await supabase
              .from('email_schedules')
              .update({
                next_run_at: nextRun.toISOString(),
                last_sent_at: now.toISOString(),
                send_count: (schedule.send_count || 0) + 1
              })
              .eq('id', schedule.id)
          } else {
            // Mark as completed
            await supabase
              .from('email_schedules')
              .update({
                status: 'completed',
                last_sent_at: now.toISOString(),
                send_count: (schedule.send_count || 0) + 1
              })
              .eq('id', schedule.id)
          }

          // Create a message record for tracking
          await supabase
            .from('messages')
            .insert({
              owner_uid: schedule.owner_uid,
              client_id: schedule.client_id,
              type: 'followup',
              tone: schedule.variables?.tone || 'professional',
              channel: 'email',
              subject: schedule.email_subject,
              body: schedule.email_body,
              redacted_body: schedule.email_body, // Would need proper PII redaction
              status: 'sent',
              sent_at: now.toISOString(),
              sequence_id: schedule.id
            })

          results.push({ 
            scheduleId: schedule.id, 
            status: 'sent', 
            client: schedule.clients.name,
            nextRun: nextRun?.toISOString() || 'completed'
          })
        } else {
          // Mark as failed
          await supabase
            .from('email_schedules')
            .update({ status: 'failed' })
            .eq('id', schedule.id)

          results.push({ 
            scheduleId: schedule.id, 
            status: 'failed', 
            client: schedule.clients.name 
          })
        }

      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error)
        results.push({ 
          scheduleId: schedule.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Process followup queue
    for (const followup of dueFollowups || []) {
      try {
        // Check pause conditions: if client replied and pause_on_reply = true
        if (followup.pause_on_reply) {
          const { data: client } = await supabase
            .from('clients')
            .select('last_reply_at')
            .eq('id', followup.client_id)
            .single();

          if (client?.last_reply_at) {
            const replyDate = new Date(client.last_reply_at);
            const scheduledDate = new Date(followup.scheduled_at);
            
            // If client replied after this followup was scheduled, pause it
            if (replyDate > scheduledDate) {
              await supabase
                .from('followup_queue')
                .update({ status: 'paused' })
                .eq('id', followup.id);

              results.push({
                followupId: followup.id,
                status: 'paused',
                reason: 'Client replied'
              });
              continue;
            }
          }
        }

        // Check cancellation: if invoice paid and cancel_if_paid = true
        if (followup.cancel_if_paid && followup.related_invoice_id) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('status')
            .eq('id', followup.related_invoice_id)
            .single();

          if (invoice?.status === 'paid') {
            await supabase
              .from('followup_queue')
              .update({ status: 'cancelled' })
              .eq('id', followup.id);

            results.push({
              followupId: followup.id,
              status: 'cancelled',
              reason: 'Invoice paid'
            });
            continue;
          }
        }

        // Send the followup email
        const emailSent = await sendFollowupEmail(followup);

        if (emailSent) {
          // Mark as sent
          await supabase
            .from('followup_queue')
            .update({ 
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', followup.id);

          // Create message record for tracking
          await supabase
            .from('messages')
            .insert({
              owner_uid: followup.owner_uid,
              client_id: followup.client_id,
              type: 'followup',
              tone: followup.tone,
              channel: 'email',
              subject: followup.subject || `Follow-up: ${followup.angle}`,
              body: followup.body,
              redacted_body: followup.body,
              related_invoice_id: followup.related_invoice_id,
              status: 'sent',
              sent_at: now.toISOString()
            });

          results.push({
            followupId: followup.id,
            status: 'sent',
            client: followup.clients.name
          });
        } else {
          // Mark as failed
          await supabase
            .from('followup_queue')
            .update({ status: 'failed' })
            .eq('id', followup.id);

          results.push({
            followupId: followup.id,
            status: 'failed',
            client: followup.clients.name
          });
        }

      } catch (error) {
        console.error(`Failed to process followup ${followup.id}:`, error);
        results.push({
          followupId: followup.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      scheduledEmails: dueEmails?.length || 0,
      followups: dueFollowups?.length || 0,
      results
    })

  } catch (error) {
    console.error('Scheduled email processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process scheduled emails' },
      { status: 500 }
    )
  }
}

// Send followup email from queue
interface FollowupItem {
  id: string;
  body: string;
  subject?: string;
  clients: {
    name: string;
    email: string;
  };
}

async function sendFollowupEmail(followup: FollowupItem): Promise<boolean> {
  try {
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      console.log(`📧 [SIMULATED] Followup email not sent - service not configured`)
      console.log(`To: ${followup.clients.email}`)
      console.log(`Subject: ${followup.subject || 'Follow-up'}`)
      console.log(`Body: ${followup.body.substring(0, 100)}...`)
      // Simulate 95% success rate for development
      return Math.random() > 0.05
    }

    // Get variables for personalization
    const clientName = followup.clients.name
    const senderName = 'ClientHandle User' // Would come from user profile
    const brandColor = '#0A84FF'

    // Create email templates
    const htmlContent = createEmailTemplate({
      content: followup.body,
      clientName,
      senderName,
      brandColor,
      includeUnsubscribe: true
    })

    const textContent = createPlainTextEmail({
      content: followup.body,
      senderName
    })

    // Send email using the configured service
    const emailResult = await sendEmail({
      to: followup.clients.email,
      subject: followup.subject || `Follow-up from ${senderName}`,
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    })

    if (emailResult.success) {
      console.log(`✅ Followup sent to ${followup.clients.email}`)
      console.log(`📧 Message ID: ${emailResult.messageId}`)
      return true
    } else {
      console.error(`❌ Failed to send followup to ${followup.clients.email}: ${emailResult.error}`)
      return false
    }

  } catch (error) {
    console.error('Error sending followup email:', error)
    return false
  }
}

// Simulate sending an email (replace with actual email service)
async function sendScheduledEmail(schedule: EmailSchedule): Promise<boolean> {
  try {
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      console.log(`📧 [SIMULATED] Email service not configured - simulating send to ${schedule.clients.email}`)
      console.log(`Subject: ${schedule.email_subject}`)
      console.log(`Body: ${schedule.email_body.substring(0, 100)}...`)
      // Simulate 95% success rate for development
      return Math.random() > 0.05
    }

    // Get variables from schedule for personalization
    const variables = schedule.variables || {}
    const senderName = variables.senderName || 'ClientHandle User'
    const brandColor = variables.brandColor || '#0A84FF'
    const clientName = variables.clientName || 'Valued Client'

    // Create email templates
    const htmlContent = createEmailTemplate({
      content: schedule.email_body,
      clientName,
      senderName,
      brandColor,
      includeUnsubscribe: true
    })

    const textContent = createPlainTextEmail({
      content: schedule.email_body,
      senderName
    })

    // Prepare attachments if invoice PDF is required
    const attachments = []
    if (variables.attachInvoicePDF && variables.invoiceId) {
      // This would need additional logic to fetch invoice data and generate PDF
      // For now, we'll skip PDF attachment in scheduled emails
      console.log('📎 PDF attachment requested but not implemented for scheduled emails yet')
    }

    // Send email using Resend
    const emailResult = await sendEmail({
      to: schedule.clients.email,
      subject: schedule.email_subject,
      text: textContent,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    })

    if (emailResult.success) {
      console.log(`✅ Email sent successfully to ${schedule.clients.email} via Resend`)
      console.log(`📧 Message ID: ${emailResult.messageId}`)
      return true
    } else {
      console.error(`❌ Failed to send email to ${schedule.clients.email}: ${emailResult.error}`)
      return false
    }

  } catch (error) {
    console.error('Error sending scheduled email:', error)
    return false
  }
}

// Calculate next run time for recurring emails
function calculateNextRun(pattern: SchedulePattern, _timezone: string): Date | null {
  if (!pattern || pattern.type === 'once') return null
  
  const now = new Date()
  const [hours, minutes] = pattern.timeOfDay.split(':').map(Number)
  
  const nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)
  
  switch (pattern.type) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + pattern.interval)
      break
      
    case 'weekly':
      // Find next occurrence of selected days
      const currentDay = nextRun.getDay()
      const daysOfWeek = pattern.daysOfWeek || [currentDay]
      let daysToAdd = pattern.interval * 7
      
      // Find the next day in the current week cycle
      for (let i = 1; i <= 7; i++) {
        const testDay = (currentDay + i) % 7
        if (daysOfWeek.includes(testDay)) {
          daysToAdd = i
          break
        }
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd)
      break
      
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + pattern.interval)
      break
      
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1)
      break
      
    default:
      return null
  }
  
  // Make sure next run is in the future
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1)
  }
  
  return nextRun
}
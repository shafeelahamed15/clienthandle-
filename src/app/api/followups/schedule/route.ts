import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RecurrencePattern {
  type: string;
  timeOfDay: string;
  [key: string]: unknown;
}

// Helper function to calculate first send time for recurring schedules
function calculateFirstSendTime(pattern: RecurrencePattern): Date {
  const now = new Date();
  const [hours, minutes] = (pattern.timeOfDay as string).split(':').map(Number);
  
  const firstSend = new Date();
  firstSend.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, schedule for next occurrence
  if (firstSend <= now) {
    switch (pattern.type as string) {
      case 'daily':
        firstSend.setDate(firstSend.getDate() + (pattern.interval as number));
        break;
      case 'weekly':
        firstSend.setDate(firstSend.getDate() + (7 * (pattern.interval as number)));
        break;
      case 'monthly':
        firstSend.setMonth(firstSend.getMonth() + (pattern.interval as number));
        break;
      default:
        firstSend.setDate(firstSend.getDate() + 1);
    }
  }
  
  return firstSend;
}

const schema = z.object({
  clientId: z.string().uuid(),
  relatedInvoiceId: z.string().uuid().optional(),
  sequenceId: z.string().uuid().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(5, 'Message body is required'),
  tone: z.enum([
    'friendly', 
    'professional', 
    'firm', 
    'gentle',
    'urgent',
    'casual',
    'helpful_service',
    'assertive'
  ]).default('professional'),
  scheduleType: z.enum(['immediate', 'custom', 'recurring']).default('custom'),
  scheduledAt: z.string().optional(),
  recurrencePattern: z.object({
    type: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1),
    timeUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
    endAfter: z.number().optional(),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  pauseOnReply: z.boolean().default(true),
  cancelIfPaid: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'string') return val === 'true' || val === '1' || val !== '';
    return val;
  }).default(true),
  maxSends: z.number().min(1).max(10).optional()
});

export async function POST(req: NextRequest) {
  try {
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const json = await req.json();
    console.log('🔍 Received request body:', JSON.stringify(json, null, 2));
    
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Validation failed:', JSON.stringify(parsed.error.errors, null, 2));
      return NextResponse.json({ 
        error: 'invalid_body',
        details: parsed.error.errors,
        received: json
      }, { status: 400 });
    }

    // Handle different schedule types
    let scheduledTime: Date | null = null;
    
    switch (parsed.data.scheduleType) {
      case 'immediate':
        // Send immediately
        scheduledTime = null;
        break;
      
      case 'custom':
        if (parsed.data.scheduledAt) {
          scheduledTime = new Date(parsed.data.scheduledAt);
          if (isNaN(scheduledTime.getTime())) {
            return NextResponse.json({ error: 'Invalid scheduled date' }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: 'Scheduled date required for custom scheduling' }, { status: 400 });
        }
        break;
      
      case 'recurring':
        if (!parsed.data.recurrencePattern) {
          return NextResponse.json({ error: 'Recurrence pattern required for recurring scheduling' }, { status: 400 });
        }
        // For recurring, calculate first send time
        scheduledTime = calculateFirstSendTime(parsed.data.recurrencePattern);
        break;
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', parsed.data.clientId)
      .eq('owner_uid', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
    }

    // Verify invoice ownership if provided
    if (parsed.data.relatedInvoiceId) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', parsed.data.relatedInvoiceId)
        .eq('owner_uid', user.id)
        .single();

      if (invoiceError || !invoice) {
        return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
      }
    }

    // Map tone to valid database enum values
    const toneMapping = {
      'helpful_service': 'professional',
      'friendly': 'friendly', 
      'professional': 'professional',
      'firm': 'firm'
    };
    const dbTone = toneMapping[parsed.data.tone as keyof typeof toneMapping] || 'professional';

    // Choose appropriate table based on complexity
    let data, error;
    
    if (parsed.data.scheduleType === 'recurring' && parsed.data.recurrencePattern) {
      // Use email_schedules table for recurring messages
      const result = await supabase
        .from('email_schedules')
        .insert({
          owner_uid: user.id,
          client_id: parsed.data.clientId,
          name: `${parsed.data.subject} - Recurring Follow-up`,
          scheduled_at: scheduledTime?.toISOString(),
          email_subject: parsed.data.subject,
          email_body: parsed.data.body,
          status: 'scheduled',
          recurring_pattern: {
            type: parsed.data.recurrencePattern.type,
            interval: parsed.data.recurrencePattern.interval,
            timeOfDay: parsed.data.recurrencePattern.timeOfDay,
            endAfter: parsed.data.recurrencePattern.endAfter,
            endDate: parsed.data.recurrencePattern.endDate,
            daysOfWeek: parsed.data.recurrencePattern.daysOfWeek
          },
          variables: {
            tone: parsed.data.tone,
            relatedInvoiceId: parsed.data.relatedInvoiceId,
            pauseOnReply: parsed.data.pauseOnReply,
            cancelIfPaid: parsed.data.cancelIfPaid,
            maxSends: parsed.data.maxSends
          }
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Use messages table for simple scheduling
      const result = await supabase
        .from('messages')
        .insert({
          owner_uid: user.id,
          client_id: parsed.data.clientId,
          related_invoice_id: parsed.data.relatedInvoiceId || null,
          type: 'followup',
          tone: dbTone,
          channel: 'email',
          body: parsed.data.body,
          redacted_body: parsed.data.body,
          scheduled_at: scheduledTime?.toISOString(),
          status: parsed.data.scheduleType === 'immediate' ? 'queued' : 'draft',
          sequence_id: parsed.data.sequenceId || null
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Database insert error:', error);
      return NextResponse.json({ 
        error: 'db_insert_failed', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }
    
    console.log('✅ Successfully inserted message:', data.id);

    // If immediate, try to send the email right away
    if (parsed.data.scheduleType === 'immediate') {
      try {
        console.log('📧 Attempting to send immediate follow-up...');
        
        // Get client email
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('name, email')
          .eq('id', parsed.data.clientId)
          .eq('owner_uid', user.id)
          .single();

        if (client?.email) {
          // Import email service and send directly
          const { sendEmail, createEmailTemplate, createPlainTextEmail } = await import('@/lib/email');
          
          // Get user profile for sender info
          const { data: userProfile } = await supabase
            .from('users')
            .select('display_name, business_name, email, brand_accent_color')
            .eq('id', user.id)
            .single();

          const senderName = userProfile?.display_name || 'ClientHandle User';
          const businessName = userProfile?.business_name || userProfile?.display_name || 'ClientHandle User';
          const brandColor = userProfile?.brand_accent_color || '#0A84FF';

          // Replace template variables in the message body
          const processedBody = parsed.data.body
            .replace(/\{\{COMPANY_NAME\}\}/g, businessName)
            .replace(/\{\{YOUR_NAME\}\}/g, senderName)
            .replace(/\{\{CLIENT_NAME\}\}/g, client.name);

          // Create email templates using processed body
          const htmlContent = createEmailTemplate({
            content: processedBody,
            clientName: client.name,
            senderName,
            businessName,
            brandColor,
            includeUnsubscribe: true
          });

          const textContent = createPlainTextEmail({
            content: processedBody,
            senderName,
            businessName
          });

          // Send email using Resend
          const emailResult = await sendEmail({
            to: client.email,
            from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
            subject: parsed.data.subject,
            text: textContent,
            html: htmlContent,
            trackingSettings: {
              clickTracking: true,
              openTracking: true,
            }
          }, user.id);

          if (emailResult.success) {
            console.log('✅ Immediate follow-up sent successfully via email service');
            console.log('📧 Message ID:', emailResult.messageId);
            
            // Update message status to 'sent'
            await supabase
              .from('messages')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', data.id)
              .eq('owner_uid', user.id);

            return NextResponse.json({ 
              success: true,
              id: data.id,
              scheduleType: parsed.data.scheduleType,
              scheduledAt: scheduledTime?.toISOString(),
              action: 'sent_immediately',
              emailSent: true,
              emailMessageId: emailResult.messageId,
              sentTo: client.email,
              message: 'Follow-up sent immediately to client'
            });
          } else {
            console.error('❌ Failed to send immediate follow-up:', emailResult.error);
          }
        } else {
          console.error('❌ Client email not found for immediate sending');
        }
      } catch (sendError) {
        console.error('❌ Error sending immediate follow-up:', sendError);
      }
    }

    return NextResponse.json({ 
      success: true,
      id: data.id,
      scheduleType: parsed.data.scheduleType,
      scheduledAt: scheduledTime?.toISOString(),
      action: parsed.data.scheduleType === 'immediate' ? 'queued_for_send' : 'scheduled',
      isRecurring: parsed.data.scheduleType === 'recurring',
      message: parsed.data.scheduleType === 'immediate' 
        ? 'Follow-up queued for immediate sending'
        : parsed.data.scheduleType === 'recurring'
        ? `Recurring follow-up scheduled starting ${scheduledTime?.toLocaleDateString()}`
        : `Follow-up scheduled for ${scheduledTime?.toLocaleDateString()}`
    });

  } catch (error) {
    console.error('Followup schedule API error:', error);
    return NextResponse.json({
      error: 'Failed to schedule followup'
    }, { status: 500 });
  }
}
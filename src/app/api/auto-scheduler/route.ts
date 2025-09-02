import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendEmail, createEmailTemplate, createPlainTextEmail, createPDFAttachment, isEmailServiceConfigured } from '@/lib/email';
import { generateFollowup, type MessageContext, type Tone, type MessageType } from '@/lib/ai';
import { generateInvoicePDFBuffer, type InvoiceData } from '@/lib/pdf';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔄 Enhanced auto-scheduler running...');
    
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Process both regular messages and recurring campaigns
    const [messagesResult, campaignsResult] = await Promise.all([
      processScheduledMessages(supabase, now),
      processRecurringCampaigns(supabase, now)
    ]);

    const totalSuccess = messagesResult.successCount + campaignsResult.successCount;
    const totalErrors = messagesResult.errorCount + campaignsResult.errorCount;
    const totalProcessed = messagesResult.processed + campaignsResult.processed;

    console.log(`🎯 Enhanced scheduler complete: ${totalSuccess} sent, ${totalErrors} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} items`,
      successCount: totalSuccess,
      errorCount: totalErrors,
      results: [...messagesResult.results, ...campaignsResult.results]
    });

  } catch (error) {
    console.error('❌ Enhanced auto-scheduler error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Enhanced auto-scheduler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Process regular one-time scheduled messages
async function processScheduledMessages(supabase: any, now: string) {
  console.log('📧 Processing scheduled messages...');
  
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      id, subject, body, tone, scheduled_at, owner_uid, related_invoice_id,
      clients!inner(name, email),
      invoices(id, number, amount_cents, currency, status, due_date, line_items)
    `)
    .eq('status', 'draft')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now)
    .limit(10);

  if (messagesError) {
    console.error('❌ Messages database error:', messagesError);
    return { successCount: 0, errorCount: 0, processed: 0, results: [] };
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No scheduled messages to send');
    return { successCount: 0, errorCount: 0, processed: 0, results: [] };
  }

  console.log(`📧 Found ${messages.length} scheduled messages to send`);

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  // Process each scheduled message
  for (const message of messages) {
    try {
      const result = await sendEmailMessage(supabase, message, 'scheduled');
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      results.push(result);
    } catch (error) {
      errorCount++;
      results.push({
        messageId: message.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { successCount, errorCount, processed: messages.length, results };
}

// Process recurring campaigns that generate fresh AI content
async function processRecurringCampaigns(supabase: any, now: string) {
  console.log('🤖 Processing recurring campaigns...');
  
  const { data: campaigns, error: campaignsError } = await supabase
    .from('email_schedules')
    .select(`
      id, name, owner_uid, client_id, send_count, max_sends, recurring_pattern,
      clients!inner(id, name, email, notes)
    `)
    .eq('status', 'scheduled')
    .not('recurring_pattern', 'is', null)
    .not('next_run_at', 'is', null)
    .lte('next_run_at', now)
    .limit(5);

  if (campaignsError) {
    console.error('❌ Campaigns database error:', campaignsError);
    return { successCount: 0, errorCount: 0, processed: 0, results: [] };
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('✅ No recurring campaigns to process');
    return { successCount: 0, errorCount: 0, processed: 0, results: [] };
  }

  console.log(`🤖 Found ${campaigns.length} recurring campaigns to process`);

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const campaign of campaigns) {
    try {
      // Check if campaign has reached max sends
      if (campaign.max_sends && campaign.send_count >= campaign.max_sends) {
        console.log(`📊 Campaign ${campaign.id} reached max sends (${campaign.max_sends})`);
        
        // Mark as completed
        await supabase
          .from('email_schedules')
          .update({ status: 'completed' })
          .eq('id', campaign.id);
        
        continue;
      }

      // Generate fresh AI content for this campaign
      const aiContent = await generateCampaignMessage(supabase, campaign);
      
      if (!aiContent) {
        console.error(`❌ Failed to generate AI content for campaign ${campaign.id}`);
        errorCount++;
        continue;
      }

      // Create message object for sending
      const messageForSending = {
        id: campaign.id,
        subject: aiContent.subject,
        body: aiContent.message,
        tone: campaign.recurring_pattern?.tone || 'professional',
        owner_uid: campaign.owner_uid,
        clients: campaign.clients
      };

      // Send the email
      const result = await sendEmailMessage(supabase, messageForSending, 'campaign');
      
      if (result.success) {
        // Update campaign: increment send_count and calculate next_run_at
        const nextRun = calculateNextRun(campaign.recurring_pattern);
        
        await supabase
          .from('email_schedules')
          .update({
            send_count: campaign.send_count + 1,
            next_run_at: nextRun.toISOString(),
            last_sent_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        // Save the generated message to messages table for history
        await supabase
          .from('messages')
          .insert({
            owner_uid: campaign.owner_uid,
            client_id: campaign.client_id,
            type: 'followup',
            tone: campaign.recurring_pattern?.tone || 'professional',
            channel: 'email',
            subject: aiContent.subject,
            body: aiContent.message,
            status: 'sent',
            sent_at: new Date().toISOString(),
            sequence_id: campaign.id
          });

        successCount++;
        console.log(`✅ Campaign ${campaign.id} sent successfully, next run: ${nextRun.toISOString()}`);
      } else {
        errorCount++;
        console.error(`❌ Failed to send campaign ${campaign.id}`);
      }

      results.push(result);

    } catch (error) {
      errorCount++;
      results.push({
        campaignId: campaign.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Error processing campaign ${campaign.id}:`, error);
    }
  }

  return { successCount, errorCount, processed: campaigns.length, results };
}

// Generate AI content for a campaign with creative variation
async function generateCampaignMessage(supabase: any, campaign: any) {
  try {
    const client = campaign.clients;
    const pattern = campaign.recurring_pattern;
    
    // Get user's enhanced business profile for intelligent AI context
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name, business_name, service_description, business_details, target_clients, value_proposition, communication_style')
      .eq('id', campaign.owner_uid)
      .single();
    
    // Get recent messages for this campaign to ensure variety
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('body, subject, created_at')
      .eq('client_id', campaign.client_id)
      .eq('sequence_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Build enhanced context with variation instructions
    const context: MessageContext = {
      clientName: client.name,
      customContext: pattern?.clientContext || client.notes || 'Professional follow-up',
      variationContext: recentMessages?.length > 0 
        ? `Previous messages sent: ${recentMessages.map(m => m.subject || m.body.substring(0, 50)).join('; ')}. Please create something completely different.`
        : 'This is the first message in the campaign.',
      campaignCount: campaign.send_count + 1,
      businessProfile: {
        business_name: userProfile?.business_name,
        what_you_do: userProfile?.service_description || 'Professional service provider',
        business_details: userProfile?.business_details,
        target_clients: userProfile?.target_clients,
        value_proposition: userProfile?.value_proposition,
        communication_style: userProfile?.communication_style
      }
    };

    // Generate varied AI content
    const result = await generateFollowup(
      'followup' as MessageType,
      (pattern?.tone || 'professional') as Tone,
      context
    );

    return result;

  } catch (error) {
    console.error('AI generation error for campaign:', error);
    return null;
  }
}

// Calculate next run time based on campaign pattern
function calculateNextRun(pattern: any) {
  const now = new Date();
  const [hours, minutes] = (pattern?.timeOfDay || '09:00').split(':').map(Number);
  const interval = pattern?.interval || 1;
  
  const nextRun = new Date(now);
  
  switch (pattern?.frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + interval);
      break;
    case 'weekly':
      nextRun.setDate(now.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + interval);
      break;
    default:
      nextRun.setDate(now.getDate() + 7); // Default to weekly
  }
  
  nextRun.setHours(hours, minutes, 0, 0);
  return nextRun;
}

// Unified email sending function
async function sendEmailMessage(supabase: any, message: any, type: 'scheduled' | 'campaign') {
  try {
    console.log(`📮 Sending ${type} message ${message.id} to ${message.clients?.email}`);
    
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      console.log('📧 Email service not configured, skipping...');
      return {
        messageId: message.id,
        status: 'skipped',
        error: 'Email service not configured'
      };
    }

    // Fetch user's business profile for personalized branding
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name, business_name, email, brand_accent_color')
      .eq('id', message.owner_uid)
      .single();

    const clientName = message.clients?.name || 'Valued Client';
    const businessName = userProfile?.business_name || userProfile?.display_name || 'ClientHandle User';
    const subject = message.subject || `Follow-up from ${businessName}`;
    
    const htmlContent = createEmailTemplate({
      content: message.body,
      clientName: clientName,
      senderName: userProfile?.display_name || 'ClientHandle User',
      businessName: businessName,
      brandColor: userProfile?.brand_accent_color || '#0A84FF',
      includeUnsubscribe: true
    });

    const textContent = createPlainTextEmail({
      content: message.body,
      senderName: userProfile?.display_name || 'ClientHandle User',
      businessName: businessName
    });

    // Prepare attachments array
    const attachments = [];

    // If there's a related invoice, generate and attach PDF
    if (message.related_invoice_id && message.invoices) {
      try {
        console.log(`📎 Adding invoice PDF attachment for invoice ${message.invoices.id}`);
        
        // Prepare invoice data for PDF generation
        const invoiceData: InvoiceData = {
          id: message.invoices.id,
          number: message.invoices.number,
          amount: message.invoices.amount_cents / 100, // Convert from cents
          currency: message.invoices.currency,
          status: message.invoices.status,
          dueDate: new Date(message.invoices.due_date),
          lineItems: message.invoices.line_items || [],
          client: {
            name: message.clients.name,
            email: message.clients.email,
            company: message.clients.company || ''
          }
        };

        // Generate PDF buffer
        const pdfBuffer = await generateInvoicePDFBuffer(invoiceData);
        
        // Create PDF attachment
        const pdfAttachment = createPDFAttachment(
          pdfBuffer,
          `Invoice-${message.invoices.number}-${message.clients.name.replace(/\s+/g, '-')}.pdf`
        );
        
        attachments.push(pdfAttachment);
        console.log(`✅ PDF attachment created for invoice ${message.invoices.number}`);
        
      } catch (pdfError) {
        console.error('❌ Failed to generate PDF attachment:', pdfError);
        // Continue without PDF attachment rather than failing the email
      }
    }

    // Send email with or without attachments
    const emailResult = await sendEmail({
      to: message.clients?.email,
      subject: subject,
      text: textContent,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    });

    if (emailResult.success) {
      // For scheduled messages, mark as sent
      if (type === 'scheduled') {
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);
      }

      console.log(`✅ ${type} message ${message.id} sent successfully`);
      return {
        messageId: message.id,
        status: 'success',
        emailId: emailResult.messageId,
        success: true
      };
    } else {
      console.error(`❌ Failed to send ${type} message ${message.id}:`, emailResult.error);
      return {
        messageId: message.id,
        status: 'error',
        error: emailResult.error,
        success: false
      };
    }

  } catch (error) {
    console.error(`❌ Error sending ${type} message ${message.id}:`, error);
    return {
      messageId: message.id,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
}
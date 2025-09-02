import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendEmail, createEmailTemplate, createPlainTextEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job call
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting scheduled messages processing cron job...');
    
    const supabase = createClient();
    const now = new Date();
    
    // Get scheduled messages that are due to be sent
    const { data: dueMessages, error: fetchError } = await supabase
      .from('messages')
      .select(`
        *,
        clients!inner(name, email, company),
        users!inner(display_name, business_name, email, brand_accent_color)
      `)
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString())
      .limit(50); // Process max 50 messages at a time

    if (fetchError) {
      console.error('❌ Failed to fetch due messages:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    if (!dueMessages || dueMessages.length === 0) {
      console.log('📭 No due scheduled messages found');
      return NextResponse.json({ 
        success: true, 
        processed: 0,
        message: 'No due scheduled messages' 
      });
    }

    console.log(`📊 Found ${dueMessages.length} due scheduled messages to process`);

    const results = [];
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const message of dueMessages) {
      try {
        const client = message.clients;
        const user = message.users;

        // Skip if client doesn't have email
        if (!client.email) {
          console.log(`⚠️ Skipping message ${message.id} - client has no email`);
          skipped++;
          continue;
        }

        console.log(`📧 Processing message ${message.id} for client ${client.name} (${client.email})`);

        // Prepare email content
        const senderName = user.display_name || 'ClientHandle User';
        const businessName = user.business_name || user.display_name || 'ClientHandle User';
        const brandColor = user.brand_accent_color || '#0A84FF';

        // Replace template variables in the message body
        const processedBody = message.body
          .replace(/\{\{COMPANY_NAME\}\}/g, businessName)
          .replace(/\{\{YOUR_NAME\}\}/g, senderName)
          .replace(/\{\{CLIENT_NAME\}\}/g, client.name);

        // Create email templates
        const htmlContent = createEmailTemplate({
          content: processedBody,
          clientName: client.name,
          senderName,
          businessName,
          brandColor,
          includeUnsubscribe: true,
          messageId: message.id,
          clientId: message.client_id
        });

        const textContent = createPlainTextEmail({
          content: processedBody,
          senderName,
          businessName
        });

        // Send the email
        const emailResult = await sendEmail({
          to: client.email,
          subject: message.subject || 'Follow-up from ClientHandle',
          html: htmlContent,
          text: textContent,
          from: user.email || 'noreply@clienthandle.com',
          fromName: senderName,
          replyTo: user.email,
          messageId: message.id,
          clientId: message.client_id,
          tags: ['followup', 'scheduled']
        });

        if (emailResult.success) {
          // Update message status to sent
          const { error: updateError } = await supabase
            .from('messages')
            .update({
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', message.id);

          if (updateError) {
            console.error(`❌ Failed to update message ${message.id} status:`, updateError);
            failed++;
          } else {
            console.log(`✅ Successfully sent and updated message ${message.id}`);
            processed++;
          }
        } else {
          console.error(`❌ Failed to send message ${message.id}:`, emailResult.error);
          
          // Update message status to failed
          await supabase
            .from('messages')
            .update({
              status: 'failed'
            })
            .eq('id', message.id);
          
          failed++;
        }

        results.push({
          messageId: message.id,
          clientEmail: client.email,
          success: emailResult.success,
          error: emailResult.error
        });

      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        failed++;
        
        // Update message status to failed
        await supabase
          .from('messages')
          .update({
            status: 'failed'
          })
          .eq('id', message.id);

        results.push({
          messageId: message.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 Processing complete: ${processed} sent, ${skipped} skipped, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      failed,
      total: dueMessages.length,
      results
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Support POST for manual triggering (for testing)
export async function POST(request: NextRequest) {
  return GET(request);
}
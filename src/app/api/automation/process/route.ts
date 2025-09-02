import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth';

/**
 * Smart Automation Processor
 * Processes scheduled emails when users are active (replaces cron jobs)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🤖 Processing automation for user:', user.id);
    
    // Get pending scheduled messages
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('owner_uid', user.id)
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (messagesError) {
      console.error('❌ Error fetching pending messages:', messagesError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let processed = 0;
    let failed = 0;

    // Process each pending message
    for (const message of pendingMessages || []) {
      try {
        // Send the email (implement your email sending logic here)
        console.log(`📧 Sending message: ${message.subject} to client ${message.client_id}`);
        
        // Update message status to sent
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', message.id);

        if (updateError) {
          console.error('❌ Error updating message status:', updateError);
          failed++;
        } else {
          processed++;
        }
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        failed++;
        
        // Mark message as failed
        await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('id', message.id);
      }
    }

    console.log(`✅ Automation complete: ${processed} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed,
      failed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Automation processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MOCK_MODE } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing scheduled follow-up sending...');
    
    const supabase = await createServerSupabaseClient();
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Authenticated user:', user.email);

    // Get a scheduled message to send
    const { data: scheduledMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, subject, body, tone, client_id, scheduled_at, status,
        clients!inner(name, email)
      `)
      .eq('owner_uid', user.id)
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .limit(1);

    if (messagesError || !scheduledMessages || scheduledMessages.length === 0) {
      console.log('❌ No scheduled messages found:', messagesError?.message);
      return NextResponse.json({
        success: false,
        error: 'No scheduled messages found',
        details: messagesError?.message
      });
    }

    const message = scheduledMessages[0];
    console.log('📧 Found scheduled message:', {
      id: message.id,
      subject: message.subject,
      to: message.clients?.email,
      client: message.clients?.name,
      fullMessage: message  // Debug: show full message object
    });

    // Simulate sending the email (you can replace this with actual email sending)
    const emailResult = await sendTestEmail(message);
    
    if (emailResult.success) {
      // Mark message as sent
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (updateError) {
        console.error('❌ Error updating message status:', updateError);
      } else {
        console.log('✅ Message marked as sent');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Follow-up sent successfully!',
      details: {
        messageId: message.id,
        subject: message.subject,
        to: message.clients?.email,
        client: message.clients?.name,
        emailSent: emailResult.success,
        emailDetails: emailResult.details
      }
    });

  } catch (error) {
    console.error('❌ Test follow-up send error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test follow-up sending',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function sendTestEmail(message: any) {
  try {
    console.log('📮 Attempting to send email...');
    
    const clientEmail = message.clients?.email || 'test@example.com';
    const clientName = message.clients?.name || 'Test Client';
    
    // Check if Resend API key is available
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    
    if (!resendApiKey) {
      console.log('📧 No Resend API key, simulating email send...');
      return {
        success: true,
        details: 'Email simulated (no Resend API key configured)',
        simulation: {
          to: clientEmail,
          subject: message.subject,
          body: message.body
        }
      };
    }

    console.log('📧 Sending via Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [clientEmail],
        subject: message.subject || `Follow-up from ClientHandle`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; color: white; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">ClientHandle</h1>
              <p style="margin: 8px 0 0; opacity: 0.9;">Professional Follow-up</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin: 0 0 20px; font-size: 20px;">Hi ${clientName},</h2>
              
              <div style="color: #666; line-height: 1.6; white-space: pre-line;">
${message.body}
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
                <p>This message was sent via ClientHandle - Professional client management for freelancers.</p>
              </div>
            </div>
          </div>
        `,
        text: `Hi ${clientName},\n\n${message.body}`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Resend API error:', errorData);
      return {
        success: false,
        details: `Email sending failed: ${errorData.message || 'Unknown error'}`
      };
    }

    const result = await response.json();
    console.log('✅ Email sent successfully via Resend:', result.id);
    
    return {
      success: true,
      details: `Email sent successfully via Resend (ID: ${result.id})`,
      emailId: result.id
    };

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return {
      success: false,
      details: `Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
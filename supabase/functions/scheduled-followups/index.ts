// Supabase Edge Function for automated scheduled follow-up sending
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmailTemplate {
  to: string
  subject: string
  html: string
  text: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting scheduled follow-up processor...')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get messages that should be sent now
    const now = new Date().toISOString()
    
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, subject, body, tone, scheduled_at, owner_uid,
        clients!inner(name, email)
      `)
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .limit(50) // Process in batches

    if (messagesError) {
      throw new Error(`Database error: ${messagesError.message}`)
    }

    if (!messages || messages.length === 0) {
      console.log('✅ No messages to send right now')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No messages due for sending',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Found ${messages.length} messages to send`)

    let successCount = 0
    let errorCount = 0
    const results = []

    // Process each message
    for (const message of messages) {
      try {
        console.log(`📮 Sending message ${message.id} to ${message.clients?.email}`)
        
        // Create email template
        const emailTemplate = createEmailTemplate(message)
        
        // Send via Resend
        const emailResult = await sendViaResend(emailTemplate, resendApiKey)
        
        if (emailResult.success) {
          // Mark as sent
          await supabase
            .from('messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id)

          successCount++
          results.push({
            messageId: message.id,
            status: 'success',
            emailId: emailResult.id
          })
          
          console.log(`✅ Message ${message.id} sent successfully`)
        } else {
          errorCount++
          results.push({
            messageId: message.id,
            status: 'error',
            error: emailResult.error
          })
          
          console.error(`❌ Failed to send message ${message.id}:`, emailResult.error)
        }

      } catch (error) {
        errorCount++
        results.push({
          messageId: message.id,
          status: 'error',
          error: error.message
        })
        
        console.error(`❌ Error processing message ${message.id}:`, error)
      }
    }

    console.log(`🎯 Batch complete: ${successCount} sent, ${errorCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${messages.length} messages`,
        successCount,
        errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Scheduler error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function createEmailTemplate(message: any): EmailTemplate {
  const clientName = message.clients?.name || 'Valued Client'
  const clientEmail = message.clients?.email || 'client@example.com'
  
  return {
    to: clientEmail,
    subject: message.subject,
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
  }
}

async function sendViaResend(email: EmailTemplate, apiKey: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev',
        to: [email.to],
        subject: email.subject || 'Follow-up from ClientHandle',
        html: email.html,
        text: email.text
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Email sending failed' }
    }

    const result = await response.json()
    return { success: true, id: result.id }

  } catch (error) {
    return { success: false, error: error.message }
  }
}
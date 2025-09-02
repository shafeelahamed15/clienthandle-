import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Testing real email sending with Resend...');
    
    const body = await request.json();
    const { to, subject, message } = body;
    
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }
    
    // Create HTML content
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0; font-weight: 600;">ClientHandle</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px;">AI-Powered Follow-up System</p>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #334155; font-size: 16px; line-height: 1.6; white-space: pre-line;">${message}</div>
          </div>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This email was sent via ClientHandle's automated follow-up system
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Create plain text content
    const textContent = `${message}\n\n---\nThis email was sent via ClientHandle's automated follow-up system`;
    
    console.log('📧 Sending email:', { to, subject, from: process.env.FROM_EMAIL });
    
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'ClientHandle <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
    
    if (result.error) {
      console.error('❌ Resend error:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }
    
    console.log('✅ Email sent successfully:', result.data?.id);
    
    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
      message: 'Email sent successfully',
      provider: 'resend'
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test email endpoint - POST to send emails',
    example: {
      method: 'POST',
      body: {
        to: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      }
    }
  });
}
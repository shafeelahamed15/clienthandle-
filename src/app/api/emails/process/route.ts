import { NextRequest, NextResponse } from 'next/server';
import { emailProcessor, reminderScheduler } from '@/lib/email/scheduler';

// POST /api/emails/process - Process pending email jobs
export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or background service
    // For security, you might want to add an API key check here
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CRON_SECRET || 'dev-secret-key';
    
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting email processing...');
    
    // Process pending email jobs
    const results = await emailProcessor.processJobs();
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} emails: ${results.sent} sent, ${results.failed} failed`
    });

  } catch (error) {
    console.error('Email processing failed:', error);
    return NextResponse.json(
      { error: 'Email processing failed' },
      { status: 500 }
    );
  }
}

// GET /api/emails/process - Manual trigger for development
export async function GET() {
  try {
    console.log('🔄 Manual email processing triggered...');
    
    const results = await emailProcessor.processJobs();
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} emails: ${results.sent} sent, ${results.failed} failed`
    });

  } catch (error) {
    console.error('Manual email processing failed:', error);
    return NextResponse.json(
      { error: 'Email processing failed' },
      { status: 500 }
    );
  }
}
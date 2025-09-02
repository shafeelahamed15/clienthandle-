import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing scheduled message processing...');
    
    // Call our cron job endpoint directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/cron/process-scheduled-messages`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
        'content-type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log('📊 Test scheduling result:', result);
    
    return NextResponse.json({
      success: true,
      cronResult: result,
      message: 'Test scheduling completed'
    });

  } catch (error) {
    console.error('❌ Test scheduling error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
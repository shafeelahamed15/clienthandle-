import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manually triggering scheduled follow-up processor...');
    
    // Call the Supabase Edge Function directly
    const functionUrl = 'https://gjwgrkaabbydicnwgyrw.supabase.co/functions/v1/scheduled-followups';
    
    console.log('🔐 Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      body: JSON.stringify({ trigger: 'manual' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Function call failed:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Function call failed: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('✅ Function response:', result);

    return NextResponse.json({
      success: true,
      message: 'Scheduler triggered successfully',
      result: result
    });

  } catch (error) {
    console.error('❌ Error triggering scheduler:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger the scheduler',
    usage: 'POST /api/trigger-scheduler'
  });
}
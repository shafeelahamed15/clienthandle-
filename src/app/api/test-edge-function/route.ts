import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Testing Edge Function directly...');
    
    // Call the deployed Edge Function with anonymous access
    const functionUrl = 'https://gjwgrkaabbydicnwgyrw.supabase.co/functions/v1/scheduled-followups';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Function call failed:', response.status, errorText);
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText
      });
    }

    const result = await response.json();
    console.log('✅ Function response:', result);

    return NextResponse.json({
      success: true,
      message: 'Edge Function test completed',
      result: result
    });

  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test Edge Function',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
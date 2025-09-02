import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      success: true,
      providers: {
        openai: {
          configured: hasOpenAI,
          name: 'OpenAI GPT-4',
          status: hasOpenAI ? 'ready' : 'not_configured'
        }
      },
      message: hasOpenAI 
        ? 'AI services are properly configured'
        : 'OpenAI API key not configured'
    })
  } catch (error) {
    console.error('AI status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check AI status' },
      { status: 500 }
    )
  }
}
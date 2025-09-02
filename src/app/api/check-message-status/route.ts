import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking message status...');
    
    const supabase = await createServerSupabaseClient();
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get recent messages with their status
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, subject, body, tone, scheduled_at, status, sent_at, created_at,
        clients!inner(name, email)
      `)
      .eq('owner_uid', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${messages?.length || 0} recent messages`);

    return NextResponse.json({
      success: true,
      messages: messages || [],
      currentTime: new Date().toISOString(),
      summary: {
        total: messages?.length || 0,
        draft: messages?.filter(m => m.status === 'draft').length || 0,
        sent: messages?.filter(m => m.status === 'sent').length || 0,
        scheduled: messages?.filter(m => m.status === 'draft' && m.scheduled_at).length || 0
      }
    });

  } catch (error) {
    console.error('❌ Check message status error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check message status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const schema = z.object({
  clientId: z.string().uuid(),
  pause: z.boolean()
});

export async function POST(req: NextRequest) {
  try {
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'invalid_body',
        details: parsed.error.errors 
      }, { status: 400 });
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', parsed.data.clientId)
      .eq('owner_uid', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
    }

    // Update followup queue status
    const newStatus = parsed.data.pause ? 'paused' : 'queued';
    const { data, error } = await supabase
      .from('followup_queue')
      .update({ status: newStatus })
      .eq('owner_uid', user.id)
      .eq('client_id', parsed.data.clientId)
      .in('status', ['queued', 'paused']) // only affect future items
      .select();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      affected: data?.length || 0,
      status: newStatus
    });

  } catch (error) {
    console.error('Followup pause API error:', error);
    return NextResponse.json({
      error: 'Failed to update followup status'
    }, { status: 500 });
  }
}
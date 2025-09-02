import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Request validation schema for recurring campaigns
const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid(),
  clientContext: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().min(1).max(10),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  tone: z.enum(['friendly', 'professional', 'firm']),
  maxMessages: z.number().min(1),
  pauseOnReply: z.boolean(),
  enabled: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get user from server session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const campaign = CreateCampaignSchema.parse(body);

    // Verify client belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', campaign.clientId)
      .eq('owner_uid', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update client notes with the context if provided
    if (campaign.clientContext.trim()) {
      await supabase
        .from('clients')
        .update({ 
          notes: campaign.clientContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.clientId);
    }

    // Get user profile for business name
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name, business_name')
      .eq('id', user.id)
      .single();

    const businessName = userProfile?.business_name || userProfile?.display_name || user.user_metadata?.full_name || 'ClientHandle';

    // Calculate next run time
    const now = new Date();
    const [hours, minutes] = campaign.timeOfDay.split(':').map(Number);
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has passed today, start tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    // Create the recurring email schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('email_schedules')
      .insert({
        owner_uid: user.id,
        client_id: campaign.clientId,
        name: campaign.name,
        email_subject: `Follow-up from ${businessName}`,
        email_body: '', // Will be AI generated each time
        recurring_pattern: {
          frequency: campaign.frequency,
          interval: campaign.interval,
          timeOfDay: campaign.timeOfDay,
          tone: campaign.tone,
          pauseOnReply: campaign.pauseOnReply,
          clientContext: campaign.clientContext
        },
        status: campaign.enabled ? 'scheduled' : 'paused',
        scheduled_at: nextRun.toISOString(),
        next_run_at: nextRun.toISOString(),
        max_sends: campaign.maxMessages === 999 ? null : campaign.maxMessages,
        send_count: 0
      })
      .select()
      .single();

    if (scheduleError) {
      console.error('Failed to create schedule:', scheduleError);
      return NextResponse.json(
        { error: 'Failed to create campaign', details: scheduleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: schedule.id,
        name: campaign.name,
        client: client.name,
        status: schedule.status,
        nextRun: schedule.next_run_at,
        frequency: campaign.frequency,
        interval: campaign.interval
      }
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get user from server session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch all recurring campaigns for the user
    const { data: campaigns, error } = await supabase
      .from('email_schedules')
      .select(`
        id,
        name,
        status,
        scheduled_at,
        next_run_at,
        send_count,
        max_sends,
        recurring_pattern,
        created_at,
        clients!inner(id, name, email)
      `)
      .eq('owner_uid', user.id)
      .not('recurring_pattern', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Transform the data for frontend consumption
    const transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      client: {
        id: campaign.clients.id,
        name: campaign.clients.name,
        email: campaign.clients.email
      },
      status: campaign.status,
      frequency: campaign.recurring_pattern?.frequency || 'weekly',
      interval: campaign.recurring_pattern?.interval || 1,
      tone: campaign.recurring_pattern?.tone || 'professional',
      nextRun: campaign.next_run_at,
      sentCount: campaign.send_count,
      maxSends: campaign.max_sends,
      createdAt: campaign.created_at
    }));

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
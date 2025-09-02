import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// GET - Fetch existing follow-up data for editing
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate the ID format
    const idSchema = z.string().uuid();
    const validatedId = idSchema.parse(id);
    
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // First check messages table for simple follow-ups
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select(`
        id, client_id, related_invoice_id, type, tone, body, 
        scheduled_at, status, owner_uid
      `)
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .eq('type', 'followup')
      .single();

    if (messageData && !messageError) {
      return NextResponse.json({
        id: messageData.id,
        client_id: messageData.client_id,
        related_invoice_id: messageData.related_invoice_id,
        type: messageData.type,
        tone: messageData.tone,
        body: messageData.body,
        scheduled_at: messageData.scheduled_at,
        status: messageData.status,
        isRecurring: false
      });
    }

    // If not found in messages, check email_schedules table for recurring follow-ups
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('email_schedules')
      .select(`
        id, client_id, name, email_subject, email_body, scheduled_at, 
        status, recurring_pattern, variables, owner_uid
      `)
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .single();

    if (scheduleError || !scheduleData) {
      return NextResponse.json({ error: 'followup_not_found' }, { status: 404 });
    }

    return NextResponse.json({
      id: scheduleData.id,
      client_id: scheduleData.client_id,
      name: scheduleData.name,
      email_subject: scheduleData.email_subject,
      email_body: scheduleData.email_body,
      scheduled_at: scheduleData.scheduled_at,
      status: scheduleData.status,
      recurring_pattern: scheduleData.recurring_pattern,
      variables: scheduleData.variables,
      isRecurring: true
    });

  } catch (error) {
    console.error('Followup fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch followup data'
    }, { status: 500 });
  }
}

// PUT - Update existing follow-up
const updateSchema = z.object({
  clientId: z.string().uuid(),
  relatedInvoiceId: z.string().uuid().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(5, 'Message body is required'),
  tone: z.enum([
    'friendly', 
    'professional', 
    'firm', 
    'gentle',
    'urgent',
    'casual',
    'helpful_service',
    'assertive'
  ]).default('professional'),
  scheduleType: z.enum(['immediate', 'custom', 'recurring']).default('custom'),
  scheduledAt: z.string().optional(),
  recurrencePattern: z.object({
    type: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1),
    timeUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
    endAfter: z.number().optional(),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  pauseOnReply: z.boolean().default(true),
  cancelIfPaid: z.boolean().default(true),
  maxSends: z.number().min(1).max(10).optional()
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate the ID format
    const idSchema = z.string().uuid();
    const validatedId = idSchema.parse(id);
    
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const json = await req.json();
    console.log('🔍 Received update request:', JSON.stringify(json, null, 2));
    
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Validation failed:', parsed.error.errors);
      return NextResponse.json({ 
        error: 'invalid_body',
        details: parsed.error.errors
      }, { status: 400 });
    }

    const data = parsed.data;

    // Handle different schedule types
    let scheduledTime: Date | null = null;
    
    switch (data.scheduleType) {
      case 'immediate':
        scheduledTime = null;
        break;
      
      case 'custom':
        if (data.scheduledAt) {
          scheduledTime = new Date(data.scheduledAt);
          if (isNaN(scheduledTime.getTime())) {
            return NextResponse.json({ error: 'Invalid scheduled date' }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: 'Scheduled date required for custom scheduling' }, { status: 400 });
        }
        break;
      
      case 'recurring':
        if (!data.recurrencePattern) {
          return NextResponse.json({ error: 'Recurrence pattern required for recurring scheduling' }, { status: 400 });
        }
        // Calculate next send time for recurring
        const now = new Date();
        const [hours, minutes] = data.recurrencePattern.timeOfDay.split(':').map(Number);
        scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        break;
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.clientId)
      .eq('owner_uid', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
    }

    // Verify invoice ownership if provided
    if (data.relatedInvoiceId) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', data.relatedInvoiceId)
        .eq('owner_uid', user.id)
        .single();

      if (invoiceError || !invoice) {
        return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
      }
    }

    // Try to update in messages table first
    const { data: existingMessage, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .single();

    if (existingMessage && !messageError) {
      // Update in messages table
      const toneMapping = {
        'helpful_service': 'professional',
        'friendly': 'friendly', 
        'professional': 'professional',
        'firm': 'firm'
      };
      const dbTone = toneMapping[data.tone as keyof typeof toneMapping] || 'professional';

      const { error: updateError } = await supabase
        .from('messages')
        .update({
          client_id: data.clientId,
          related_invoice_id: data.relatedInvoiceId || null,
          tone: dbTone,
          body: data.body,
          scheduled_at: scheduledTime?.toISOString(),
          status: data.scheduleType === 'immediate' ? 'queued' : 'draft'
        })
        .eq('id', validatedId)
        .eq('owner_uid', user.id);

      if (updateError) {
        console.error('❌ Message update error:', updateError);
        return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        id: validatedId,
        scheduleType: data.scheduleType,
        scheduledAt: scheduledTime?.toISOString(),
        message: 'Follow-up updated successfully'
      });
    }

    // Try to update in email_schedules table
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from('email_schedules')
      .select('id')
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .single();

    if (!existingSchedule || scheduleError) {
      return NextResponse.json({ error: 'followup_not_found' }, { status: 404 });
    }

    // Update in email_schedules table
    const { error: updateError } = await supabase
      .from('email_schedules')
      .update({
        client_id: data.clientId,
        name: `${data.subject} - Updated Follow-up`,
        scheduled_at: scheduledTime?.toISOString(),
        email_subject: data.subject,
        email_body: data.body,
        status: 'scheduled',
        recurring_pattern: data.recurrencePattern ? {
          type: data.recurrencePattern.type,
          interval: data.recurrencePattern.interval,
          timeOfDay: data.recurrencePattern.timeOfDay,
          endAfter: data.recurrencePattern.endAfter,
          endDate: data.recurrencePattern.endDate,
          daysOfWeek: data.recurrencePattern.daysOfWeek
        } : null,
        variables: {
          tone: data.tone,
          relatedInvoiceId: data.relatedInvoiceId,
          pauseOnReply: data.pauseOnReply,
          cancelIfPaid: data.cancelIfPaid,
          maxSends: data.maxSends
        }
      })
      .eq('id', validatedId)
      .eq('owner_uid', user.id);

    if (updateError) {
      console.error('❌ Schedule update error:', updateError);
      return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
    }

    console.log('✅ Successfully updated follow-up:', validatedId);

    return NextResponse.json({ 
      success: true,
      id: validatedId,
      scheduleType: data.scheduleType,
      scheduledAt: scheduledTime?.toISOString(),
      isRecurring: data.scheduleType === 'recurring',
      message: data.scheduleType === 'recurring'
        ? `Recurring follow-up updated, next send: ${scheduledTime?.toLocaleDateString()}`
        : `Follow-up updated for ${scheduledTime?.toLocaleDateString()}`
    });

  } catch (error) {
    console.error('Followup update error:', error);
    return NextResponse.json({
      error: 'Failed to update followup'
    }, { status: 500 });
  }
}

// PATCH - Quick update for message content only (used by modal)
const quickEditSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body cannot be empty')
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Validate the ID format
    const idSchema = z.string().uuid();
    const validatedId = idSchema.parse(id);
    
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const json = await req.json();
    const parsed = quickEditSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parsed.error.errors
      }, { status: 400 });
    }

    const { subject, body } = parsed.data;

    // Try to update in messages table first
    const { data: existingMessage, error: messageError } = await supabase
      .from('messages')
      .select('id, status')
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .single();

    if (existingMessage && !messageError) {
      // Only allow editing draft messages
      if (existingMessage.status !== 'draft') {
        return NextResponse.json({ 
          error: 'Cannot edit message that has already been sent or queued' 
        }, { status: 400 });
      }

      const updateData: { body: string; subject?: string } = { body };
      if (subject !== undefined) {
        updateData.subject = subject;
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', validatedId)
        .eq('owner_uid', user.id);

      if (updateError) {
        console.error('Message quick update error:', updateError);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        message: 'Message updated successfully',
        id: validatedId
      });
    }

    // Try to update in email_schedules table
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from('email_schedules')
      .select('id, status')
      .eq('id', validatedId)
      .eq('owner_uid', user.id)
      .single();

    if (!existingSchedule || scheduleError) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only allow editing scheduled messages
    if (existingSchedule.status === 'sent' || existingSchedule.status === 'failed') {
      return NextResponse.json({ 
        error: 'Cannot edit message that has already been processed' 
      }, { status: 400 });
    }

    const updateData: { email_body: string; email_subject?: string } = { email_body: body };
    if (subject !== undefined) {
      updateData.email_subject = subject;
    }

    const { error: updateError } = await supabase
      .from('email_schedules')
      .update(updateData)
      .eq('id', validatedId)
      .eq('owner_uid', user.id);

    if (updateError) {
      console.error('Schedule quick update error:', updateError);
      return NextResponse.json({ error: 'Failed to update scheduled message' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Scheduled message updated successfully',
      id: validatedId
    });

  } catch (error) {
    console.error('Quick edit error:', error);
    return NextResponse.json({
      error: 'Failed to update message'
    }, { status: 500 });
  }
}
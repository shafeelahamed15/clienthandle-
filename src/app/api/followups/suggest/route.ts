import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateFollowupAngle, type AngleInput } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  clientId: z.string().uuid(),
  relatedInvoiceId: z.string().uuid().optional(),
  preferredTone: z.enum(['friendly', 'professional', 'firm', 'helpful_service']).optional(),
  disallowedAngles: z.array(z.string()).optional(),
  desiredAngle: z.enum(['forgot_to_add', 'resource', 'next_step_question', 'benefit_framing', 'deadline_or_capacity', 'easy_out']).optional()
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

    // Rate limiting
    try {
      await rateLimit(user.id, 'followups_suggest', 30, 60000);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again in a minute.' 
      }, { status: 429 });
    }

    // Parse and validate request body
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parsed.error.errors 
      }, { status: 400 });
    }

    // Fetch client data
    const { data: clientRow, error: clientErr } = await supabase
      .from('clients')
      .select('id, name, company, last_contact_at')
      .eq('id', parsed.data.clientId)
      .eq('owner_uid', user.id)
      .single();

    if (clientErr || !clientRow) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
    }

    let lastTopic: string | undefined = undefined;
    let invoiceNumber: string | undefined;
    let dueDateISO: string | undefined;

    // Optionally fetch invoice context
    if (parsed.data.relatedInvoiceId) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('number, due_date')
        .eq('id', parsed.data.relatedInvoiceId)
        .eq('owner_uid', user.id)
        .single();

      if (inv) {
        invoiceNumber = inv.number;
        dueDateISO = inv.due_date;
        lastTopic = `invoice ${inv.number}`;
      }
    }

    // Build AI input
    const angleInput: AngleInput = {
      clientName: clientRow.name,
      company: clientRow.company || undefined,
      lastTopic,
      invoiceNumber,
      dueDateISO,
      lastContactAtISO: clientRow.last_contact_at || undefined,
      preferredTone: parsed.data.preferredTone,
      disallowedAngles: parsed.data.disallowedAngles,
      desiredAngle: parsed.data.desiredAngle
    };

    // Generate AI suggestion
    const result = await generateFollowupAngle(angleInput);

    // Validate output
    if (!result.angle || !result.body) {
      return NextResponse.json({ error: 'empty_ai_output' }, { status: 500 });
    }

    // Ensure body is not too long
    if (result.body.length > 700) {
      result.body = result.body.slice(0, 700);
    }

    return NextResponse.json({
      angle: result.angle,
      subject: result.subject || '',
      body: result.body
    });

  } catch (error) {
    console.error('Followup suggest API error:', error);
    
    if (error instanceof Error) {
      // Handle specific AI errors
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json({
          error: 'AI service not configured. Please contact support.'
        }, { status: 503 });
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({
          error: 'AI service temporarily unavailable. Please try again later.'
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      error: 'Failed to generate suggestion'
    }, { status: 500 });
  }
}
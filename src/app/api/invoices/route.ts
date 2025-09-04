import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Line item validation schema
const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.number().min(1, 'Quantity must be at least 1'),
  unit_price_cents: z.number().min(0, 'Price must be non-negative'),
  total_cents: z.number().min(0, 'Total must be non-negative'),
});

// Invoice validation schema
const CreateInvoiceSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  number: z.string().min(1, 'Invoice number is required'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']),
  amount_cents: z.number().min(1, 'Amount must be greater than 0'),
  due_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid due date'),
  line_items: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  status: z.enum(['draft', 'sent']).default('draft'),
});

const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  id: z.string().min(1, 'Invoice ID is required'),
});


// CREATE - POST /api/invoices
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const invoiceData = CreateInvoiceSchema.parse(body);

    // Verify client belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', invoiceData.client_id)
      .eq('owner_uid', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Check if invoice number is unique for this user
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('owner_uid', user.id)
      .eq('number', invoiceData.number)
      .single();

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice number already exists' },
        { status: 409 }
      );
    }

    // Create the invoice
    const { data: invoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        owner_uid: user.id,
        client_id: invoiceData.client_id,
        number: invoiceData.number,
        currency: invoiceData.currency,
        amount_cents: invoiceData.amount_cents,
        status: invoiceData.status,
        due_date: invoiceData.due_date,
        line_items: invoiceData.line_items,
      })
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .single();

    if (createError) {
      console.error('Failed to create invoice:', createError);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'create_invoice',
        entity_type: 'invoice',
        entity_id: invoice.id,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      });

    return NextResponse.json({
      success: true,
      invoice,
      message: `Invoice ${invoice.number} created successfully`,
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid invoice data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// READ - GET /api/invoices
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .eq('owner_uid', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Failed to fetch invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const stats = {
      total: invoices?.length || 0,
      draft: invoices?.filter(i => i.status === 'draft').length || 0,
      sent: invoices?.filter(i => i.status === 'sent').length || 0,
      paid: invoices?.filter(i => i.status === 'paid').length || 0,
      overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
      totalAmount: invoices?.reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    };

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      stats,
      pagination: {
        offset,
        limit,
        hasMore: (invoices?.length || 0) === limit,
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple IP hashing for audit logs
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
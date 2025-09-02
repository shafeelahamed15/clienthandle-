import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateInvoicePDFBlob, type InvoiceData } from '@/lib/pdf';
import { z } from 'zod';

const UpdateInvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  number: z.string().min(1).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']).optional(),
  amount_cents: z.number().min(1).optional(),
  due_date: z.string().refine((date) => !isNaN(Date.parse(date))).optional(),
  line_items: z.array(z.object({
    description: z.string().min(1),
    qty: z.number().min(1),
    unit_price_cents: z.number().min(0),
    total_cents: z.number().min(0),
  })).optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional(),
});

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: invoiceId } = await params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients!inner(name, email, company, phone)
      `)
      .eq('id', invoiceId)
      .eq('owner_uid', user.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: invoiceId } = await params;
    const body = await request.json();
    const updateData = UpdateInvoiceSchema.parse(body);

    // Verify invoice belongs to user
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', invoiceId)
      .eq('owner_uid', user.id)
      .single();

    if (fetchError || !existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Don't allow updates to paid invoices
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot modify paid invoices' },
        { status: 403 }
      );
    }

    // Check if new invoice number conflicts
    if (updateData.number) {
      const { data: conflictInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('owner_uid', user.id)
        .eq('number', updateData.number)
        .neq('id', invoiceId)
        .single();

      if (conflictInvoice) {
        return NextResponse.json(
          { error: 'Invoice number already exists' },
          { status: 409 }
        );
      }
    }

    // Update the invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('owner_uid', user.id)
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .single();

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'update_invoice',
        entity_type: 'invoice',
        entity_id: invoiceId,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice updated successfully',
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    
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

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: invoiceId } = await params;

    // Verify invoice belongs to user and check if it can be deleted
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, number')
      .eq('id', invoiceId)
      .eq('owner_uid', user.id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of paid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices' },
        { status: 403 }
      );
    }

    // Delete the invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('owner_uid', user.id);

    if (deleteError) {
      console.error('Failed to delete invoice:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'delete_invoice',
        entity_type: 'invoice',
        entity_id: invoiceId,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      });

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoice.number} deleted successfully`,
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
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
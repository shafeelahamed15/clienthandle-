import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateInvoicePDF, type InvoiceData } from '@/lib/pdf';
import { mockInvoicesService, mockClientsService, MOCK_MODE } from '@/lib/mock-data';

interface LineItem {
  description: string;
  qty: number;
  unit_price_cents: number;
  total_cents: number;
}

// Mock PDF generation handler
async function handleMockPDFGeneration(invoiceId: string) {
  try {
    const invoice = await mockInvoicesService.get(invoiceId, 'mock-user-1');
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const client = await mockClientsService.get(invoice.client_id, 'mock-user-1');
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Prepare invoice data for PDF generation
    const invoiceData: InvoiceData = {
      number: invoice.number,
      issueDate: invoice.created_at,
      dueDate: invoice.due_date,
      currency: invoice.currency,
      amountCents: invoice.amount_cents,
      client: {
        name: client.name,
        email: client.email,
        company: client.company
      },
      lineItems: invoice.line_items.map(item => ({
        description: item.description,
        qty: item.qty,
        unitPriceCents: item.unit_price_cents,
        totalCents: item.total_cents
      })),
      taxPercentage: invoice.tax_percentage || 0,
      notes: invoice.notes,
      business: {
        name: 'ClientHandle Demo',
        email: 'demo@clienthandle.app',
        phone: '+1 (555) 123-4567',
        address: '123 Demo Street, Demo City, DC 12345'
      }
    };

    // Generate PDF
    const pdf = generateInvoicePDF(invoiceData);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Set headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="Invoice-${invoice.number}-${client.name.replace(/\s+/g, '-')}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new Response(pdfBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Mock PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// GET /api/invoices/[id]/pdf - Generate and download PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params;

  // Mock mode handling
  if (MOCK_MODE) {
    console.log('🎭 Using mock mode for PDF generation');
    return handleMockPDFGeneration(invoiceId);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('📡 Auth failed, falling back to mock mode');
      return handleMockPDFGeneration(invoiceId);
    }

    // Fetch invoice with client details
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

    // Get user profile for business info
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name, email, brand_logo_url')
      .eq('id', user.id)
      .single();

    // Transform data for PDF generation
    const pdfData: InvoiceData = {
      number: invoice.number,
      issueDate: invoice.created_at,
      dueDate: invoice.due_date,
      currency: invoice.currency,
      amountCents: invoice.amount_cents,
      client: {
        name: invoice.clients.name,
        email: invoice.clients.email,
        company: invoice.clients.company,
      },
      lineItems: invoice.line_items.map((item: LineItem) => ({
        description: item.description,
        qty: item.qty,
        unitPriceCents: item.unit_price_cents,
        totalCents: item.total_cents,
      })),
      notes: invoice.notes,
      business: {
        name: userProfile?.display_name || 'ClientHandle User',
        email: userProfile?.email || user.email,
      },
    };

    // Generate PDF
    const pdf = generateInvoicePDF(pdfData);
    const pdfBuffer = pdf.output('arraybuffer');

    // Log PDF generation
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'generate_pdf',
        entity_type: 'invoice',
        entity_id: invoiceId,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      });

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.number}-${invoice.clients.name.replace(/\s+/g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
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
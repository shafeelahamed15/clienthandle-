import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateInvoicePDFBuffer, type InvoiceData } from '@/lib/pdf'
import { sendEmail, createEmailTemplate, createPlainTextEmail, createPDFAttachment, isEmailServiceConfigured, isValidEmail } from '@/lib/email'
import { z } from 'zod'

// Request validation schema
const SendEmailRequestSchema = z.object({
  clientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  messageType: z.enum(['followup', 'reminder', 'update']),
  tone: z.enum(['friendly', 'professional', 'firm']),
  attachInvoicePDF: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const data = SendEmailRequestSchema.parse(body)

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, email, company')
      .eq('id', data.clientId)
      .eq('owner_uid', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.email) {
      return NextResponse.json(
        { error: 'Client email not found' },
        { status: 400 }
      )
    }

    let pdfAttachment: Buffer | null = null
    let invoice = null

    // Generate PDF attachment if invoice is selected and attachInvoicePDF is true
    if (data.invoiceId && data.attachInvoicePDF) {
      // Fetch invoice with client details for PDF generation
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          number,
          amount_cents,
          currency,
          due_date,
          created_at,
          line_items,
          status,
          clients!inner(name, email, company)
        `)
        .eq('id', data.invoiceId)
        .eq('owner_uid', user.id)
        .single()

      if (!invoiceError && invoiceData) {
        invoice = invoiceData

        // Fetch user profile for business info
        const { data: userProfile } = await supabase
          .from('users')
          .select('display_name, business_name, email, brand_accent_color')
          .eq('id', user.id)
          .single()

        // Prepare invoice data for PDF generation
        const invoicePDFData: InvoiceData = {
          number: invoiceData.number,
          issueDate: invoiceData.created_at,
          dueDate: invoiceData.due_date,
          currency: invoiceData.currency,
          amountCents: invoiceData.amount_cents,
          client: {
            name: invoiceData.clients.name,
            email: invoiceData.clients.email || undefined,
            company: invoiceData.clients.company || undefined,
          },
          lineItems: invoiceData.line_items.map((item: Record<string, unknown>) => ({
            description: item.description,
            qty: item.qty,
            unitPriceCents: item.unit_price_cents,
            totalCents: item.total_cents,
          })),
          business: {
            name: userProfile?.business_name || userProfile?.display_name || 'ClientHandle User',
            email: userProfile?.email || user.email,
          },
        }

        // Generate PDF as buffer
        pdfAttachment = generateInvoicePDFBuffer(invoicePDFData)
      }
    }

    // Validate email address
    if (!isValidEmail(client.email)) {
      return NextResponse.json(
        { error: 'Invalid client email address' },
        { status: 400 }
      )
    }

    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      console.log('📧 Email service not configured - simulating send')
      console.log('📧 Would send to:', client.email)
      console.log('📧 Subject:', data.subject)
      console.log('📧 Has PDF attachment:', !!pdfAttachment)
      
      // Continue with simulation for development
    } else {
      // Get user profile for sender name
      const { data: userProfile } = await supabase
        .from('users')
        .select('display_name, business_name, email, brand_accent_color')
        .eq('id', user.id)
        .single()

      const senderName = userProfile?.display_name || 'ClientHandle User'
      const businessName = userProfile?.business_name || userProfile?.display_name || 'ClientHandle User'
      const brandColor = userProfile?.brand_accent_color || '#0A84FF'

      // Create email templates
      const htmlContent = createEmailTemplate({
        content: data.body,
        clientName: client.name,
        senderName,
        businessName,
        brandColor,
        includeUnsubscribe: true
      })

      const textContent = createPlainTextEmail({
        content: data.body,
        senderName,
        businessName
      })

      // Prepare attachments
      const attachments = []
      if (pdfAttachment && invoice) {
        const pdfAttach = createPDFAttachment(
          pdfAttachment, 
          `Invoice-${invoice.number}-${client.name.replace(/\s+/g, '-')}.pdf`
        )
        attachments.push(pdfAttach)
      }

      // Send email using Resend
      const emailResult = await sendEmail({
        to: client.email,
        from: userProfile?.email || user.email,
        subject: data.subject,
        text: textContent,
        html: htmlContent,
        attachments: attachments.length > 0 ? attachments : undefined,
        trackingSettings: {
          clickTracking: true,
          openTracking: true,
        }
      })

      if (!emailResult.success) {
        return NextResponse.json(
          { error: `Failed to send email: ${emailResult.error}` },
          { status: 500 }
        )
      }

      console.log('✅ Email sent successfully via Resend')
      console.log('📧 Message ID:', emailResult.messageId)
    }

    // Save message to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        owner_uid: user.id,
        client_id: data.clientId,
        type: data.messageType,
        tone: data.tone,
        channel: 'email',
        subject: data.subject,
        body: data.body,
        redacted_body: data.body, // TODO: Implement PII redaction
        related_invoice_id: data.invoiceId || null,
        status: 'sent', // In real implementation, this would be 'queued' initially
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save message:', saveError)
      return NextResponse.json(
        { error: 'Failed to save message record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      message: isEmailServiceConfigured() ? 'Email sent successfully via Resend' : 'Email simulated (Resend not configured)',
      emailServiceConfigured: isEmailServiceConfigured(),
      attachmentIncluded: !!pdfAttachment,
      attachmentSize: pdfAttachment ? pdfAttachment.length : 0,
      clientEmail: client.email,
      invoiceNumber: invoice?.number,
    })

  } catch (error) {
    console.error('Send email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
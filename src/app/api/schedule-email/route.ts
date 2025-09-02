import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateFollowup, type MessageContext, type Tone, type MessageType } from '@/lib/ai'
import { z } from 'zod'

type SchedulePattern = z.infer<typeof ScheduleEmailRequestSchema>['schedulePattern'];

// Request validation schema
const ScheduleEmailRequestSchema = z.object({
  clientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  messageType: z.enum(['followup', 'reminder', 'update']),
  tone: z.enum(['friendly', 'professional', 'firm']),
  subject: z.string().min(1),
  customContext: z.string().optional(),
  attachInvoicePDF: z.boolean().default(false),
  
  // Scheduling parameters
  schedulePattern: z.object({
    type: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1),
    timeUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
    timeOfDay: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endAfter: z.number().optional(),
    endDate: z.string().optional(),
  }),
  
  timezone: z.string().default('UTC'),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user with server-side client
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
    const data = ScheduleEmailRequestSchema.parse(body)

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

    // Fetch invoice data if provided
    let invoice = null
    if (data.invoiceId) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('number, amount_cents, currency, due_date, status')
        .eq('id', data.invoiceId)
        .eq('owner_uid', user.id)
        .single()

      if (!invoiceError && invoiceData) {
        invoice = invoiceData
      }
    }

    // Build message context
    const context: MessageContext = {
      clientName: client.name,
      customContext: data.customContext,
    }

    if (invoice) {
      context.invoiceNumber = invoice.number
      context.amount = (invoice.amount_cents / 100).toFixed(2)
      context.currency = invoice.currency
      context.dueDate = invoice.due_date

      // Calculate days past due
      if (invoice.due_date && invoice.status !== 'paid') {
        const dueDate = new Date(invoice.due_date)
        const today = new Date()
        const diffTime = today.getTime() - dueDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays > 0) {
          context.daysPastDue = diffDays
        }
      }
    }

    // Generate AI message
    const aiResult = await generateFollowup(
      data.messageType as MessageType,
      data.tone as Tone,
      context
    )

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(data.schedulePattern, data.timezone)

    // Create email schedule record
    const { data: scheduleRecord, error: scheduleError } = await supabase
      .from('email_schedules')
      .insert({
        owner_uid: user.id,
        client_id: data.clientId,
        name: `${data.messageType} - ${client.name}`,
        scheduled_at: nextRunAt.toISOString(),
        timezone: data.timezone,
        status: 'scheduled',
        recurring_pattern: data.schedulePattern,
        email_subject: data.subject,
        email_body: aiResult.message,
        variables: {
          clientName: client.name,
          messageType: data.messageType,
          tone: data.tone,
          customContext: data.customContext,
          aiProvider: aiResult.provider,
          attachInvoicePDF: data.attachInvoicePDF && !!data.invoiceId,
          invoiceId: data.invoiceId,
        },
        next_run_at: nextRunAt.toISOString(),
        max_sends: data.schedulePattern.endAfter,
      })
      .select()
      .single()

    if (scheduleError) {
      console.error('Failed to create schedule:', scheduleError)
      return NextResponse.json(
        { error: 'Failed to create email schedule' },
        { status: 500 }
      )
    }

    // Create initial message record for tracking
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        owner_uid: user.id,
        client_id: data.clientId,
        type: data.messageType,
        tone: data.tone,
        channel: 'email',
        subject: data.subject,
        body: aiResult.message,
        redacted_body: aiResult.redactedContext,
        related_invoice_id: data.invoiceId || null,
        scheduled_at: nextRunAt.toISOString(),
        schedule_timezone: data.timezone,
        recurring_pattern: data.schedulePattern,
        status: 'queued',
        sequence_id: scheduleRecord.id, // Link to schedule
      })

    if (messageError) {
      console.error('Failed to create message record:', messageError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      scheduleId: scheduleRecord.id,
      message: aiResult.message,
      nextRunAt: nextRunAt.toISOString(),
      pattern: data.schedulePattern,
      client: {
        name: client.name,
        email: client.email,
      },
      preview: getSchedulePreview(data.schedulePattern),
    })

  } catch (error) {
    console.error('Schedule email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to schedule email' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch scheduled emails
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const status = url.searchParams.get('status') || 'scheduled'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

    let query = supabase
      .from('email_schedules')
      .select(`
        *,
        clients!inner(name, email, company)
      `)
      .eq('owner_uid', user.id)
      .eq('status', status)
      .order('next_run_at', { ascending: true })
      .limit(limit)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: schedules, error } = await query

    if (error) {
      console.error('Failed to fetch schedules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled emails' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      schedules: schedules || [],
    })

  } catch (error) {
    console.error('GET schedules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateNextRunTime(pattern: SchedulePattern, _timezone: string): Date {
  const now = new Date()
  const [hours, minutes] = pattern.timeOfDay.split(':').map(Number)
  
  let nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)
  
  // If time has passed today, schedule for tomorrow/next occurrence
  if (nextRun <= now) {
    switch (pattern.type) {
      case 'once':
        nextRun = new Date(now.getTime() + 60 * 1000) // 1 minute from now
        break
      case 'daily':
        nextRun.setDate(nextRun.getDate() + pattern.interval)
        break
      case 'weekly':
        // Find next occurrence of selected days
        const currentDay = nextRun.getDay()
        const daysOfWeek = pattern.daysOfWeek || [currentDay]
        let daysToAdd = 1
        
        for (let i = 1; i <= 7; i++) {
          const testDay = (currentDay + i) % 7
          if (daysOfWeek.includes(testDay)) {
            daysToAdd = i
            break
          }
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + pattern.interval)
        break
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1)
        break
    }
  }
  
  return nextRun
}

function getSchedulePreview(pattern: SchedulePattern): string {
  const { type, interval, timeOfDay, daysOfWeek, endAfter } = pattern
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  let preview = ''
  
  switch (type) {
    case 'once':
      preview = 'Send once immediately'
      break
    case 'daily':
      preview = `Every ${interval > 1 ? interval + ' days' : 'day'} at ${timeOfDay}`
      break
    case 'weekly':
      const days = daysOfWeek?.map((d: number) => dayNames[d]).join(', ') || 'selected days'
      preview = `Every ${interval > 1 ? interval + ' weeks' : 'week'} on ${days} at ${timeOfDay}`
      break
    case 'monthly':
      preview = `Every ${interval > 1 ? interval + ' months' : 'month'} at ${timeOfDay}`
      break
    case 'yearly':
      preview = `Every year at ${timeOfDay}`
      break
  }
  
  if (endAfter) {
    preview += ` (${endAfter} times)`
  }
  
  return preview
}
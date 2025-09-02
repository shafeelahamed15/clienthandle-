import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateFollowup, checkRateLimit, type MessageContext, type Tone, type MessageType } from '@/lib/ai'
import { mockClientsService, mockInvoicesService, mockMessagesService, mockAIService, MOCK_MODE } from '@/lib/mock-data'
import { checkUsageLimit, incrementUsage, getUpgradeSuggestion } from '@/lib/usage-limits'
import { z } from 'zod'

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

// Request validation schema
const ComposeRequestSchema = z.object({
  type: z.enum(['followup', 'reminder', 'update']),
  tone: z.enum(['friendly', 'professional', 'firm']),
  clientId: z.string(),
  invoiceId: z.string().optional(),
  customContext: z.string().optional(),
})

// Mock compose handler
async function handleMockCompose(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Received request body:', body)
    const { type, tone, clientId, invoiceId, customContext } = ComposeRequestSchema.parse(body)
    console.log('✅ Parsed request:', { type, tone, clientId, invoiceId, customContext })

    // Get mock client
    console.log('🔍 Looking for mock client with ID:', clientId)
    const allMockClients = await mockClientsService.list('mock-user-1')
    console.log('📋 Available mock clients:', allMockClients.map(c => ({ id: c.id, name: c.name })))
    
    const client = await mockClientsService.get(clientId, 'mock-user-1')
    console.log('🎯 Found client:', client)
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get mock invoice if provided
    let invoice = null
    if (invoiceId) {
      const invoices = await mockInvoicesService.getByClient(clientId, 'mock-user-1')
      invoice = invoices.find(inv => inv.id === invoiceId)
    }

    // Build context for AI generation
    const context = {
      clientName: client.name,
      customContext,
      ...(invoice && {
        invoiceNumber: invoice.number,
        amount: (invoice.amount_cents / 100).toFixed(2),
        currency: invoice.currency,
        dueDate: invoice.due_date,
        daysPastDue: invoice.status !== 'paid' && invoice.due_date ? 
          Math.max(0, Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 
          undefined
      })
    }

    // Generate mock AI message
    const result = await mockAIService.generateFollowup(type, tone, context)

    // Save to mock storage
    const messageId = await mockMessagesService.create({
      owner_uid: 'mock-user-1',
      client_id: clientId,
      type,
      tone,
      channel: 'email',
      body: result.message,
      redacted_body: result.redactedContext,
      related_invoice_id: invoiceId || null,
      status: 'draft'
    })

    return NextResponse.json({
      success: true,
      subject: result.subject,
      message: result.message,
      provider: result.provider,
      messageId,
      context: {
        clientName: client.name,
        invoiceNumber: invoice?.number,
        amount: context.amount,
        currency: context.currency,
        daysPastDue: context.daysPastDue
      }
    })

  } catch (error) {
    console.error('Mock AI compose error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Mock mode handling
    if (MOCK_MODE) {
      console.log('🎭 Using mock mode for AI compose');
      return handleMockCompose(request);
    }

    console.log('🗄️ Using real database mode for AI compose');

    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient()

    // Get authenticated user with detailed debugging
    console.log('🔐 Attempting authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 Auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message,
      mockModeEnabled: MOCK_MODE 
    })
    
    if (authError || !user) {
      console.log('❌ Auth failed - using fallback strategy')
      
      // Always try mock mode fallback first
      if (MOCK_MODE) {
        console.log('📡 Using mock mode fallback')
        return handleMockCompose(request);
      } else {
        console.log('🚫 Mock mode disabled, returning auth error')
        // If mock mode disabled, return auth error
        return NextResponse.json(
          { 
            error: 'Authentication required. Please sign in to use AI features.',
            authRequired: true 
          },
          { status: 401 }
        )
      }
    }

    console.log('✅ Authentication successful, proceeding with real user flow')

    // Check usage limits before proceeding
    console.log('📊 Checking AI message usage limits...');
    const usageCheck = await checkUsageLimit(user.id, 'ai_messages', 1);
    
    if (!usageCheck.allowed) {
      const { data: userPlan } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single();
      
      const currentPlan = userPlan?.plan || 'free';
      const upgradeMessage = getUpgradeSuggestion(currentPlan, 'ai_messages');
      
      console.log('❌ Usage limit exceeded:', usageCheck.reason);
      return NextResponse.json(
        { 
          error: 'AI message limit reached',
          details: usageCheck.reason,
          current_usage: usageCheck.currentUsage,
          limit: usageCheck.limit,
          upgrade_message: upgradeMessage,
          upgrade_required: true
        },
        { status: 429 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(user.id, 30, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    console.log('📩 Received request body (real mode):', body)
    const { type, tone, clientId, invoiceId, customContext } = ComposeRequestSchema.parse(body)
    console.log('✅ Parsed request (real mode):', { type, tone, clientId, invoiceId, customContext })

    // Fetch client data and business profile in parallel
    const [clientResult, businessResult] = await Promise.all([
      supabase
        .from('clients')
        .select('name, email, company')
        .eq('id', clientId)
        .eq('owner_uid', user.id)
        .single(),
      
      supabase
        .from('users')
        .select(`
          business_name, service_description as what_you_do, business_details, 
          target_clients, value_proposition, communication_style
        `)
        .eq('id', user.id)
        .single()
    ])

    const { data: client, error: clientError } = clientResult
    const { data: businessProfile } = businessResult

    console.log('🔍 Client lookup result:', { 
      clientId, 
      found: !!client, 
      client: client ? { id: client.id, name: client.name } : null,
      error: clientError?.message 
    });

    if (clientError || !client) {
      console.log('❌ Client not found or error occurred');
      return NextResponse.json(
        { error: 'Client not found', details: clientError?.message },
        { status: 404 }
      )
    }

    // Fetch invoice data if provided
    let invoice = null
    if (invoiceId) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('number, amount_cents, currency, due_date, status')
        .eq('id', invoiceId)
        .eq('owner_uid', user.id)
        .single()

      if (invoiceError) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }
      invoice = invoiceData
    }

    // Fetch recent messages to this client for variation
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('body, subject, created_at')
      .eq('client_id', clientId)
      .eq('owner_uid', user.id)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(3)

    // Build enhanced message context with business intelligence
    const context: MessageContext = {
      clientName: client.name,
      customContext,
      lastContactDate: recentMessages?.[0]?.created_at,
      // Add business profile for AI context
      businessProfile: businessProfile || undefined,
      // Add recent messages for variation context
      ...(recentMessages && recentMessages.length > 0 && {
        projectDetails: `Previous ${recentMessages.length} messages: ${recentMessages.map(m => m.body?.slice(0, 50) + '...').join('; ')}`
      })
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
    const result = await generateFollowup(
      type as MessageType,
      tone as Tone,
      context
    )

    // Save message to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        owner_uid: user.id,
        client_id: clientId,
        type,
        tone,
        channel: 'email',
        body: result.message,
        redacted_body: result.redactedContext,
        related_invoice_id: invoiceId || null,
        status: 'draft'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save message:', saveError)
      // Still return the generated message even if save fails
    }

    // Increment usage counter after successful generation
    console.log('📈 Incrementing AI message usage...');
    const incrementResult = await incrementUsage(user.id, 'ai_messages', 1);
    if (!incrementResult) {
      console.warn('Failed to increment usage counter, but continuing...');
    }

    return NextResponse.json({
      success: true,
      subject: result.subject,
      message: result.message,
      provider: result.provider,
      messageId: savedMessage?.id,
      context: {
        clientName: client.name,
        invoiceNumber: invoice?.number,
        amount: context.amount,
        currency: context.currency,
        daysPastDue: context.daysPastDue
      }
    })

  } catch (error) {
    console.error('AI compose error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      // Handle specific AI provider errors
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'AI service not configured. Please contact support.',
            fallbackAvailable: MOCK_MODE 
          },
          { status: 503 }
        )
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'AI service temporarily unavailable. Please try again later.',
            fallbackAvailable: MOCK_MODE 
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate message', 
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackAvailable: MOCK_MODE 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch message templates/history
export async function GET(request: NextRequest) {
  try {
    // Create server-side Supabase client
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)

    // Fetch recent messages for context
    let query = supabase
      .from('messages')
      .select(`
        id,
        type,
        tone,
        body,
        created_at,
        status,
        clients!inner(name, email)
      `)
      .eq('owner_uid', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Failed to fetch messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    })

  } catch (error) {
    console.error('GET messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
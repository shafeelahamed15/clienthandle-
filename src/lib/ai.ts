import OpenAI from 'openai'
import { z } from 'zod'

// Validation schemas
const ToneSchema = z.enum(['friendly', 'professional', 'firm'])
const MessageTypeSchema = z.enum(['followup', 'reminder', 'update'])

export type Tone = z.infer<typeof ToneSchema>
export type MessageType = z.infer<typeof MessageTypeSchema>

// PII Redaction utilities
export function redactPII(text: string): string {
  // Replace emails
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '{{EMAIL}}')
  
  // Replace phone numbers (various formats)
  text = text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '{{PHONE}}')
  
  // Replace URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '{{URL}}')
  
  // Replace credit card numbers
  text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '{{CARD_NUMBER}}')
  
  return text
}

// AI Client initialization
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Reply-focused AI prompts - Enhanced for Smart Campaigns
const SYSTEM_PROMPTS = {
  friendly: `You are an expert at writing value-first, genuine follow-up emails that clients actually want to read.

Write helpful messages (under 90 words) that provide VALUE before any business discussion:

VALUE-FIRST APPROACH:
- Lead with a genuine insight, tip, or observation relevant to their business/industry
- Use your business intelligence to share something actually useful
- Reference their specific situation with helpful context
- Ask thoughtful questions about their challenges or goals
- Offer assistance or resources without expecting anything back
- Make them think "this person actually cares about my success"

ANTI-SPAM PRINCIPLES:
- NEVER start with "just checking in" or generic follow-up language
- ALWAYS provide value before mentioning business/payment
- Focus on their success, not your needs
- Be genuinely helpful, not transactionally pushy
- Make them want to engage because you're valuable to know

PERSONALIZATION STRATEGY:
- Use business intelligence to understand their world
- Reference industry trends or challenges they likely face
- Connect your expertise to problems they actually have
- Make observations that show you understand their business

GOAL: Build trust and genuine relationship. They should think "this person gets it" and want to reply.

Use variables: {{CLIENT_NAME}}, {{INVOICE_NUMBER}}, {{DUE_DATE}}.
CRITICAL: Each message must provide different value. Vary your insights and helpful approaches.

IMPORTANT: Return your response as a JSON object with "subject" and "body" fields. Create a subject line that promises value, not pressure. The body should lead with genuine help.`,

  professional: `You are a strategic business advisor who creates valuable professional communications.

Write intelligent messages (under 90 words) that demonstrate strategic thinking and provide business value:

STRATEGIC VALUE APPROACH:
- Lead with industry insights or business observations that matter to them
- Share strategic perspectives based on your business intelligence
- Reference market trends or opportunities relevant to their situation
- Ask strategic questions about their business direction or challenges
- Position insights that could impact their success or decision-making
- Demonstrate thought leadership without being self-promotional

EXECUTIVE-LEVEL INTELLIGENCE:
- Use business context to understand their strategic priorities
- Reference challenges executives in their industry typically face
- Connect your expertise to broader business outcomes they care about
- Ask questions that show you understand the bigger picture
- Share observations that could influence their planning

ANTI-SALES APPROACH:
- Focus on their strategic success, not your services
- Provide insights they can act on immediately
- Make them see you as a valuable strategic connection
- Avoid any transactional or sales-focused language
- Build credibility through intelligent business observations

GOAL: Position yourself as a valuable strategic thinker they want to stay connected with.

Use variables: {{CLIENT_NAME}}, {{INVOICE_NUMBER}}, {{DUE_DATE}}.
CRITICAL: Each message must offer different strategic value. Vary your business insights and strategic perspectives.

IMPORTANT: Return your response as a JSON object with "subject" and "body" fields. Create a subject line that suggests strategic value or important business intelligence. The body should lead with valuable insights.`,

  firm: `You are a respectful but direct business communicator who creates value-driven urgent messages.

Write decisive messages (under 90 words) that provide value while creating appropriate urgency:

VALUE-DRIVEN URGENCY:
- Lead with time-sensitive insights or opportunities relevant to their business
- Share urgent industry information or deadlines that affect them
- Reference business impacts of timing on their success
- Connect your expertise to time-sensitive decisions they need to make
- Offer valuable solutions that require prompt action
- Position urgency around their business needs, not just your timeline

RESPECTFUL DIRECTNESS:
- Use business intelligence to understand what urgency means to them
- Reference their business priorities that have time constraints
- Connect delays to business consequences they care about
- Offer clear, valuable next steps that benefit their timeline
- Make immediate action feel smart and strategic

INTELLIGENT PRESSURE:
- Focus on business opportunities that have deadlines
- Reference industry timing or seasonal factors affecting their success
- Connect to competitive advantages or market windows
- Make urgency about their strategic positioning, not payment

GOAL: Create urgency around business value and opportunities, not just administrative needs.

Use variables: {{CLIENT_NAME}}, {{INVOICE_NUMBER}}, {{DUE_DATE}}.
CRITICAL: Each message must create different value-based urgency. Vary your business reasoning and timing logic.

IMPORTANT: Return your response as a JSON object with "subject" and "body" fields. Create a subject line that suggests time-sensitive business value. The body should lead with urgent business insights.`
}

// Enhanced business context for AI
export interface BusinessProfile {
  business_name?: string
  what_you_do?: string  // Simple one-line description
  business_details?: string  // Detailed description for AI context
  target_clients?: string  // Who they serve
  value_proposition?: string  // Key problems they solve
  communication_style?: string
}

// Message context interface
export interface MessageContext {
  clientName: string
  invoiceNumber?: string
  dueDate?: string
  amount?: string
  currency?: string
  paymentLink?: string
  lastContactDate?: string
  daysPastDue?: number
  projectDetails?: string
  customContext?: string
  businessProfile?: BusinessProfile
  variationContext?: string  // For ensuring message variety
  campaignCount?: number     // How many messages in this campaign so far
}

// Generate follow-up message using OpenAI
export async function generateFollowupOpenAI(
  type: MessageType,
  tone: Tone,
  context: MessageContext
): Promise<{ subject: string; body: string }> {
  const openai = getOpenAI()
  
  // Create user prompt with context
  const userPrompt = createUserPrompt(type, context)
  const redactedPrompt = redactPII(userPrompt)
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[tone] },
        { role: 'user', content: redactedPrompt }
      ],
      max_tokens: 150, // Reduced from 200 for faster generation
      temperature: context.campaignCount && context.campaignCount > 1 ? 0.9 : 0.7, // Higher creativity for recurring campaigns
      response_format: { type: 'json_object' },
      // Performance optimizations
      timeout: 10000, // 10 second timeout
      stream: false // Ensure non-streaming for consistent performance
    })

    const message = completion.choices[0]?.message?.content
    if (!message) {
      throw new Error('No message generated from OpenAI')
    }

    // Clean and sanitize the message content
    const cleanMessage = message.trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\uFFF0-\uFFFF]/g, '') // Remove specials
      .normalize('NFC') // Normalize unicode

    // Parse the JSON response
    let parsed: { subject?: string; body?: string }
    try {
      parsed = JSON.parse(cleanMessage)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.error('Raw message:', message)
      console.error('Cleaned message:', cleanMessage)
      throw new Error('AI response was not valid JSON')
    }

    if (!parsed.subject || !parsed.body) {
      throw new Error('AI response missing required subject or body fields')
    }

    return {
      subject: parsed.subject.trim(),
      body: parsed.body.trim()
    }
  } catch (error) {
    console.error('OpenAI generation error:', error)
    throw new Error('Failed to generate message with OpenAI')
  }
}


// Create contextual user prompt with business intelligence
function createUserPrompt(type: MessageType, context: MessageContext): string {
  const { 
    clientName, invoiceNumber, dueDate, amount, currency, daysPastDue, 
    projectDetails, customContext, businessProfile, variationContext, campaignCount 
  } = context
  
  let prompt = `Write a ${type} message for:\n`
  prompt += `Client: ${clientName}\n`
  
  // Add enhanced business context for intelligent AI
  if (businessProfile) {
    prompt += `\n=== BUSINESS INTELLIGENCE ===\n`
    if (businessProfile.business_name) {
      prompt += `From: ${businessProfile.business_name}\n`
    }
    if (businessProfile.what_you_do) {
      prompt += `Services: ${businessProfile.what_you_do}\n`
    }
    if (businessProfile.business_details) {
      prompt += `Expertise: ${businessProfile.business_details}\n`
    }
    if (businessProfile.target_clients) {
      prompt += `Typical Clients: ${businessProfile.target_clients}\n`
    }
    if (businessProfile.value_proposition) {
      prompt += `Value I Provide: ${businessProfile.value_proposition}\n`
    }
    prompt += `Communication Style: ${businessProfile.communication_style || 'professional'}\n`
    prompt += `\nINTELLIGENT APPROACH: Use this business intelligence to provide genuine VALUE first. Share relevant insights, tips, or observations that would actually help this type of client. Then naturally transition to the business relationship. Focus on being helpful, not sales-y.\n`
  }
  
  // Add transaction details
  if (invoiceNumber) {
    prompt += `Invoice: ${invoiceNumber}\n`
  }
  
  if (amount && currency) {
    prompt += `Amount: ${currency} ${amount}\n`
  }
  
  if (dueDate) {
    prompt += `Due date: ${dueDate}\n`
  }
  
  if (daysPastDue && daysPastDue > 0) {
    prompt += `Days past due: ${daysPastDue}\n`
  }
  
  if (projectDetails) {
    prompt += `Project: ${projectDetails}\n`
  }

  // Add personal context for personalization
  if (customContext && customContext !== 'Professional follow-up message') {
    prompt += `\nPersonal Context: ${customContext}\n`
    prompt += `IMPORTANT: Use the above personal context to make this message more personalized and relevant to the client's specific situation, preferences, or recent interactions.\n`
  }

  // Add intelligent variation context
  if (variationContext) {
    prompt += `\nVariation Context: ${variationContext}\n`
    prompt += `CRITICAL VARIATION REQUIREMENT: This message must be completely different from any previous ones. Use different wording, structure, opening styles, and engagement techniques. Avoid repeating phrases, patterns, or approaches.\n`
  }

  // Add campaign progression context
  if (campaignCount && campaignCount > 1) {
    prompt += `\nCampaign Message #${campaignCount}: This is message ${campaignCount} in an ongoing campaign. Each message should feel fresh and use different psychological triggers, angles, and styles while maintaining consistent tone and context.\n`
  }

  // Add message history for variation (legacy support)
  if (projectDetails && projectDetails.includes('Previous')) {
    prompt += `\nMessage History: ${projectDetails}\n`
    prompt += `CRITICAL: Create a completely different message from the previous ones shown above. Use different wording, structure, and approach while maintaining the same personal context and tone. Avoid repeating phrases or similar opening/closing lines.\n`
  }

  // Add type-specific instructions focused on replies
  switch (type) {
    case 'followup':
      prompt += '\nThis is a follow-up to reconnect with the client. Make them want to respond.'
      break
    case 'reminder':
      prompt += '\nThis is a payment reminder. Be polite but create urgency that gets a response.'
      break
    case 'update':
      prompt += '\nThis is a project update. Share something interesting that invites their feedback.'
      break
  }

  // Add reply-focused instruction with variation emphasis
  prompt += `\n\nCRITICAL INSTRUCTIONS:
1. UNIQUENESS: Make this message completely different from any previous ones - use different sentence structures, opening styles, psychological triggers, and closing approaches
2. ENGAGEMENT: Create curiosity, ask compelling questions, or hint at value - never use generic "checking in" language
3. VARIETY: If this is message ${campaignCount || 1} in a series, ensure it uses a different creative approach than previous messages
4. PERSONALITY: Reflect the client's context and your business profile naturally without over-explaining
5. PRIMARY GOAL: GET A RESPONSE by making them genuinely want to reply

CREATIVE APPROACHES TO ROTATE:
- Curiosity gaps ("I noticed something interesting about...")
- Strategic questions ("Quick question about your...")
- Value insights ("This might be relevant to your...")
- Progress updates that need input ("We're at the point where...")
- Gentle urgency ("Heads up, there's a...")
- Easy outs ("No worries if timing isn't right, but...")

Choose a DIFFERENT approach each time to keep messages fresh and engaging.`

  return prompt
}

// Main generation function - OpenAI only
export async function generateFollowup(
  type: MessageType,
  tone: Tone,
  context: MessageContext
): Promise<{ subject: string; message: string; provider: string; redactedContext: string }> {
  // Validate inputs
  ToneSchema.parse(tone)
  MessageTypeSchema.parse(type)

  const redactedContext = redactPII(JSON.stringify(context))

  try {
    const result = await generateFollowupOpenAI(type, tone, context)
    
    return {
      subject: result.subject,
      message: result.body,
      provider: 'openai',
      redactedContext
    }
  } catch (error) {
    console.error('OpenAI generation failed:', error)
    throw new Error('Failed to generate follow-up message')
  }
}

// Template variable replacement
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key.toUpperCase()}}}`
    result = result.replace(new RegExp(placeholder, 'g'), value || '')
  })
  
  return result
}

// Rate limiting helper
const rateLimits = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(userId: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimits.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

// Phase 2: AI Angle System
export type AngleInput = {
  clientName: string;
  company?: string;
  lastTopic?: string;
  invoiceNumber?: string;
  dueDateISO?: string;
  lastContactAtISO?: string;
  preferredTone?: 'friendly' | 'professional' | 'firm' | 'helpful_service';
  disallowedAngles?: string[];
  desiredAngle?: 'forgot_to_add' | 'resource' | 'next_step_question' | 'benefit_framing' | 'deadline_or_capacity' | 'easy_out';
};

export const FOLLOWUP_ANGLE_SYSTEM_PROMPT = `
You write concise, human follow-ups (< ~80 words). Avoid "just checking in".
Angles (rotate; no back-to-back repeats):
1) forgot_to_add (one helpful detail)
2) resource (tiny case study/tip, no fake links)
3) next_step_question (ask one specific next step)
4) benefit_framing ("in case this got buried…" and why it helps them)
5) deadline_or_capacity (honest urgency/capacity)
6) easy_out ("if now's not right, no worries—let me know")
Tones: friendly | professional | firm | helpful_service (empathetic).
Personalize with CLIENT_NAME, COMPANY, LAST_TOPIC, INVOICE_NUMBER, DUE_DATE, LAST_CONTACT_AT if given.
Return strict JSON: { "angle": "...", "subject": "...", "body": "..." }.
`;

export const buildFollowupAngleUserPrompt = (i: AngleInput) => `
Client: ${i.clientName}${i.company ? ` (${i.company})` : ''}
Context: ${i.lastTopic || 'N/A'}
Invoice: ${i.invoiceNumber || 'N/A'} Due: ${i.dueDateISO || 'N/A'}
Last contact: ${i.lastContactAtISO || 'unknown'}
Tone: ${i.preferredTone || 'helpful_service'}
${i.desiredAngle ? `Requested angle: ${i.desiredAngle}` : ''}
Avoid angles: ${i.disallowedAngles?.join(', ') || 'none'}
`;

// Generate angle-based followup using OpenAI
export async function generateFollowupAngle(input: AngleInput): Promise<{
  angle: string;
  subject?: string;
  body: string;
}> {
  const openai = getOpenAI();

  const messages = [
    { role: 'system', content: FOLLOWUP_ANGLE_SYSTEM_PROMPT },
    { role: 'user', content: buildFollowupAngleUserPrompt(input) }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as Array<{ role: 'system' | 'user'; content: string }>,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      max_tokens: 120, // Reduced for faster generation
      timeout: 8000 // 8 second timeout
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let parsed: { angle?: string; subject?: string; body?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Invalid JSON response from AI');
    }

    if (!parsed.angle || !parsed.body) {
      throw new Error('Missing required fields in AI response');
    }

    // Truncate if too long
    if (parsed.body.length > 700) {
      parsed.body = parsed.body.slice(0, 700);
    }

    return {
      angle: parsed.angle,
      subject: parsed.subject || '',
      body: parsed.body
    };
  } catch (error) {
    console.error('OpenAI angle generation error:', error);
    throw new Error('Failed to generate followup angle');
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const FeedbackSchema = z.object({
  type: z.enum(['feature', 'bug', 'general', 'praise']),
  rating: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  email: z.string().email().optional().or(z.literal('')),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  page: z.string().optional(),
});

/**
 * POST /api/feedback
 * Submit user feedback for the application
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💬 POST /api/feedback - Receiving user feedback');
    
    // Parse and validate request
    const rawData = await request.json();
    const validatedData = FeedbackSchema.parse(rawData);
    
    // Get user info (optional - feedback can be anonymous)
    let userId = null;
    let userEmail = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch {
      // Continue without user info - allow anonymous feedback
    }

    // Prepare feedback data
    const feedbackData = {
      id: crypto.randomUUID(),
      user_id: userId,
      user_email: userEmail || validatedData.email || null,
      type: validatedData.type,
      rating: validatedData.rating ? parseInt(validatedData.rating) : null,
      message: validatedData.message,
      page: validatedData.page,
      user_agent: validatedData.userAgent,
      ip_address: getClientIP(request),
      created_at: validatedData.timestamp,
      status: 'new' as const,
    };

    console.log('📝 Feedback data:', {
      type: feedbackData.type,
      rating: feedbackData.rating,
      hasUser: !!feedbackData.user_id,
      page: feedbackData.page
    });

    // For MVP, we'll store feedback in a simple way
    // In production, you'd want to store this in your database
    await storeFeedback(feedbackData);

    console.log('✅ Feedback stored successfully');

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedbackData.id,
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.log('❌ Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.errors },
        { status: 400 }
      );
    }

    const err = error as Error;
    console.error('❌ Error processing feedback:', {
      error,
      message: err.message,
    });

    return NextResponse.json(
      {
        error: 'Failed to process feedback',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Get feedback for admin review (future feature)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (for future implementation)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For MVP, return a simple response
    return NextResponse.json({
      message: 'Feedback admin panel coming soon!',
      totalFeedback: await getFeedbackCount(),
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * Store feedback (simple file-based storage for MVP)
 */
async function storeFeedback(feedback: Record<string, unknown>): Promise<void> {
  // For MVP development, log to console
  console.log('\n🎯 NEW FEEDBACK RECEIVED:');
  console.log('=======================');
  console.log(`Type: ${feedback.type}`);
  console.log(`Rating: ${feedback.rating || 'Not provided'}`);
  console.log(`User: ${feedback.user_email || 'Anonymous'}`);
  console.log(`Page: ${feedback.page || 'Unknown'}`);
  console.log(`Message: ${feedback.message}`);
  console.log(`Timestamp: ${feedback.created_at}`);
  console.log('=======================\n');

  // In production, you would:
  // 1. Store in database (Supabase table)
  // 2. Send to analytics service
  // 3. Notify team via Slack/email
  // 4. Store in external service like Typeform, Airtable, etc.
  
  // For now, we'll simulate successful storage
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Get feedback count (placeholder for future feature)
 */
async function getFeedbackCount(): Promise<number> {
  // In production, query your feedback database
  return 0;
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
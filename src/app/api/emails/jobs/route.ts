import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { emailJobService, reminderScheduler } from '@/lib/email/scheduler';
import { z } from 'zod';

// Request validation schemas
const CreateJobSchema = z.object({
  type: z.enum(['payment_reminder', 'follow_up', 'check_in']),
  invoice_id: z.string().optional(),
  client_id: z.string().optional(),
  template_id: z.string().optional(), // Optional for payment reminders (auto-selected from strategy)
  days_from_now: z.number().min(0).max(365).default(7),
  strategy_id: z.string().default('gentle-3-7-14')
});

// GET /api/emails/jobs - List email jobs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const jobs = await emailJobService.listJobs(user.id, limit);

    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length
    });

  } catch (error) {
    console.error('Failed to list email jobs:', error);
    return NextResponse.json(
      { error: 'Failed to list email jobs' },
      { status: 500 }
    );
  }
}

// POST /api/emails/jobs - Create new email job
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, invoice_id, client_id, template_id, days_from_now, strategy_id } = CreateJobSchema.parse(body);

    let jobs;

    switch (type) {
      case 'payment_reminder':
        if (!invoice_id) {
          return NextResponse.json(
            { error: 'invoice_id is required for payment reminders' },
            { status: 400 }
          );
        }
        jobs = await reminderScheduler.schedulePaymentReminders(invoice_id, user.id, strategy_id);
        break;

      case 'follow_up':
      case 'check_in':
        if (!client_id) {
          return NextResponse.json(
            { error: 'client_id is required for follow-ups' },
            { status: 400 }
          );
        }
        const followUpTemplateId = template_id || 'followup-check-in';
        const job = await reminderScheduler.scheduleFollowUp(client_id, user.id, days_from_now, followUpTemplateId);
        jobs = [job];
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid job type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      jobs,
      message: `Scheduled ${jobs.length} email${jobs.length > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('Failed to create email job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create email job' },
      { status: 500 }
    );
  }
}
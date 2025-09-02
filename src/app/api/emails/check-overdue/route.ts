import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reminderScheduler } from '@/lib/email/scheduler';

// POST /api/emails/check-overdue - Check for overdue invoices and schedule reminders
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🔍 Checking overdue invoices for user ${user.id}...`);
    
    await reminderScheduler.checkOverdueInvoices(user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Overdue invoice check completed'
    });

  } catch (error) {
    console.error('Failed to check overdue invoices:', error);
    return NextResponse.json(
      { error: 'Failed to check overdue invoices' },
      { status: 500 }
    );
  }
}

// GET /api/emails/check-overdue - Manual trigger for checking overdue invoices
export async function GET(request: NextRequest) {
  try {
    // For manual testing - normally this would be called by a cron job
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🔍 Manual check for overdue invoices for user ${user.id}...`);
    
    await reminderScheduler.checkOverdueInvoices(user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Manual overdue invoice check completed'
    });

  } catch (error) {
    console.error('Manual overdue check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check overdue invoices' },
      { status: 500 }
    );
  }
}
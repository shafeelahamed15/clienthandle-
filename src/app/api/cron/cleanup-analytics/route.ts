import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job call
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧹 Starting analytics cleanup cron job...')
    
    const supabase = createClient()
    const now = new Date()
    
    // Define cleanup periods
    const cleanupPeriods = {
      old_analytics: 90, // Keep analytics for 90 days
      old_failed_messages: 30, // Keep failed messages for 30 days
      old_cancelled_followups: 7, // Keep cancelled followups for 7 days
      old_sent_followups: 30 // Keep sent followups for 30 days
    }

    const results: any = {
      timestamp: now.toISOString(),
      cleaned: {},
      errors: []
    }

    // 1. Clean old email analytics
    try {
      const analyticsDate = new Date()
      analyticsDate.setDate(analyticsDate.getDate() - cleanupPeriods.old_analytics)

      const { count: analyticsCount, error: analyticsError } = await supabase
        .from('email_analytics')
        .delete()
        .lt('created_at', analyticsDate.toISOString())

      if (analyticsError) {
        console.error('Failed to clean analytics:', analyticsError)
        results.errors.push({ type: 'analytics', error: analyticsError.message })
      } else {
        results.cleaned.old_analytics = analyticsCount || 0
        console.log(`🗑️ Cleaned ${analyticsCount || 0} old analytics records`)
      }
    } catch (error) {
      console.error('Analytics cleanup error:', error)
      results.errors.push({ type: 'analytics', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // 2. Clean old failed messages
    try {
      const failedDate = new Date()
      failedDate.setDate(failedDate.getDate() - cleanupPeriods.old_failed_messages)

      const { count: failedCount, error: failedError } = await supabase
        .from('messages')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', failedDate.toISOString())

      if (failedError) {
        console.error('Failed to clean failed messages:', failedError)
        results.errors.push({ type: 'failed_messages', error: failedError.message })
      } else {
        results.cleaned.old_failed_messages = failedCount || 0
        console.log(`🗑️ Cleaned ${failedCount || 0} old failed messages`)
      }
    } catch (error) {
      console.error('Failed messages cleanup error:', error)
      results.errors.push({ type: 'failed_messages', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // 3. Clean old cancelled followups
    try {
      const cancelledDate = new Date()
      cancelledDate.setDate(cancelledDate.getDate() - cleanupPeriods.old_cancelled_followups)

      const { count: cancelledCount, error: cancelledError } = await supabase
        .from('followup_queue')
        .delete()
        .eq('status', 'cancelled')
        .lt('created_at', cancelledDate.toISOString())

      if (cancelledError) {
        console.error('Failed to clean cancelled followups:', cancelledError)
        results.errors.push({ type: 'cancelled_followups', error: cancelledError.message })
      } else {
        results.cleaned.old_cancelled_followups = cancelledCount || 0
        console.log(`🗑️ Cleaned ${cancelledCount || 0} old cancelled followups`)
      }
    } catch (error) {
      console.error('Cancelled followups cleanup error:', error)
      results.errors.push({ type: 'cancelled_followups', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // 4. Clean old sent followups (keep recent ones for analytics)
    try {
      const sentDate = new Date()
      sentDate.setDate(sentDate.getDate() - cleanupPeriods.old_sent_followups)

      const { count: sentCount, error: sentError } = await supabase
        .from('followup_queue')
        .delete()
        .eq('status', 'sent')
        .lt('sent_at', sentDate.toISOString())

      if (sentError) {
        console.error('Failed to clean sent followups:', sentError)
        results.errors.push({ type: 'sent_followups', error: sentError.message })
      } else {
        results.cleaned.old_sent_followups = sentCount || 0
        console.log(`🗑️ Cleaned ${sentCount || 0} old sent followups`)
      }
    } catch (error) {
      console.error('Sent followups cleanup error:', error)
      results.errors.push({ type: 'sent_followups', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // 5. Update database statistics (optional - PostgreSQL specific)
    try {
      // This would run ANALYZE on cleaned tables to update query planner stats
      // In Supabase, this might not be necessary as it's managed
      console.log('📊 Database cleanup completed')
    } catch (error) {
      console.error('Database stats update error:', error)
    }

    const totalCleaned = Object.values(results.cleaned).reduce((sum: number, count: any) => sum + (count || 0), 0)

    console.log(`✅ Cleanup completed: ${totalCleaned} records cleaned, ${results.errors.length} errors`)

    return NextResponse.json({
      success: true,
      ...results,
      summary: {
        total_cleaned: totalCleaned,
        error_count: results.errors.length,
        cleanup_periods: cleanupPeriods
      }
    })

  } catch (error) {
    console.error('Analytics cleanup cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Manual cleanup endpoint
export async function POST(request: NextRequest) {
  try {
    const { cleanup_type, days_old } = await request.json()

    if (!cleanup_type || !days_old) {
      return NextResponse.json({ error: 'Missing cleanup_type or days_old' }, { status: 400 })
    }

    const supabase = createClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days_old)

    let result = null

    switch (cleanup_type) {
      case 'analytics':
        result = await supabase
          .from('email_analytics')
          .delete()
          .lt('created_at', cutoffDate.toISOString())
        break

      case 'failed_messages':
        result = await supabase
          .from('messages')
          .delete()
          .eq('status', 'failed')
          .lt('created_at', cutoffDate.toISOString())
        break

      case 'cancelled_followups':
        result = await supabase
          .from('followup_queue')
          .delete()
          .eq('status', 'cancelled')
          .lt('created_at', cutoffDate.toISOString())
        break

      default:
        return NextResponse.json({ error: 'Invalid cleanup_type' }, { status: 400 })
    }

    if (result?.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cleanup_type,
      days_old,
      records_cleaned: result?.count || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual cleanup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
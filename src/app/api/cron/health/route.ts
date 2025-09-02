import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const now = new Date()
    
    // Check various system health indicators
    const health = {
      timestamp: now.toISOString(),
      status: 'healthy',
      checks: {
        database: { status: 'unknown', details: null },
        email_service: { status: 'unknown', details: null },
        followup_queue: { status: 'unknown', details: null },
        recent_activity: { status: 'unknown', details: null }
      },
      stats: {
        pending_followups: 0,
        recent_emails: 0,
        active_clients: 0,
        error_rate: 0
      }
    }

    // 1. Database connectivity check
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .limit(1)

      if (error) {
        health.checks.database = { 
          status: 'error', 
          details: error.message 
        }
        health.status = 'degraded'
      } else {
        health.checks.database = { 
          status: 'healthy', 
          details: 'Connected' 
        }
      }
    } catch (error) {
      health.checks.database = { 
        status: 'error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      health.status = 'degraded'
    }

    // 2. Email service health (check if configured)
    try {
      const resendConfigured = !!process.env.RESEND_API_KEY
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
      
      if (resendConfigured || smtpConfigured) {
        health.checks.email_service = {
          status: 'healthy',
          details: {
            resend: resendConfigured,
            smtp: smtpConfigured
          }
        }
      } else {
        health.checks.email_service = {
          status: 'warning',
          details: 'No email service configured'
        }
      }
    } catch (error) {
      health.checks.email_service = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 3. Check followup queue health
    try {
      const { data: queueStats, error: queueError } = await supabase
        .rpc('get_queue_stats') // This would be a custom PostgreSQL function
        .single()

      if (queueError) {
        // Fallback: manual queue check
        const { data: pendingFollowups } = await supabase
          .from('followup_queue')
          .select('id, status')
          .eq('status', 'queued')

        const { data: failedFollowups } = await supabase
          .from('followup_queue')
          .select('id')
          .eq('status', 'failed')

        health.stats.pending_followups = pendingFollowups?.length || 0
        const failedCount = failedFollowups?.length || 0

        if (failedCount > health.stats.pending_followups * 0.1) { // More than 10% failure rate
          health.checks.followup_queue = {
            status: 'warning',
            details: `High failure rate: ${failedCount} failed, ${health.stats.pending_followups} pending`
          }
          health.status = 'degraded'
        } else {
          health.checks.followup_queue = {
            status: 'healthy',
            details: `${health.stats.pending_followups} pending, ${failedCount} failed`
          }
        }
      } else {
        health.checks.followup_queue = {
          status: 'healthy',
          details: queueStats
        }
        health.stats.pending_followups = queueStats?.pending || 0
      }
    } catch (error) {
      health.checks.followup_queue = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      health.status = 'degraded'
    }

    // 4. Check recent activity (last 24 hours)
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: recentEmails } = await supabase
        .from('email_analytics')
        .select('id, event_type')
        .gte('created_at', yesterday.toISOString())

      const { data: activeClients } = await supabase
        .from('clients')
        .select('id')
        .not('unsubscribed', 'eq', true)
        .not('followups_paused', 'eq', true)

      health.stats.recent_emails = recentEmails?.length || 0
      health.stats.active_clients = activeClients?.length || 0

      // Calculate error rate from recent emails
      if (recentEmails && recentEmails.length > 0) {
        const errors = recentEmails.filter(e => e.event_type === 'bounced' || e.event_type === 'complained')
        health.stats.error_rate = (errors.length / recentEmails.length * 100)
      }

      if (health.stats.error_rate > 10) { // More than 10% error rate
        health.checks.recent_activity = {
          status: 'warning',
          details: `High error rate: ${health.stats.error_rate.toFixed(2)}%`
        }
        health.status = 'degraded'
      } else {
        health.checks.recent_activity = {
          status: 'healthy',
          details: `${health.stats.recent_emails} emails, ${health.stats.error_rate.toFixed(2)}% error rate`
        }
      }
    } catch (error) {
      health.checks.recent_activity = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      health.status = 'degraded'
    }

    // 5. Additional system checks
    const systemInfo = {
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown'
    }

    // Determine overall health status
    const errorChecks = Object.values(health.checks).filter(check => check.status === 'error')
    const warningChecks = Object.values(health.checks).filter(check => check.status === 'warning')

    if (errorChecks.length > 0) {
      health.status = 'unhealthy'
    } else if (warningChecks.length > 0 && health.status !== 'degraded') {
      health.status = 'degraded'
    }

    const httpStatus = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503

    return NextResponse.json({
      ...health,
      system: systemInfo,
      cron_jobs: {
        process_followups: { schedule: "*/5 * * * *", enabled: true },
        process_scheduled_emails: { schedule: "*/10 * * * *", enabled: true },
        cleanup_analytics: { schedule: "0 2 * * *", enabled: true },
        engagement_scoring: { schedule: "0 1 * * *", enabled: true }
      }
    }, { status: httpStatus })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}

// Cron job execution log
export async function POST(request: NextRequest) {
  try {
    const { job_name, status, duration, details } = await request.json()

    if (!job_name || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // In a production system, you might want to store execution logs
    // For now, we'll just return the logged information
    const logEntry = {
      job_name,
      status,
      duration: duration || null,
      details: details || null,
      timestamp: new Date().toISOString(),
      logged: true
    }

    console.log(`📋 Cron job log: ${job_name} - ${status}`, logEntry)

    return NextResponse.json({
      success: true,
      logged: logEntry
    })

  } catch (error) {
    console.error('Cron job logging error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Manual cron job trigger (for testing)
export async function PUT(request: NextRequest) {
  try {
    const { job_name } = await request.json()

    if (!job_name) {
      return NextResponse.json({ error: 'Missing job_name' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'
    const cronSecret = process.env.CRON_SECRET

    let endpoint = ''
    switch (job_name) {
      case 'process_followups':
        endpoint = '/api/cron/process-followups'
        break
      case 'process_scheduled_emails':
        endpoint = '/api/process-scheduled-emails'
        break
      case 'cleanup_analytics':
        endpoint = '/api/cron/cleanup-analytics'
        break
      case 'engagement_scoring':
        endpoint = '/api/cron/engagement-scoring'
        break
      default:
        return NextResponse.json({ error: 'Invalid job_name' }, { status: 400 })
    }

    // Trigger the cron job
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {}
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      job_name,
      triggered_at: new Date().toISOString(),
      response_status: response.status,
      result
    })

  } catch (error) {
    console.error('Manual cron trigger error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
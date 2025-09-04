import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comprehensive health check for production deployment
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    app_url: process.env.NEXT_PUBLIC_APP_URL,
    overall_status: 'healthy',
    checks: {} as Record<string, any>
  };

  try {
    // 1. Database connectivity
    console.log('🔍 Testing database connectivity...');
    try {
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      results.checks.database = {
        status: !usersError ? 'healthy' : 'error',
        users_table_accessible: !usersError,
        users_count: usersCount || 0,
        error: usersError?.message || null
      };
    } catch (err) {
      results.checks.database = {
        status: 'error',
        error: (err as Error).message
      };
    }

    // 2. Core tables health
    console.log('🔍 Testing core tables...');
    const tablesToCheck = ['clients', 'invoices', 'messages'];
    const tableResults: Record<string, any> = {};

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        tableResults[table] = {
          accessible: !error,
          count: count || 0,
          error: error?.message || null
        };
      } catch (err) {
        tableResults[table] = {
          accessible: false,
          error: (err as Error).message
        };
      }
    }
    
    results.checks.core_tables = tableResults;

    // 3. Environment variables
    console.log('🔍 Testing environment configuration...');
    results.checks.environment = {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai_api_key: !!process.env.OPENAI_API_KEY,
      resend_api_key: !!process.env.RESEND_API_KEY,
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
      razorpay_configured: !!process.env.RAZORPAY_KEY_ID,
      from_email: process.env.FROM_EMAIL || null
    };

    // 4. API endpoints health
    console.log('🔍 Testing internal API endpoints...');
    const apiTests = {
      ai_status: false,
      database_test: false
    };

    try {
      // Test AI endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/ai/status`);
      apiTests.ai_status = response.ok;
    } catch (err) {
      // API not accessible, might be normal in some deployment scenarios
    }

    results.checks.api_endpoints = apiTests;

    // 5. Production readiness checklist
    console.log('🔍 Evaluating production readiness...');
    const productionChecks = {
      environment_variables_set: Object.values(results.checks.environment).filter(Boolean).length >= 6,
      database_accessible: results.checks.database.status === 'healthy',
      core_tables_working: Object.values(tableResults).every((t: any) => t.accessible),
      ai_service_configured: !!process.env.OPENAI_API_KEY,
      email_service_configured: !!process.env.RESEND_API_KEY,
      payment_gateways_configured: !!(process.env.STRIPE_SECRET_KEY || process.env.RAZORPAY_KEY_ID)
    };

    const readinessScore = Object.values(productionChecks).filter(Boolean).length;
    const totalChecks = Object.keys(productionChecks).length;

    results.checks.production_readiness = {
      score: `${readinessScore}/${totalChecks}`,
      percentage: Math.round((readinessScore / totalChecks) * 100),
      ready_for_deployment: readinessScore >= 5,
      checks: productionChecks
    };

    // Determine overall status
    const criticalIssues = [
      results.checks.database.status !== 'healthy',
      !results.checks.production_readiness.ready_for_deployment
    ].filter(Boolean).length;

    results.overall_status = criticalIssues === 0 ? 'healthy' : 
                           criticalIssues <= 1 ? 'warning' : 'error';

    console.log('✅ Health check completed:', {
      status: results.overall_status,
      readiness: `${readinessScore}/${totalChecks}`,
      criticalIssues
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      ...results,
      overall_status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        ...results.checks,
        fatal_error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    }, { status: 500 });
  }
}
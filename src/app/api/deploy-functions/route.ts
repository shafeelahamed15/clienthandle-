import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    console.log('🚀 Deploying missing database functions...');
    
    // Create admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // SQL for missing functions
    const functions = [
      // Version function
      `
      CREATE OR REPLACE FUNCTION public.version()
      RETURNS TEXT AS $$
      BEGIN
        RETURN 'ClientHandle Database Schema v1.0.0 - PostgreSQL ' || version();
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
      
      // Schema inspection function
      `
      CREATE OR REPLACE FUNCTION public.get_schema_tables()
      RETURNS TABLE(table_name TEXT, table_type TEXT) AS $$
      BEGIN
        RETURN QUERY 
        SELECT 
          t.table_name::TEXT,
          t.table_type::TEXT
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
      
      // Business analytics function
      `
      CREATE OR REPLACE FUNCTION public.get_current_usage(user_id UUID DEFAULT auth.uid())
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'clients_count', COALESCE(clients.count, 0),
          'invoices_count', COALESCE(invoices.count, 0),
          'messages_count', COALESCE(messages.count, 0),
          'unpaid_invoices', COALESCE(unpaid.count, 0),
          'overdue_invoices', COALESCE(overdue.count, 0),
          'revenue_this_month', COALESCE(revenue.amount, 0)
        ) INTO result
        FROM (
          SELECT COUNT(*) as count FROM public.clients WHERE owner_uid = user_id
        ) clients
        CROSS JOIN (
          SELECT COUNT(*) as count FROM public.invoices WHERE owner_uid = user_id
        ) invoices
        CROSS JOIN (
          SELECT COUNT(*) as count FROM public.messages WHERE owner_uid = user_id
        ) messages
        CROSS JOIN (
          SELECT COUNT(*) as count FROM public.invoices 
          WHERE owner_uid = user_id AND status IN ('sent', 'overdue')
        ) unpaid
        CROSS JOIN (
          SELECT COUNT(*) as count FROM public.invoices 
          WHERE owner_uid = user_id AND status = 'overdue'
        ) overdue
        CROSS JOIN (
          SELECT COALESCE(SUM(amount_cents), 0) as amount FROM public.invoices 
          WHERE owner_uid = user_id 
          AND status = 'paid' 
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) revenue;
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
      
      // Health check function
      `
      CREATE OR REPLACE FUNCTION public.health_check()
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'status', 'healthy',
          'timestamp', NOW(),
          'database_version', version(),
          'tables_count', (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
          ),
          'functions_count', (
            SELECT COUNT(*) FROM information_schema.routines 
            WHERE routine_schema = 'public'
          )
        ) INTO result;
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    ];

    const results = [];
    
    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      console.log(`📝 Deploying function ${i + 1}/${functions.length}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: func });
        
        if (error) {
          console.error(`❌ Error deploying function ${i + 1}:`, error);
          results.push({ index: i + 1, success: false, error: error.message });
        } else {
          console.log(`✅ Function ${i + 1} deployed successfully`);
          results.push({ index: i + 1, success: true });
        }
      } catch (err) {
        console.error(`❌ Exception deploying function ${i + 1}:`, err);
        results.push({ index: i + 1, success: false, error: (err as Error).message });
      }
    }
    
    // Test the functions
    console.log('🧪 Testing deployed functions...');
    
    const testResults: any = {};
    
    try {
      const { data: versionData, error: versionError } = await supabase.rpc('version');
      testResults.version = { success: !versionError, data: versionData, error: versionError?.message };
    } catch (err) {
      testResults.version = { success: false, error: (err as Error).message };
    }
    
    try {
      const { data: healthData, error: healthError } = await supabase.rpc('health_check');
      testResults.health_check = { success: !healthError, data: healthData, error: healthError?.message };
    } catch (err) {
      testResults.health_check = { success: false, error: (err as Error).message };
    }
    
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_schema_tables');
      testResults.get_schema_tables = { success: !tablesError, data: tablesData?.slice(0, 5), error: tablesError?.message };
    } catch (err) {
      testResults.get_schema_tables = { success: false, error: (err as Error).message };
    }
    
    console.log('🎉 Function deployment completed!');
    
    return NextResponse.json({
      success: true,
      message: 'Database functions deployed successfully',
      deployment_results: results,
      test_results: testResults,
      functions_deployed: functions.length
    });
    
  } catch (error) {
    console.error('💥 Function deployment failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy functions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to deploy missing database functions',
    endpoints: {
      deploy: 'POST /api/deploy-functions',
      test: 'GET /api/test-db'
    }
  });
}
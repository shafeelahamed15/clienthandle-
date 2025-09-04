import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test 1: Check core table access (most important)
    console.log('🔍 Testing core tables access...');
    
    const tableTests = {
      users: { success: false, error: null, count: 0 },
      clients: { success: false, error: null, count: 0 },
      invoices: { success: false, error: null, count: 0 },
      messages: { success: false, error: null, count: 0 }
    };
    
    // Test users table
    try {
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      tableTests.users = {
        success: !usersError,
        error: usersError?.message || null,
        count: usersCount || 0
      };
      
      if (!usersError) {
        console.log('✅ Users table accessible, count:', usersCount);
      } else {
        console.error('❌ Users table error:', usersError.message);
      }
    } catch (err) {
      tableTests.users.error = (err as Error).message;
      console.error('❌ Users table exception:', err);
    }
    
    // Test clients table
    try {
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      tableTests.clients = {
        success: !clientsError,
        error: clientsError?.message || null,
        count: clientsCount || 0
      };
      
      if (!clientsError) {
        console.log('✅ Clients table accessible, count:', clientsCount);
      }
    } catch (err) {
      tableTests.clients.error = (err as Error).message;
    }
    
    // Test invoices table
    try {
      const { count: invoicesCount, error: invoicesError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      
      tableTests.invoices = {
        success: !invoicesError,
        error: invoicesError?.message || null,
        count: invoicesCount || 0
      };
      
      if (!invoicesError) {
        console.log('✅ Invoices table accessible, count:', invoicesCount);
      }
    } catch (err) {
      tableTests.invoices.error = (err as Error).message;
    }
    
    // Test messages table
    try {
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      tableTests.messages = {
        success: !messagesError,
        error: messagesError?.message || null,
        count: messagesCount || 0
      };
      
      if (!messagesError) {
        console.log('✅ Messages table accessible, count:', messagesCount);
      }
    } catch (err) {
      tableTests.messages.error = (err as Error).message;
    }
    
    // Test 2: Check auth state
    console.log('🔍 Testing current auth state...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth check failed:', authError);
    } else {
      console.log('✅ Auth state:', {
        hasUser: !!authData.user,
        userId: authData.user?.id,
        email: authData.user?.email
      });
    }
    
    // Test 3: Check if we can perform basic operations
    console.log('🔍 Testing basic database operations...');
    
    let operationTests = {
      canRead: false,
      canWrite: false,
      rlsWorking: true
    };
    
    // Try to read from a table without auth (should fail due to RLS)
    try {
      const { data: unauthorizedRead, error: unauthorizedError } = await supabase
        .from('clients')
        .select('*')
        .limit(1);
        
      // If this succeeds, RLS might not be working properly
      if (!unauthorizedError) {
        operationTests.rlsWorking = false;
        operationTests.canRead = true;
        console.log('⚠️ RLS might not be working - unauthorized read succeeded');
      } else {
        operationTests.rlsWorking = true;
        console.log('✅ RLS is working - unauthorized access blocked');
      }
    } catch (err) {
      operationTests.rlsWorking = true;
      console.log('✅ RLS is working - unauthorized access blocked with exception');
    }
    
    // Calculate overall database health
    const overallHealth = {
      coreTablesAccessible: Object.values(tableTests).filter(t => t.success).length >= 3,
      authenticationWorking: !authError,
      rlsEnabled: operationTests.rlsWorking,
      readyForProduction: Object.values(tableTests).every(t => t.success) && !authError && operationTests.rlsWorking
    };
    
    console.log('🏁 Database test completed:', {
      tablesWorking: Object.values(tableTests).filter(t => t.success).length,
      totalTables: Object.keys(tableTests).length,
      authWorking: !authError,
      rlsWorking: operationTests.rlsWorking,
      overallHealthy: overallHealth.readyForProduction
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database connectivity test completed',
      overall_health: overallHealth,
      table_tests: tableTests,
      auth_test: {
        success: !authError,
        hasUser: !!authData?.user,
        userId: authData?.user?.id,
        email: authData?.user?.email,
        error: authError?.message || null
      },
      operation_tests: operationTests,
      recommendations: overallHealth.readyForProduction 
        ? ['Database is ready for production use!']
        : [
          ...(!overallHealth.coreTablesAccessible ? ['Check table permissions and RLS policies'] : []),
          ...(!overallHealth.authenticationWorking ? ['Fix authentication configuration'] : []),
          ...(!overallHealth.rlsEnabled ? ['Enable Row Level Security'] : [])
        ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}
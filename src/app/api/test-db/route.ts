import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test 1: Check if we can connect to Supabase at all
    console.log('🔍 Testing basic Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .rpc('version');
    
    if (healthError) {
      console.error('❌ Supabase health check failed:', healthError);
    } else {
      console.log('✅ Supabase health check passed');
    }
    
    // Test 2: Check if users table exists
    console.log('🔍 Testing if users table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Users table check failed:', {
        error: tableError,
        code: tableError.code,
        message: tableError.message,
        details: tableError.details
      });
    } else {
      console.log('✅ Users table exists, count:', tableCheck);
    }
    
    // Test 3: Check auth state
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
    
    // Test 4: List all tables (if possible)
    console.log('🔍 Testing database schema access...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_schema_tables');
    
    if (schemaError) {
      console.log('⚠️ Cannot access schema info (expected):', schemaError.message);
    } else {
      console.log('✅ Schema data:', schemaData);
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        supabaseHealth: !healthError,
        usersTableExists: !tableError,
        authWorking: !authError,
        hasAuthUser: !!authData?.user,
        userId: authData?.user?.id
      },
      errors: {
        healthError,
        tableError,
        authError,
        schemaError
      }
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
// Quick test to check Supabase configuration
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Checking Supabase configuration...');
console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
} else {
  console.log('❌ Supabase URL is NOT configured');
}

// Test URL structure
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  if (url.includes('gjwgrkaabbydicnwgyrw.supabase.co')) {
    console.log('⚠️ Found the problematic gjwgrkaabbydicnwgyrw domain in URL');
    console.log('This appears to be causing Cloudflare host resolution errors');
  }
}
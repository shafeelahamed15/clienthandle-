// Temporary script to test build with minimal environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_build';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder_anon_key';

const { execSync } = require('child_process');

try {
  console.log('🔨 Running build with placeholder environment variables...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
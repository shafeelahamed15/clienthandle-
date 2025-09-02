// Quick test to check Resend configuration
const dotenv = require('dotenv');
const { Resend } = require('resend');

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Checking Resend configuration...');
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'not set');

if (process.env.RESEND_API_KEY) {
  console.log('✅ Resend API key is configured');
  
  // Test Resend initialization
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend client initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Resend:', error.message);
  }
} else {
  console.log('❌ Resend API key is NOT configured');
  console.log('📝 Set RESEND_API_KEY in your .env.local file');
}
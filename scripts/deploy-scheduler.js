#!/usr/bin/env node

/**
 * Deploy Scheduled Follow-ups System to Production
 * 
 * This script:
 * 1. Deploys the Edge Function to Supabase
 * 2. Sets up the cron job
 * 3. Tests the system
 * 4. Provides production readiness report
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Scheduled Follow-ups System...\n');

function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf8' });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function deploy() {
  try {
    // 1. Deploy Edge Function
    console.log('1️⃣ Deploying Edge Function');
    runCommand(
      'npx supabase functions deploy scheduled-followups',
      'Deploying scheduled-followups function'
    );

    // 2. Set environment variables
    console.log('\n2️⃣ Setting Environment Variables');
    const envVars = [
      'RESEND_API_KEY',
      'FROM_EMAIL'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        runCommand(
          `npx supabase secrets set ${envVar}="${value}"`,
          `Setting ${envVar}`
        );
      } else {
        console.warn(`⚠️ Warning: ${envVar} not found in environment`);
      }
    }

    // 3. Test the function
    console.log('\n3️⃣ Testing Function');
    runCommand(
      'npx supabase functions invoke scheduled-followups --data \'{"test": true}\'',
      'Testing function deployment'
    );

    console.log('\n🎉 Deployment Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the cron.sql file to set up automated scheduling');
    console.log('3. Your follow-ups will now send automatically every 5 minutes!');

  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  deploy();
}

module.exports = { deploy };
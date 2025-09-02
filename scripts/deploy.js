#!/usr/bin/env node

/**
 * ClientHandle Production Deployment Script
 * 
 * This script helps automate the production deployment process:
 * 1. Runs pre-deployment checks
 * 2. Builds the application
 * 3. Validates environment variables
 * 4. Deploys to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ClientHandle Production Deployment\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(number, title) {
  log('cyan', `\n📋 Step ${number}: ${title}`);
}

function success(message) {
  log('green', `✅ ${message}`);
}

function warning(message) {
  log('yellow', `⚠️  ${message}`);
}

function error(message) {
  log('red', `❌ ${message}`);
  process.exit(1);
}

// Step 1: Pre-deployment checks
step(1, 'Pre-deployment Checks');

try {
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    error('package.json not found. Please run this script from the project root.');
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.name !== 'clienthandle') {
    error('This doesn\'t appear to be the ClientHandle project.');
  }

  success('Project structure validated');

  // Check for required files
  const requiredFiles = [
    'next.config.js',
    'tailwind.config.js',
    'src/app/layout.tsx',
    'vercel.json'
  ];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      error(`Required file missing: ${file}`);
    }
  });

  success('Required files present');

} catch (err) {
  error(`Pre-deployment check failed: ${err.message}`);
}

// Step 2: Environment validation
step(2, 'Environment Validation');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'CRON_SECRET'
];

log('blue', 'Checking environment variables...');
warning('Make sure these are set in Vercel dashboard:');

requiredEnvVars.forEach(envVar => {
  console.log(`  - ${envVar}`);
});

console.log('\n📝 Copy from .env.production.example');

// Step 3: Build validation
step(3, 'Build Validation');

try {
  log('blue', 'Running TypeScript check...');
  execSync('npm run typecheck', { stdio: 'inherit' });
  success('TypeScript validation passed');

  log('blue', 'Running ESLint...');
  execSync('npm run lint', { stdio: 'inherit' });
  success('Linting passed');

  log('blue', 'Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  success('Build completed successfully');

} catch (err) {
  error(`Build validation failed. Please fix errors before deploying.`);
}

// Step 4: Deployment
step(4, 'Deploy to Vercel');

try {
  log('blue', 'Deploying to production...');
  
  // Check if vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch {
    error('Vercel CLI not found. Please install with: npm i -g vercel');
  }

  // Deploy to production
  execSync('vercel --prod', { stdio: 'inherit' });
  success('Deployment completed!');

} catch (err) {
  error(`Deployment failed: ${err.message}`);
}

// Step 5: Post-deployment validation
step(5, 'Post-deployment Validation');

log('blue', 'Please manually verify:');
console.log('  1. 🌐 Domain is accessible');
console.log('  2. 🔐 Authentication works');
console.log('  3. 📧 Email sending works');
console.log('  4. 🤖 AI follow-ups work');
console.log('  5. ⏰ Cron jobs are scheduled');
console.log('  6. 📱 Mobile responsive');

log('green', '\n🎉 Deployment Complete!');
log('cyan', '\nNext steps:');
console.log('  1. Test your app thoroughly');
console.log('  2. Set up monitoring and alerts');
console.log('  3. Invite beta users for feedback');
console.log('  4. Monitor performance metrics');

log('magenta', '\n📚 Documentation:');
console.log('  - PRODUCTION_DEPLOYMENT.md - Complete setup guide');
console.log('  - SCHEDULED_REMINDERS_SETUP.md - Automation setup');

log('blue', '\n🚀 Your ClientHandle app is live!');
#!/usr/bin/env node

/**
 * Clear All Scheduled Emails Script
 * This script removes all scheduled and recurring emails from the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllScheduledEmails() {
  console.log('🧹 Starting cleanup of all scheduled emails...\n');
  
  try {
    // 1. Clear all scheduled messages (where scheduled_at is set)
    console.log('📧 Clearing scheduled messages...');
    const { data: scheduledMessages, error: scheduledError } = await supabase
      .from('messages')
      .delete()
      .not('scheduled_at', 'is', null);

    if (scheduledError) {
      console.error('❌ Error clearing scheduled messages:', scheduledError);
    } else {
      console.log(`✅ Cleared scheduled messages`);
    }

    // 2. Clear all items from followup_queue
    console.log('📋 Clearing followup queue...');
    const { data: queueItems, error: queueError } = await supabase
      .from('followup_queue')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (queueError) {
      console.error('❌ Error clearing followup queue:', queueError);
    } else {
      console.log(`✅ Cleared followup queue`);
    }

    // 3. Clear all recurring campaigns
    console.log('🔄 Clearing recurring campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('recurring_campaigns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (campaignsError) {
      console.error('❌ Error clearing recurring campaigns:', campaignsError);
    } else {
      console.log(`✅ Cleared recurring campaigns`);
    }

    // 4. Clear any messages in 'queued' status
    console.log('⏳ Clearing queued messages...');
    const { data: queuedMessages, error: queuedError } = await supabase
      .from('messages')
      .delete()
      .eq('status', 'queued');

    if (queuedError) {
      console.error('❌ Error clearing queued messages:', queuedError);
    } else {
      console.log(`✅ Cleared queued messages`);
    }

    // 5. Clear any draft messages that might be scheduled
    console.log('📝 Clearing draft messages with future scheduled times...');
    const { data: draftMessages, error: draftError } = await supabase
      .from('messages')
      .delete()
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null);

    if (draftError) {
      console.error('❌ Error clearing draft scheduled messages:', draftError);
    } else {
      console.log(`✅ Cleared draft scheduled messages`);
    }

    console.log('\n🎉 All scheduled emails have been cleared successfully!');
    console.log('📋 Summary:');
    console.log('   • Scheduled messages: Cleared');
    console.log('   • Followup queue: Cleared');
    console.log('   • Recurring campaigns: Cleared');
    console.log('   • Queued messages: Cleared');
    console.log('   • Draft scheduled messages: Cleared');
    console.log('\n✨ Your email system is now clean and ready for fresh scheduling!');

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearAllScheduledEmails();
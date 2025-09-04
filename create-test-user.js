// Create Test User Script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  const testEmail = 'test@clienthandle.com';
  const testPassword = 'testpassword123';
  const displayName = 'Test User';

  console.log('🔧 Creating test user account...');
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Password: ${testPassword}`);

  try {
    // Create user with admin client
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        display_name: displayName
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ Test user already exists!');
        console.log('\n🔗 Go to: http://localhost:3001/sign-in');
        console.log(`📧 Use email: ${testEmail}`);
        console.log(`🔑 Use password: ${testPassword}`);
        return;
      } else {
        console.error('❌ Error creating user:', authError);
        return;
      }
    }

    const user = authData.user;
    console.log('✅ User created successfully!');
    console.log('👤 User ID:', user.id);

    // Check if user profile was auto-created by trigger
    console.log('\n🔍 Checking if user profile was created...');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  User profile not found, creating manually...');
        
        // Create user profile manually
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: testEmail,
            display_name: displayName,
            plan: 'free',
            mfa_enabled: false,
            brand_accent_color: '#0A84FF'
          });

        if (insertError) {
          console.error('❌ Error creating user profile:', insertError);
        } else {
          console.log('✅ User profile created successfully!');
        }
      } else {
        console.error('❌ Error checking user profile:', profileError);
      }
    } else {
      console.log('✅ User profile already exists!');
      console.log('📋 Profile:', {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        plan: profile.plan
      });
    }

    console.log('\n🎉 SUCCESS! Test user is ready to use!');
    console.log('\n📱 Next Steps:');
    console.log('1. Go to: http://localhost:3001/sign-in');
    console.log(`2. Sign in with email: ${testEmail}`);
    console.log(`3. Sign in with password: ${testPassword}`);
    console.log('4. You should see the dashboard with real data!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get all plan limits
    const { data: plans, error } = await supabase
      .from('plan_limits')
      .select('*')
      .order('monthly_price_cents');
    
    // If table doesn't exist or there's an error, return fallback plans
    if (error && error.message.includes('Could not find the table')) {
      console.log('⚠️ Plan limits table not found, returning fallback plans');
      return NextResponse.json({
        success: true,
        plans: getFallbackPlans(),
        note: 'Using fallback plan data - database migration needed'
      });
    }
    
    if (error) {
      console.error('❌ Error fetching plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch plans', details: error.message },
        { status: 500 }
      );
    }
    
    // Format the plans for display
    const formattedPlans = plans?.map(plan => ({
      ...plan,
      monthly_price: plan.monthly_price_cents / 100,
      yearly_price: plan.yearly_price_cents / 100,
      yearly_savings: (plan.monthly_price_cents * 12 - plan.yearly_price_cents) / 100
    })) || getFallbackPlans();
    
    return NextResponse.json({
      success: true,
      plans: formattedPlans
    });
    
  } catch (error) {
    console.error('❌ Plans API error:', error);
    return NextResponse.json({
      success: true,
      plans: getFallbackPlans(),
      note: 'Using fallback plan data due to error'
    });
  }
}

// Fallback plan data when database table doesn't exist
function getFallbackPlans() {
  return [
    {
      plan: 'free',
      max_clients: 3,
      max_invoices_per_month: 5,
      max_ai_messages_per_month: 10,
      max_emails_per_month: 20,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: false,
      can_use_automation: false,
      can_use_analytics: false,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'email',
      monthly_price_cents: 0,
      yearly_price_cents: 0,
      monthly_price: 0,
      yearly_price: 0,
      yearly_savings: 0
    },
    {
      plan: 'starter',
      max_clients: 10,
      max_invoices_per_month: 25,
      max_ai_messages_per_month: 50,
      max_emails_per_month: 100,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: false,
      can_use_automation: false,
      can_use_analytics: false,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'email',
      monthly_price_cents: 2900,
      yearly_price_cents: 29000,
      monthly_price: 29,
      yearly_price: 290,
      yearly_savings: 58
    },
    {
      plan: 'professional',
      max_clients: 100,
      max_invoices_per_month: null,
      max_ai_messages_per_month: 200,
      max_emails_per_month: 500,
      max_team_members: 1,
      can_use_ai_followups: true,
      can_use_custom_branding: true,
      can_use_automation: true,
      can_use_analytics: true,
      can_use_api: false,
      can_use_white_label: false,
      support_level: 'priority',
      monthly_price_cents: 5900,
      yearly_price_cents: 59000,
      monthly_price: 59,
      yearly_price: 590,
      yearly_savings: 118
    },
    {
      plan: 'agency',
      max_clients: null,
      max_invoices_per_month: null,
      max_ai_messages_per_month: null,
      max_emails_per_month: null,
      max_team_members: 3,
      can_use_ai_followups: true,
      can_use_custom_branding: true,
      can_use_automation: true,
      can_use_analytics: true,
      can_use_api: true,
      can_use_white_label: true,
      support_level: 'phone',
      monthly_price_cents: 12900,
      yearly_price_cents: 129000,
      monthly_price: 129,
      yearly_price: 1290,
      yearly_savings: 258
    }
  ];
}
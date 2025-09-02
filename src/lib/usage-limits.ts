import { createServerSupabaseClient } from './supabase-server';

export interface PlanLimits {
  plan: string;
  max_clients: number | null;
  max_invoices_per_month: number | null;
  max_ai_messages_per_month: number | null;
  max_emails_per_month: number | null;
  max_team_members: number;
  can_use_ai_followups: boolean;
  can_use_custom_branding: boolean;
  can_use_automation: boolean;
  can_use_analytics: boolean;
  can_use_api: boolean;
  can_use_white_label: boolean;
  support_level: string;
}

export interface CurrentUsage {
  clients_count: number;
  invoices_count: number;
  ai_messages_count: number;
  emails_sent_count: number;
  period_start: string;
  period_end: string;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number | null;
  upgrade_required: boolean;
}

// Plan limits (fallback if database is unavailable)
const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
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
    support_level: 'email'
  },
  starter: {
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
    support_level: 'email'
  },
  professional: {
    plan: 'professional',
    max_clients: 100,
    max_invoices_per_month: null, // unlimited
    max_ai_messages_per_month: 200,
    max_emails_per_month: 500,
    max_team_members: 1,
    can_use_ai_followups: true,
    can_use_custom_branding: true,
    can_use_automation: true,
    can_use_analytics: true,
    can_use_api: false,
    can_use_white_label: false,
    support_level: 'priority'
  },
  agency: {
    plan: 'agency',
    max_clients: null, // unlimited
    max_invoices_per_month: null, // unlimited
    max_ai_messages_per_month: null, // unlimited
    max_emails_per_month: null, // unlimited
    max_team_members: 3,
    can_use_ai_followups: true,
    can_use_custom_branding: true,
    can_use_automation: true,
    can_use_analytics: true,
    can_use_api: true,
    can_use_white_label: true,
    support_level: 'phone'
  }
};

export async function getUserPlanAndLimits(userId: string): Promise<PlanLimits> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get user's current plan
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.warn('Could not fetch user plan, using free plan as default');
      return DEFAULT_PLAN_LIMITS.free;
    }
    
    const userPlan = user.plan || 'free';
    
    // Try to get limits from database
    const { data: planLimits, error: limitsError } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan', userPlan)
      .single();
    
    if (limitsError || !planLimits) {
      console.warn(`Could not fetch plan limits for ${userPlan}, using defaults`);
      return DEFAULT_PLAN_LIMITS[userPlan] || DEFAULT_PLAN_LIMITS.free;
    }
    
    return planLimits;
  } catch (error) {
    console.error('Error fetching user plan and limits:', error);
    return DEFAULT_PLAN_LIMITS.free;
  }
}

export async function getCurrentUsage(userId: string): Promise<CurrentUsage> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(1);
    currentPeriodStart.setHours(0, 0, 0, 0);
    
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    
    // Get usage from database
    const { data: usage, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', currentPeriodStart.toISOString())
      .single();
    
    if (error || !usage) {
      // Return zero usage if no record exists
      return {
        clients_count: 0,
        invoices_count: 0,
        ai_messages_count: 0,
        emails_sent_count: 0,
        period_start: currentPeriodStart.toISOString(),
        period_end: currentPeriodEnd.toISOString()
      };
    }
    
    return usage;
  } catch (error) {
    console.error('Error fetching current usage:', error);
    return {
      clients_count: 0,
      invoices_count: 0,
      ai_messages_count: 0,
      emails_sent_count: 0,
      period_start: new Date().toISOString(),
      period_end: new Date().toISOString()
    };
  }
}

export async function checkUsageLimit(
  userId: string,
  limitType: 'clients' | 'invoices' | 'ai_messages' | 'emails_sent',
  incrementBy: number = 1
): Promise<UsageCheckResult> {
  try {
    const [planLimits, currentUsage] = await Promise.all([
      getUserPlanAndLimits(userId),
      getCurrentUsage(userId)
    ]);
    
    let limit: number | null = null;
    let currentCount: number = 0;
    
    switch (limitType) {
      case 'clients':
        limit = planLimits.max_clients;
        currentCount = currentUsage.clients_count;
        break;
      case 'invoices':
        limit = planLimits.max_invoices_per_month;
        currentCount = currentUsage.invoices_count;
        break;
      case 'ai_messages':
        limit = planLimits.max_ai_messages_per_month;
        currentCount = currentUsage.ai_messages_count;
        break;
      case 'emails_sent':
        limit = planLimits.max_emails_per_month;
        currentCount = currentUsage.emails_sent_count;
        break;
    }
    
    // If limit is null, it's unlimited
    if (limit === null) {
      return {
        allowed: true,
        currentUsage: currentCount,
        limit: null,
        upgrade_required: false
      };
    }
    
    // Check if adding incrementBy would exceed the limit
    if (currentCount + incrementBy > limit) {
      return {
        allowed: false,
        reason: `Would exceed ${limitType} limit of ${limit}. Current usage: ${currentCount}`,
        currentUsage: currentCount,
        limit,
        upgrade_required: true
      };
    }
    
    return {
      allowed: true,
      currentUsage: currentCount,
      limit,
      upgrade_required: false
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    // In case of error, allow the action but log the issue
    return {
      allowed: true,
      currentUsage: 0,
      limit: null,
      upgrade_required: false
    };
  }
}

export async function incrementUsage(
  userId: string,
  limitType: 'clients' | 'invoices' | 'ai_messages' | 'emails_sent',
  incrementBy: number = 1
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(1);
    currentPeriodStart.setHours(0, 0, 0, 0);
    
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    
    // Use the database function to increment usage
    const { error } = await supabase.rpc('increment_usage_counter', {
      user_uuid: userId,
      counter_type: limitType,
      increment_by: incrementBy
    });
    
    if (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return false;
  }
}

export async function checkFeatureAccess(
  userId: string,
  feature: 'ai_followups' | 'custom_branding' | 'automation' | 'analytics' | 'api' | 'white_label'
): Promise<boolean> {
  try {
    const planLimits = await getUserPlanAndLimits(userId);
    
    switch (feature) {
      case 'ai_followups':
        return planLimits.can_use_ai_followups;
      case 'custom_branding':
        return planLimits.can_use_custom_branding;
      case 'automation':
        return planLimits.can_use_automation;
      case 'analytics':
        return planLimits.can_use_analytics;
      case 'api':
        return planLimits.can_use_api;
      case 'white_label':
        return planLimits.can_use_white_label;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

// Utility function to get upgrade suggestions
export function getUpgradeSuggestion(currentPlan: string, limitType: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    free: {
      clients: 'Upgrade to Starter ($29/month) to manage up to 10 clients',
      invoices: 'Upgrade to Starter ($29/month) for 25 invoices per month',
      ai_messages: 'Upgrade to Starter ($29/month) for 50 AI follow-ups per month',
      emails_sent: 'Upgrade to Starter ($29/month) for 100 email reminders per month'
    },
    starter: {
      clients: 'Upgrade to Professional ($59/month) to manage up to 100 clients',
      invoices: 'Upgrade to Professional ($59/month) for unlimited invoices',
      ai_messages: 'Upgrade to Professional ($59/month) for 200 AI follow-ups per month',
      emails_sent: 'Upgrade to Professional ($59/month) for 500 email reminders per month'
    },
    professional: {
      clients: 'Upgrade to Agency ($129/month) for unlimited clients',
      ai_messages: 'Upgrade to Agency ($129/month) for unlimited AI follow-ups',
      emails_sent: 'Upgrade to Agency ($129/month) for unlimited email reminders'
    }
  };
  
  return suggestions[currentPlan]?.[limitType] || 'Upgrade your plan for higher limits';
}
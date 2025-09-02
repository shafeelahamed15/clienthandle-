import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

// Initialize Stripe (handle missing key during build)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

// Price mapping for Stripe products - Updated 2024 pricing
const STRIPE_PRICES = {
  // Monthly prices (new optimized pricing)
  'starter-monthly': 'price_starter_15_monthly', // $15/month
  'professional-monthly': 'price_professional_29_monthly', // $29/month  
  'agency-monthly': 'price_agency_59_monthly', // $59/month
  
  // Yearly prices (20% discount applied)
  'starter-yearly': 'price_starter_150_yearly', // $150/year ($12.50/mo equivalent)
  'professional-yearly': 'price_professional_290_yearly', // $290/year ($24.17/mo equivalent)
  'agency-yearly': 'price_agency_590_yearly', // $590/year ($49.17/mo equivalent)
};

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment provider not configured' },
        { status: 500 }
      );
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { priceId, billingCycle } = await request.json();
    
    // Validate input
    if (!priceId || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing priceId or billingCycle' },
        { status: 400 }
      );
    }

    // Free plan doesn't need Stripe checkout
    if (priceId === 'free') {
      return NextResponse.json({ url: '/sign-up' });
    }

    // Map plan to Stripe price ID
    const stripePriceKey = `${priceId}-${billingCycle}` as keyof typeof STRIPE_PRICES;
    const stripePriceId = STRIPE_PRICES[stripePriceKey];
    
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    console.log('🔄 Creating Stripe checkout session for:', {
      userId: user.id,
      email: user.email,
      priceId,
      billingCycle,
      stripePriceId
    });

    // Create or get Stripe customer
    let stripeCustomerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      stripeCustomerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      billing_address_collection: 'required',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan: priceId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: priceId,
          billing_cycle: billingCycle,
        },
      },
      allow_promotion_codes: true,
    });

    console.log('✅ Stripe checkout session created:', session.id);

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment processing error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
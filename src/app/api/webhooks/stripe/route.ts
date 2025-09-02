import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyStripeWebhook, handleStripePaymentSuccess } from '@/lib/payments/stripe';
import { mockInvoicesService, MOCK_MODE } from '@/lib/mock-data';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }
    
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const payload = await request.text();
    
    // Verify webhook signature
    const event = verifyStripeWebhook(payload, signature, webhookSecret);
    
    console.log(`🔔 Stripe webhook received: ${event.type}`);

    // Handle subscription events (new pricing system)
    if (await handleSubscriptionEvents(event)) {
      return NextResponse.json({ received: true });
    }

    // Handle payment success events (legacy invoice payments)
    const paymentResult = await handleStripePaymentSuccess(event);
    
    if (!paymentResult.invoiceId) {
      console.log('No invoice/subscription event to process');
      return NextResponse.json({ received: true });
    }

    // Update invoice status
    if (MOCK_MODE) {
      console.log('🎭 Using mock mode for webhook processing');
      await mockInvoicesService.update(paymentResult.invoiceId, 'mock-user-1', {
        status: 'paid',
        payment_intent_id: paymentResult.paymentIntentId,
      });
    } else {
      const supabase = await createServerSupabaseClient();
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentResult.invoiceId)
        .eq('payment_intent_id', paymentResult.paymentIntentId);

      if (updateError) {
        console.error('Failed to update invoice status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update invoice status' },
          { status: 500 }
        );
      }

      // Log audit trail
      await supabase
        .from('audit_logs')
        .insert({
          action: 'payment_received',
          entity_type: 'invoice',
          entity_id: paymentResult.invoiceId,
          delta_hash: null,
          ip_hash: 'webhook',
        });
    }

    console.log(`✅ Invoice ${paymentResult.invoiceId} marked as paid via Stripe`);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionEvents(event: any): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase);
        return true;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase);
        return true;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        return true;
      
      case 'invoice.payment_succeeded':
        if (event.data.object.subscription) {
          await handleSubscriptionPayment(event.data.object, supabase);
          return true;
        }
        break;
      
      case 'invoice.payment_failed':
        if (event.data.object.subscription) {
          await handleSubscriptionPaymentFailed(event.data.object, supabase);
          return true;
        }
        break;
    }
  } catch (error) {
    console.error('❌ Subscription event handling error:', error);
  }
  
  return false;
}

async function handleCheckoutCompleted(session: any, supabase: any) {
  console.log('🎉 Checkout completed:', session.id);
  
  const userId = session.metadata?.supabase_user_id;
  const plan = session.metadata?.plan;
  const billingCycle = session.metadata?.billing_cycle;
  
  if (!userId || !plan) {
    console.error('❌ Missing metadata in checkout session');
    return;
  }

  try {
    // Update user's plan
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        plan: plan,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (userError) {
      console.error('❌ Error updating user plan:', userError);
    } else {
      console.log('✅ User plan updated to:', plan);
    }

    // Create subscription record
    const subscriptionData = {
      user_id: userId,
      plan: plan,
      status: 'active',
      billing_cycle: billingCycle || 'monthly',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      amount_cents: session.amount_total || 0,
      currency: session.currency || 'usd',
    };

    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });

    if (subscriptionError) {
      console.error('❌ Error creating subscription:', subscriptionError);
    } else {
      console.log('✅ Subscription record created');
    }

    await logBillingEvent(userId, 'checkout_completed', session.amount_total || 0, 'stripe', session, supabase);

  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('📝 Subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('🗑️ Subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  // Downgrade to free plan
  const { error: userError } = await supabase
    .from('users')
    .update({ 
      plan: 'free',
      subscription_status: 'cancelled'
    })
    .eq('id', userId);

  if (userError) {
    console.error('❌ Error downgrading user:', userError);
  }

  const { error: subError } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subError) {
    console.error('❌ Error updating subscription to cancelled:', subError);
  }

  await logBillingEvent(userId, 'subscription_cancelled', 0, 'stripe', subscription, supabase);
}

async function handleSubscriptionPayment(invoice: any, supabase: any) {
  console.log('💳 Subscription payment succeeded:', invoice.id);
  
  // Log the successful payment
  if (!stripe) return;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata?.supabase_user_id;
  
  if (userId) {
    await logBillingEvent(userId, 'payment_succeeded', invoice.amount_paid, 'stripe', invoice, supabase);
  }
}

async function handleSubscriptionPaymentFailed(invoice: any, supabase: any) {
  console.log('💸 Subscription payment failed:', invoice.id);
  
  if (!stripe) return;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata?.supabase_user_id;
  
  if (userId) {
    await logBillingEvent(userId, 'payment_failed', invoice.amount_due, 'stripe', invoice, supabase);
  }
}

async function logBillingEvent(
  userId: string,
  eventType: string,
  amountCents: number,
  provider: string,
  eventData: any,
  supabase: any
) {
  try {
    const { error } = await supabase
      .from('billing_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        amount_cents: amountCents,
        currency: eventData.currency || 'usd',
        provider,
        provider_event_id: eventData.id,
        event_data: eventData,
        processed: true,
        processed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Error logging billing event:', error);
    } else {
      console.log('✅ Billing event logged:', eventType);
    }
  } catch (error) {
    console.error('❌ Billing event logging failed:', error);
  }
}
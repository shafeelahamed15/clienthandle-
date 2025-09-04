import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyStripeWebhook, handleStripePaymentSuccess } from '@/lib/payments/stripe';
import { mockInvoicesService, MOCK_MODE } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  try {
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

    // Handle payment success events for invoices
    const paymentResult = await handleStripePaymentSuccess(event);
    
    if (!paymentResult.invoiceId) {
      console.log('No invoice event to process');
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
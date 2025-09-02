import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyRazorpayWebhook, handleRazorpayPaymentSuccess } from '@/lib/payments/razorpay';
import { mockInvoicesService, MOCK_MODE } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const payload = await request.text();
    
    // Verify webhook signature
    const isValid = verifyRazorpayWebhook(payload, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(payload);
    console.log(`🔔 Razorpay webhook received: ${event.event}`);

    // Handle payment success events
    const paymentResult = await handleRazorpayPaymentSuccess(event);
    
    if (!paymentResult.invoiceId) {
      console.log('No invoice ID found in webhook, ignoring');
      return NextResponse.json({ received: true });
    }

    // Update invoice status
    if (MOCK_MODE) {
      console.log('🎭 Using mock mode for webhook processing');
      await mockInvoicesService.update(paymentResult.invoiceId, 'mock-user-1', {
        status: 'paid',
        payment_intent_id: paymentResult.paymentIntentId || paymentResult.paymentId,
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

    console.log(`✅ Invoice ${paymentResult.invoiceId} marked as paid via Razorpay`);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
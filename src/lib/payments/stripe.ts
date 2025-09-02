import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

export function verifyStripeWebhook(payload: string, signature: string, secret: string): Stripe.Event {
  try {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

export async function handleStripePaymentSuccess(event: Stripe.Event): Promise<{
  invoiceId: string | null;
  paymentIntentId: string | null;
}> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Extract invoice ID from metadata
        const invoiceId = paymentIntent.metadata?.invoice_id;
        
        if (!invoiceId) {
          console.log('No invoice ID found in payment intent metadata');
          return { invoiceId: null, paymentIntentId: null };
        }
        
        console.log(`💰 Payment succeeded for invoice: ${invoiceId}`);
        
        return {
          invoiceId,
          paymentIntentId: paymentIntent.id,
        };
      }
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract invoice ID from metadata
        const invoiceId = session.metadata?.invoice_id;
        
        if (!invoiceId) {
          console.log('No invoice ID found in checkout session metadata');
          return { invoiceId: null, paymentIntentId: null };
        }
        
        console.log(`💰 Checkout completed for invoice: ${invoiceId}`);
        
        return {
          invoiceId,
          paymentIntentId: session.payment_intent as string,
        };
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { invoiceId: null, paymentIntentId: null };
    }
  } catch (error) {
    console.error('❌ Error handling Stripe payment success:', error);
    return { invoiceId: null, paymentIntentId: null };
  }
}

export { stripe };
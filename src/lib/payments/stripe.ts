import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  invoiceId: string;
  customerEmail?: string;
  description?: string;
}

export async function createPaymentIntent({
  amount,
  currency,
  invoiceId,
  customerEmail,
  description
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        invoice_id: invoiceId,
      },
      description: description || `Payment for Invoice #${invoiceId}`,
      receipt_email: customerEmail,
    });

    return paymentIntent;
  } catch (error) {
    console.error('❌ Failed to create Stripe payment intent:', error);
    throw error;
  }
}

export async function createCheckoutSession({
  amount,
  currency,
  invoiceId,
  successUrl,
  cancelUrl,
  customerEmail,
  description
}: {
  amount: number;
  currency: string;
  invoiceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  description?: string;
}): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description || `Invoice #${invoiceId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        invoice_id: invoiceId,
      },
    });

    return session;
  } catch (error) {
    console.error('❌ Failed to create Stripe checkout session:', error);
    throw error;
  }
}

export function verifyStripeWebhook(payload: string, signature: string, secret: string): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;
        
        if (invoiceId) {
          console.log(`💰 Checkout completed for invoice: ${invoiceId}`);
          return {
            invoiceId,
            paymentIntentId: session.payment_intent as string,
          };
        }
        
        return { invoiceId: null, paymentIntentId: null };
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        
        if (invoiceId) {
          console.log(`💰 Payment succeeded for invoice: ${invoiceId}`);
          return {
            invoiceId,
            paymentIntentId: paymentIntent.id,
          };
        }
        
        return { invoiceId: null, paymentIntentId: null };
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
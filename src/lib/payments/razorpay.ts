import crypto from 'crypto';

export function verifyRazorpayWebhook(payload: string, signature: string, secret: string): any {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(payload);
  } catch (error) {
    console.error('❌ Razorpay webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

export async function handleRazorpayPaymentSuccess(event: any): Promise<{
  invoiceId: string | null;
  paymentId: string | null;
}> {
  try {
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        
        // Extract invoice ID from notes or description
        const invoiceId = payment.notes?.invoice_id || null;
        
        if (!invoiceId) {
          console.log('No invoice ID found in Razorpay payment notes');
          return { invoiceId: null, paymentId: null };
        }
        
        console.log(`💰 Razorpay payment captured for invoice: ${invoiceId}`);
        
        return {
          invoiceId,
          paymentId: payment.id,
        };
      }
      
      default:
        console.log(`Unhandled Razorpay event type: ${event.event}`);
        return { invoiceId: null, paymentId: null };
    }
  } catch (error) {
    console.error('❌ Error handling Razorpay payment success:', error);
    return { invoiceId: null, paymentId: null };
  }
}
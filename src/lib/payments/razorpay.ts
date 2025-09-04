import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET 
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

export interface CreateRazorpayOrderParams {
  amount: number; // in paise (INR * 100)
  currency?: string;
  invoiceId: string;
  customerEmail?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({
  amount,
  currency = 'INR',
  invoiceId,
  customerEmail,
  notes = {}
}: CreateRazorpayOrderParams) {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const options = {
      amount: amount, // amount in paise
      currency,
      receipt: `invoice_${invoiceId}_${Date.now()}`,
      notes: {
        invoice_id: invoiceId,
        customer_email: customerEmail || '',
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Failed to create Razorpay order:', error);
    throw error;
  }
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay key secret not configured');
  }

  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === signature;
    console.log(isValid ? '✅ Razorpay signature verified' : '❌ Razorpay signature verification failed');
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying Razorpay signature:', error);
    return false;
  }
}

export async function handleRazorpaySuccess(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ invoiceId: string | null; paymentId: string; orderId: string }> {
  try {
    // Verify signature first
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      throw new Error('Invalid signature');
    }

    // Fetch order details to get invoice ID
    if (!razorpay) {
      throw new Error('Razorpay not configured');
    }

    const order = await razorpay.orders.fetch(orderId);
    const invoiceId = order.notes?.invoice_id || null;

    if (invoiceId) {
      console.log(`💰 Razorpay payment succeeded for invoice: ${invoiceId}`);
    }

    return {
      invoiceId,
      paymentId,
      orderId,
    };
  } catch (error) {
    console.error('❌ Error handling Razorpay success:', error);
    throw error;
  }
}

export { razorpay };
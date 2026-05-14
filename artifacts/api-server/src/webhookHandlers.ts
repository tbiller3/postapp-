import { getUncachableStripeClient } from './stripeClient';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    try {
      await WebhookHandlers.handleCustomEvents(payload, signature);
    } catch (err) {
      console.error('Webhook handler error (non-fatal):', err);
    }
  }

  static async handleCustomEvents(payload: Buffer, signature: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return;

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer as string;
      const userId = session.metadata?.userId;
      const customerEmail = session.customer_email || session.customer_details?.email;

      if (customerId && userId && userId !== 'anonymous') {
        await db
          .update(usersTable)
          .set({ stripeCustomerId: customerId })
          .where(eq(usersTable.id, userId));
      } else if (customerId && customerEmail) {
        await db
          .update(usersTable)
          .set({ stripeCustomerId: customerId })
          .where(eq(usersTable.email, customerEmail));
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer as string;
      console.log(`Subscription cancelled for customer ${customerId}`);
    }
  }
}

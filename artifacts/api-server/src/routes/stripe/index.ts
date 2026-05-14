import { Router, type IRouter } from 'express';
import { stripeStorage } from '../../stripeStorage';
import { getUncachableStripeClient, getStripePublishableKey } from '../../stripeClient';
import { db } from '@workspace/db';
import { usersTable, submissionCreditsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

// GET /api/stripe/publishable-key
router.get('/stripe/publishable-key', async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch publishable key' });
  }
});

// GET /api/stripe/plans — products with prices
router.get('/stripe/plans', async (_req, res) => {
  try {
    const rows = await stripeStorage.listProductsWithPrices();

    const productsMap = new Map<string, any>();
    for (const row of rows) {
      if (!productsMap.has(row.product_id as string)) {
        productsMap.set(row.product_id as string, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id as string).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/stripe/checkout — create a subscription checkout session
router.post('/stripe/checkout', async (req: any, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const publicHost = process.env.PUBLIC_URL
      ?? process.env.RAILWAY_PUBLIC_DOMAIN
      ?? process.env.REPLIT_DOMAINS?.split(',')[0]
      ?? 'localhost:3000';
    const baseUrl = publicHost.startsWith('http') ? publicHost : `https://${publicHost}`;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    let existingCustomerId: string | undefined;
    if (userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user?.stripeCustomerId) existingCustomerId = user.stripeCustomerId;
    }

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/pricing?success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      metadata: { userId: userId || 'anonymous' },
    };

    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// POST /api/stripe/checkout/submission — one-time submission payment
router.post('/stripe/checkout/submission', async (req: any, res) => {
  try {
    const { appId, submissionType = 'standard' } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const publicHost2 = process.env.PUBLIC_URL
      ?? process.env.RAILWAY_PUBLIC_DOMAIN
      ?? process.env.REPLIT_DOMAINS?.split(',')[0]
      ?? 'localhost:3000';
    const baseUrl = publicHost2.startsWith('http') ? publicHost2 : `https://${publicHost2}`;

    const SUBMISSION_PRICES: Record<string, { amount: number; label: string }> = {
      standard: { amount: 19900, label: 'Standard App Submission' },
      complex: { amount: 34900, label: 'Complex App Submission' },
      resubmission: { amount: 9900, label: 'Resubmission / Appeal Support' },
    };

    const pricing = SUBMISSION_PRICES[submissionType] || SUBMISSION_PRICES.standard;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pricing.label,
            description: `POSTAPP submission service — App ID: ${appId || 'N/A'}`,
          },
          unit_amount: pricing.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/apps/${appId}?submission_success=1`,
      cancel_url: `${baseUrl}/apps/${appId}`,
      metadata: {
        userId,
        appId: appId?.toString() || '',
        submissionType,
      },
    };

    if (user?.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId;
    } else if (user?.email) {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create submission checkout' });
  }
});

export default router;

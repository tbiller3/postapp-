import { Router, type IRouter } from 'express';
import { stripeStorage } from '../../stripeStorage';
import { getUncachableStripeClient, getStripePublishableKey } from '../../stripeClient';

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

// POST /api/stripe/checkout — create a Stripe Checkout session
router.post('/stripe/checkout', async (req: any, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/pricing?success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      metadata: {
        userId: req.user?.id?.toString() || 'anonymous',
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

export default router;

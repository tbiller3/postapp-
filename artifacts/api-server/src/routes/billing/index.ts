import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getUncachableStripeClient } from '../../stripeClient';

const router: IRouter = Router();

const PLAN_MAP: Record<string, { name: string; tier: number; submissionFee: number; maxPipelines: number }> = {
  solo: { name: 'Solo', tier: 1, submissionFee: 19900, maxPipelines: 1 },
  builder: { name: 'Builder', tier: 2, submissionFee: 17900, maxPipelines: 3 },
  studio: { name: 'Studio', tier: 3, submissionFee: 14900, maxPipelines: -1 },
};

async function getPlanForCustomer(stripeCustomerId: string) {
  try {
    const result = await db.execute(sql`
      SELECT
        sub.id as subscription_id,
        sub.status,
        sub.current_period_end,
        sub.cancel_at_period_end,
        prod.name as product_name,
        prod.metadata as product_metadata,
        pr.unit_amount,
        pr.recurring
      FROM stripe.subscriptions sub
      JOIN stripe.subscription_items si ON si.subscription = sub.id
      JOIN stripe.prices pr ON pr.id = si.price
      JOIN stripe.products prod ON prod.id = pr.product
      WHERE sub.customer = ${stripeCustomerId}
        AND sub.status IN ('active', 'trialing')
      ORDER BY sub.created DESC
      LIMIT 1
    `);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

function normalizePlanName(productName: string): keyof typeof PLAN_MAP | 'free' {
  const lower = productName.toLowerCase();
  if (lower.includes('solo') || lower.includes('launch')) return 'solo';
  if (lower.includes('builder')) return 'builder';
  if (lower.includes('studio')) return 'studio';
  return 'free';
}

// GET /api/billing/status
router.get('/billing/status', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.json({ plan: 'free', tier: 0, submissionFee: 19900, maxPipelines: 1, subscription: null });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user?.stripeCustomerId) {
      res.json({ plan: 'free', tier: 0, submissionFee: 19900, maxPipelines: 1, subscription: null });
      return;
    }

    const sub = await getPlanForCustomer(user.stripeCustomerId);
    if (!sub) {
      res.json({ plan: 'free', tier: 0, submissionFee: 19900, maxPipelines: 1, subscription: null });
      return;
    }

    const planKey = normalizePlanName(sub.product_name as string);
    const planInfo = planKey !== 'free' ? PLAN_MAP[planKey] : null;

    res.json({
      plan: planKey,
      tier: planInfo?.tier ?? 0,
      submissionFee: planInfo?.submissionFee ?? 19900,
      maxPipelines: planInfo?.maxPipelines ?? 1,
      subscription: {
        id: sub.subscription_id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        productName: sub.product_name,
      },
    });
  } catch (err) {
    console.error('billing/status error:', err);
    res.json({ plan: 'free', tier: 0, submissionFee: 19900, maxPipelines: 1, subscription: null });
  }
});

// POST /api/billing/portal — create billing portal session
router.post('/billing/portal', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'No billing account found. Subscribe to a plan first.' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('billing/portal error:', err);
    res.status(500).json({ error: err.message || 'Failed to open billing portal' });
  }
});

export default router;

// Run with: pnpm --filter @workspace/api-server exec tsx ../../scripts/seed-stripe.ts
// Seeds POSTAPP pricing plans into Stripe (idempotent — safe to re-run)

import { getUncachableStripeClient } from '../artifacts/api-server/src/stripeClient.js';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking existing POSTAPP products...');

  // ── TIER 1: LAUNCH ─────────────────────────────────────────────────────
  let launch = (await stripe.products.search({ query: "name:'POSTAPP Launch' AND active:'true'" })).data[0];
  if (launch) {
    console.log(`Launch already exists: ${launch.id}`);
  } else {
    launch = await stripe.products.create({
      name: 'POSTAPP Launch',
      description: 'Perfect for indie developers shipping their first app. Low monthly commitment with pay-per-submission pricing.',
      metadata: {
        tier: '1',
        appsPerMonth: '2',
        perSubmissionCost: '1900',
        highlight: 'Best for beginners',
      },
    });
    console.log(`Created Launch product: ${launch.id}`);

    await stripe.prices.create({
      product: launch.id,
      unit_amount: 1900,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'Launch Monthly',
    });
    console.log('  Created $19/mo price');

    // Per-submission add-on price (one-time)
    await stripe.prices.create({
      product: launch.id,
      unit_amount: 1900,
      currency: 'usd',
      nickname: 'Launch Per-Submission',
      metadata: { type: 'per_submission' },
    });
    console.log('  Created $19 per-submission price');
  }

  // ── TIER 2: BUILDER ────────────────────────────────────────────────────
  let builder = (await stripe.products.search({ query: "name:'POSTAPP Builder' AND active:'true'" })).data[0];
  if (builder) {
    console.log(`Builder already exists: ${builder.id}`);
  } else {
    builder = await stripe.products.create({
      name: 'POSTAPP Builder',
      description: 'For active developers shipping multiple apps per month. More submissions included, lower per-submission overage.',
      metadata: {
        tier: '2',
        appsPerMonth: '10',
        perSubmissionCost: '900',
        highlight: 'Most popular',
      },
    });
    console.log(`Created Builder product: ${builder.id}`);

    await stripe.prices.create({
      product: builder.id,
      unit_amount: 4900,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'Builder Monthly',
    });
    console.log('  Created $49/mo price');

    await stripe.prices.create({
      product: builder.id,
      unit_amount: 900,
      currency: 'usd',
      nickname: 'Builder Per-Submission',
      metadata: { type: 'per_submission' },
    });
    console.log('  Created $9 per-submission price');
  }

  // ── TIER 3: STUDIO ─────────────────────────────────────────────────────
  let studio = (await stripe.products.search({ query: "name:'POSTAPP Studio' AND active:'true'" })).data[0];
  if (studio) {
    console.log(`Studio already exists: ${studio.id}`);
  } else {
    studio = await stripe.products.create({
      name: 'POSTAPP Studio',
      description: 'For studios and power users with unlimited submissions. Highest monthly rate, lowest per-submission cost.',
      metadata: {
        tier: '3',
        appsPerMonth: 'unlimited',
        perSubmissionCost: '290',
        highlight: 'Best value at scale',
      },
    });
    console.log(`Created Studio product: ${studio.id}`);

    await stripe.prices.create({
      product: studio.id,
      unit_amount: 14900,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'Studio Monthly',
    });
    console.log('  Created $149/mo price');

    await stripe.prices.create({
      product: studio.id,
      unit_amount: 290,
      currency: 'usd',
      nickname: 'Studio Per-Submission',
      metadata: { type: 'per_submission' },
    });
    console.log('  Created $2.90 per-submission price');
  }

  console.log('\n✓ All products seeded. Webhooks will sync to the database.');
}

seedProducts().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

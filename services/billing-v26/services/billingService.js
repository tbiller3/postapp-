const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const PLAN_PRICE_IDS = {
  free: null,
  solo: process.env.STRIPE_PRICE_SOLO,
  builder: process.env.STRIPE_PRICE_BUILDER,
  studio: process.env.STRIPE_PRICE_STUDIO
};

const SUBMISSION_PRICE_IDS = {
  standard: process.env.STRIPE_PRICE_SUBMISSION_STANDARD,
  complex: process.env.STRIPE_PRICE_SUBMISSION_COMPLEX
};

function getEntitlements(planName = "free") {
  const plans = {
    free: {
      plan: "free",
      projects_max: 1,
      team_members_max: 1,
      full_analyzer: false,
      submission_enabled: false,
      templates_enabled: false,
      priority_queue: false
    },
    solo: {
      plan: "solo",
      projects_max: 1,
      team_members_max: 1,
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true,
      priority_queue: false
    },
    builder: {
      plan: "builder",
      projects_max: 3,
      team_members_max: 3,
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true,
      priority_queue: true
    },
    studio: {
      plan: "studio",
      projects_max: -1,
      team_members_max: 20,
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true,
      priority_queue: true,
      white_label: true
    }
  };

  return plans[planName] || plans.free;
}

async function createOrGetStripeCustomer(user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      user_id: user.id
    }
  });

  return customer.id;
}

async function createSubscriptionCheckoutSession({ user, planName }) {
  const priceId = PLAN_PRICE_IDS[planName];
  if (!priceId) throw new Error("Invalid plan selected.");

  const customerId = await createOrGetStripeCustomer(user);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_BASE_URL}/?billing=success`,
    cancel_url: `${process.env.APP_BASE_URL}/?billing=cancel`,
    metadata: {
      user_id: user.id,
      purchase_type: "subscription",
      plan_name: planName
    }
  });
}

async function createSubmissionCheckoutSession({
  user,
  projectId,
  submissionType = "standard"
}) {
  const priceId = SUBMISSION_PRICE_IDS[submissionType];
  if (!priceId) throw new Error("Invalid submission type.");

  const customerId = await createOrGetStripeCustomer(user);

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_BASE_URL}/?submission=success&project=${projectId}`,
    cancel_url: `${process.env.APP_BASE_URL}/?submission=cancel&project=${projectId}`,
    metadata: {
      user_id: user.id,
      project_id: projectId,
      purchase_type: "submission_credit",
      submission_type: submissionType
    }
  });
}

async function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = {
  stripe,
  getEntitlements,
  createOrGetStripeCustomer,
  createSubscriptionCheckoutSession,
  createSubmissionCheckoutSession,
  constructWebhookEvent
};

import { getUncachableStripeClient } from './stripeClient';

export class StripeStorage {
  async listProductsWithPrices(active = true) {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active, limit: 100 });
    const prices = await stripe.prices.list({ active: true, limit: 100 });

    const rows: any[] = [];
    for (const product of products.data) {
      const productPrices = prices.data.filter(p => p.product === product.id);
      if (productPrices.length === 0) {
        rows.push({
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          product_active: product.active,
          product_metadata: product.metadata,
          price_id: null,
          unit_amount: null,
          currency: null,
          recurring: null,
          price_active: null,
        });
      } else {
        for (const price of productPrices) {
          rows.push({
            product_id: product.id,
            product_name: product.name,
            product_description: product.description,
            product_active: product.active,
            product_metadata: product.metadata,
            price_id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            price_active: price.active,
          });
        }
      }
    }
    return rows;
  }

  async getProduct(productId: string) {
    const stripe = await getUncachableStripeClient();
    try {
      return await stripe.products.retrieve(productId);
    } catch {
      return null;
    }
  }

  async getPrice(priceId: string) {
    const stripe = await getUncachableStripeClient();
    try {
      return await stripe.prices.retrieve(priceId);
    } catch {
      return null;
    }
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }
}

export const stripeStorage = new StripeStorage();

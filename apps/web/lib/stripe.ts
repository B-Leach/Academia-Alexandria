import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Singleton client (lazy — avoids crash at import time in tests)
// ---------------------------------------------------------------------------

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const client = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = client;
  }

  return client;
}

/**
 * Lazy Stripe client — only initialises on first access.
 * This prevents crashes when the module is imported in test environments
 * where STRIPE_SECRET_KEY is not set.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if Stripe credentials are configured.
 * When false, all bounty UI should be hidden.
 */
export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

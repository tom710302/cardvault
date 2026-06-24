import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
    name: "月付方案",
    price: 199,
    interval: "月",
  },
  yearly: {
    priceId: process.env.STRIPE_PRICE_YEARLY!,
    name: "年付方案",
    price: 1499,
    interval: "年",
  },
} as const;

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const userId = session.metadata?.supabase_user_id;
    if (!userId) return NextResponse.json({ ok: true });

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    await admin.from("profiles").update({
      is_premium: true,
      premium_until: periodEnd,
    }).eq("id", userId);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    const { data: profile } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (profile) {
      await admin.from("profiles").update({ is_premium: true, premium_until: periodEnd }).eq("id", profile.id);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const { data: profile } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (profile) {
      await admin.from("profiles").update({ is_premium: false, premium_until: null }).eq("id", profile.id);
    }
  }

  return NextResponse.json({ ok: true });
}

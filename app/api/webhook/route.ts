import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getProduct } from "@/lib/products";
import { sendDeliveryEmail } from "@/lib/resend";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  const origin = req.headers.get("origin");
  if (origin) return origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !whSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, whSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "unpaid" });
    }

    const productIds = (session.metadata?.products || "").split(",").filter(Boolean);
    const products = productIds.map((id) => getProduct(id)).filter(Boolean) as Array<NonNullable<ReturnType<typeof getProduct>>>;
    const email = session.customer_details?.email || session.metadata?.email;

    if (!email) {
      return NextResponse.json({ received: true, skipped: "no email" });
    }
    if (products.length === 0) {
      return NextResponse.json({ received: true, skipped: "no products" });
    }

    try {
      await sendDeliveryEmail({
        email,
        products,
        baseUrl: getBaseUrl(req),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

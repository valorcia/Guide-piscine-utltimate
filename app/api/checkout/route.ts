import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getProduct, ProductId } from "@/lib/products";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  const origin = req.headers.get("origin");
  if (origin) return origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function nextOtoPath(productId: ProductId): string {
  switch (productId) {
    case "ebook":
      return "/oto1";
    case "outils":
      return "/oto2";
    case "fiches":
      return "/oto3";
    case "bundle":
      return "/success";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { product?: string };
    const product = getProduct(body.product || "");
    if (!product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: product.priceCents,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
        },
      ],
      customer_creation: "always",
      metadata: {
        products: product.id,
      },
      success_url: `${baseUrl}${nextOtoPath(product.id)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vente`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

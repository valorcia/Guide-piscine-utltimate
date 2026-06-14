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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { product?: string; products?: string[]; email?: string };

    // Support backward compat (single product) + cart multi-produits
    const rawIds = Array.isArray(body.products) && body.products.length > 0
      ? body.products
      : body.product
      ? [body.product]
      : [];

    const products = rawIds
      .map((id) => getProduct(id))
      .filter((p): p is NonNullable<ReturnType<typeof getProduct>> => p !== null);

    if (products.length === 0) {
      return NextResponse.json({ error: "Unknown product(s)" }, { status: 400 });
    }

    const email = (body.email || "").trim().toLowerCase();
    const validEmail = EMAIL_RE.test(email) ? email : undefined;

    const baseUrl = getBaseUrl(req);
    const stripe = getStripe();

    // Si plusieurs produits OU si c'est le bundle : on saute le tunnel OTO
    // et on envoie direct sur /success. Sinon on garde le funnel (vente seule).
    const isCart = products.length > 1 || products[0].id === "bundle";
    const successPath = isCart ? "/success" : nextOtoPath(products[0].id);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: products.map((p) => ({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: p.priceCents,
          product_data: {
            name: p.name,
            description: p.description,
          },
        },
      })),
      customer_creation: "always",
      customer_email: validEmail,
      metadata: {
        products: products.map((p) => p.id).join(","),
        ...(validEmail ? { email: validEmail } : {}),
      },
      success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vente`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

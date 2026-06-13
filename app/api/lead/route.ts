import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; product?: string };
    const email = (body.email || "").trim().toLowerCase();
    const product = (body.product || "").trim();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Lead capture : log côté serveur (visible dans Vercel logs).
    // Brancher ici un CRM / Notion / Resend audience si besoin.
    console.log(`[lead] email=${email} product=${product} at=${new Date().toISOString()}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

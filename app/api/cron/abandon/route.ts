import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { Resend } from "resend";

export const runtime = "nodejs";

// Fenêtre serrée alignée sur le cron (30 min) :
// chaque session abandonnée tombe dans la fenêtre une seule fois.
const RELANCE_WINDOW_MIN_MIN = 60; // ≥ 1h après la création
const RELANCE_WINDOW_MAX_MIN = 95; // ≤ 1h35 (cron = */30, marge de 5min pour les retards)

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function relanceEmailHtml(productName: string, ventePath: string): string {
  const baseUrl = getBaseUrl();
  return `<!doctype html>
<html><body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#0A2540;background:#fafafa;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(10,37,64,0.12);padding:40px;border-radius:4px">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700">Tu as oublié quelque chose ?</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(10,37,64,0.85)">
      Tu étais à deux clics d'obtenir <strong>${productName}</strong>. On garde ton panier au chaud — clique pour reprendre où tu en étais.
    </p>
    <p style="margin:0 0 28px">
      <a href="${baseUrl}${ventePath}" style="display:inline-block;background:#E8A020;color:#fff;text-decoration:none;padding:14px 32px;border-radius:3px;font-weight:600">Reprendre ma commande →</a>
    </p>
    <p style="margin:0;font-size:13px;color:rgba(10,37,64,0.62);line-height:1.6">
      Si tu n'es plus intéressé, ignore simplement cet email.
    </p>
  </div>
</body></html>`;
}

function productNameFromMetadata(meta: Record<string, string> | null | undefined): { name: string; path: string } {
  const pid = meta?.products || "";
  switch (pid) {
    case "outils":
      return { name: "le Pack Outils Premium", path: "/oto1" };
    case "fiches":
      return { name: "le Kit Fiches Urgences", path: "/oto2" };
    case "bundle":
      return { name: "le Bundle complet", path: "/oto3" };
    case "ebook":
    default:
      return { name: "le guide « Fini l'eau verte »", path: "/vente" };
  }
}

function authorized(req: NextRequest): boolean {
  // Vercel Cron envoie l'en-tête `Authorization: Bearer ${CRON_SECRET}`.
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // pas de secret défini → on autorise (dev)
  const got = req.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM || "Fini l'eau verte <noreply@example.com>";

  const stripe = getStripe();

  const now = Math.floor(Date.now() / 1000);
  const minCreated = now - RELANCE_WINDOW_MAX_MIN * 60;
  const maxCreated = now - RELANCE_WINDOW_MIN_MIN * 60;

  // On liste les sessions créées dans la fenêtre [-3h, -1h]
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: minCreated, lte: maxCreated },
  });

  // Recense d'abord les emails qui ont déjà un paiement réussi dans la fenêtre
  // pour éviter de relancer un client qui a déjà acheté un autre produit.
  const paidEmails = new Set<string>();
  for (const s of sessions.data) {
    if (s.payment_status === "paid") {
      const e = s.customer_details?.email?.toLowerCase();
      if (e) paidEmails.add(e);
    }
  }

  const emailed = new Set<string>();
  const sent: string[] = [];

  for (const s of sessions.data) {
    if (s.payment_status === "paid") continue;

    const email = s.customer_details?.email || s.metadata?.email;
    if (!email) continue;
    const lower = email.toLowerCase();
    if (emailed.has(lower)) continue;
    if (paidEmails.has(lower)) continue;

    const { name, path } = productNameFromMetadata(s.metadata);
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: "Tu as oublié quelque chose ?",
        html: relanceEmailHtml(name, path),
      });
      emailed.add(lower);
      sent.push(lower);
    } catch (err) {
      console.error(`[abandon] send fail email=${lower}`, err);
    }
  }

  return NextResponse.json({ ok: true, scanned: sessions.data.length, sent: sent.length });
}

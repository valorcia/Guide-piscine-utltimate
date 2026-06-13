import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyDownload } from "@/lib/signed-url";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "fini-leau-verte.pdf",
  "kit-outils-premium.pdf",
  "kit-fiches-urgences.pdf",
  "guide-saison-parfaite.pdf",
  "guide-electrolyse-sel.pdf",
]);

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const payload = verifyDownload(params.token);
  if (!payload) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré. Refais ta commande ou contacte le support." },
      { status: 403 }
    );
  }

  if (!ALLOWED.has(payload.filename)) {
    return NextResponse.json({ error: "Fichier inconnu" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "downloads", payload.filename);
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${payload.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

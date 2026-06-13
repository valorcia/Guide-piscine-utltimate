import { Resend } from "resend";
import { Product } from "./products";
import { buildDownloadUrl, signDownload } from "./signed-url";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

export interface DeliveryInput {
  email: string;
  products: Product[];
  baseUrl: string;
}

function renderEmailHtml(products: Product[], links: { label: string; url: string }[]): string {
  const productNames = products.map((p) => p.name).join(" + ");
  const listHtml = links
    .map(
      (l) =>
        `<li style="margin:10px 0"><a href="${l.url}" style="color:#0A2540;font-weight:600;text-decoration:none;border-bottom:1px solid #E8A020">${l.label}</a></li>`
    )
    .join("");

  return `<!doctype html>
<html><body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#0A2540;background:#fafafa;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(10,37,64,0.12);padding:40px;border-radius:4px">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700">Merci pour ta commande</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(10,37,64,0.85)">
      Voici tes liens de téléchargement pour <strong>${productNames}</strong>. Ces liens sont valables 48 heures — pense à enregistrer les PDFs sur ton ordinateur.
    </p>
    <ul style="list-style:none;padding:0;margin:0 0 28px">${listHtml}</ul>
    <p style="margin:0;font-size:13px;color:rgba(10,37,64,0.62);line-height:1.6">
      Une question ? Réponds simplement à cet email.<br/>
      Bonne lecture et bonne baignade.
    </p>
  </div>
</body></html>`;
}

export async function sendDeliveryEmail({ email, products, baseUrl }: DeliveryInput) {
  const links: { label: string; url: string }[] = [];
  for (const product of products) {
    for (const file of product.files) {
      const token = signDownload(file.filename, email);
      links.push({ label: file.label, url: buildDownloadUrl(baseUrl, token) });
    }
  }

  const html = renderEmailHtml(products, links);
  const from = process.env.RESEND_FROM || "Fini l'eau verte <noreply@example.com>";

  await getResend().emails.send({
    from,
    to: email,
    subject: "Tes guides — liens de téléchargement (valables 48h)",
    html,
  });

  return links;
}

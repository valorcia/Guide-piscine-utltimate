import { getStripe } from "@/lib/stripe";
import { getProduct, PRODUCTS } from "@/lib/products";
import { buildDownloadUrl, signDownload } from "@/lib/signed-url";
import Link from "next/link";

interface Props {
  searchParams: { session_id?: string };
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function loadOrder(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const productIds = (session.metadata?.products || "").split(",").filter(Boolean);
  const email = session.customer_details?.email || session.metadata?.email || "";
  const products = productIds.map((id) => getProduct(id)).filter(Boolean) as Array<NonNullable<ReturnType<typeof getProduct>>>;
  return { email, products, paid: session.payment_status === "paid" };
}

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;

  let content: React.ReactNode;
  if (!sessionId) {
    content = (
      <p style={{ color: "rgba(10,37,64,0.65)" }}>
        Session introuvable. Si tu viens d&apos;effectuer un paiement, vérifie ta boîte mail — tu dois avoir reçu les liens.
      </p>
    );
  } else {
    try {
      const { email, products, paid } = await loadOrder(sessionId);
      if (!paid) {
        content = <p>Ton paiement est en cours de traitement. Tu recevras les liens par email d&apos;ici quelques minutes.</p>;
      } else if (products.length === 0) {
        content = <p>Aucun produit associé à cette commande. Contacte le support.</p>;
      } else {
        const baseUrl = getBaseUrl();
        const links = products.flatMap((p) =>
          p.files.map((f) => ({
            label: f.label,
            url: buildDownloadUrl(baseUrl, signDownload(f.filename, email || "guest")),
          }))
        );
        content = (
          <>
            <p style={{ marginBottom: 24, color: "rgba(10,37,64,0.85)" }}>
              Merci pour ta commande{email ? ` — un email récap a été envoyé à ${email}` : ""}. Voici tes liens de téléchargement (valables 48h) :
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {links.map((l) => (
                <li key={l.url} style={{ margin: "12px 0" }}>
                  <a
                    href={l.url}
                    style={{
                      color: "#0A2540",
                      fontWeight: 600,
                      textDecoration: "none",
                      borderBottom: "2px solid #E8A020",
                      paddingBottom: 2,
                    }}
                  >
                    {l.label} →
                  </a>
                </li>
              ))}
            </ul>
          </>
        );
      }
    } catch {
      content = <p>Impossible de récupérer ta commande. Vérifie ta boîte mail.</p>;
    }
  }

  return (
    <main
      style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        color: "#0A2540",
        background: "#fff",
        minHeight: "100vh",
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, marginBottom: 8 }}>
          Paiement confirmé
        </h1>
        <p style={{ color: "rgba(10,37,64,0.55)", marginBottom: 32 }}>
          Ta commande est validée.
        </p>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(10,37,64,0.12)",
            padding: 40,
            borderRadius: 4,
          }}
        >
          {content}
        </div>
        <p style={{ marginTop: 40, fontSize: 13, color: "rgba(10,37,64,0.55)" }}>
          <Link href="/vente" style={{ color: "#0A2540" }}>← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  );
}

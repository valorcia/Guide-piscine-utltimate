import Link from "next/link";
import { PRODUCTS } from "@/lib/products";

export const dynamic = "force-static";

interface Card {
  href: string;
  badge?: string;
  kicker: string;
  title: string;
  price: string;
  oldPrice?: string;
  desc: string;
  bullets: string[];
  cta: string;
}

const CARDS: Card[] = [
  {
    href: "/vente",
    kicker: "Le guide",
    title: "Fini l'eau verte",
    price: `${(PRODUCTS.ebook.priceCents / 100).toFixed(0)}€`,
    desc: "Le guide complet pour une piscine cristalline toute l'année.",
    bullets: ["7 chapitres complets", "De la chimie de base aux cas avancés", "PDF illustré"],
    cta: "Découvrir le guide →",
  },
  {
    href: "/outils",
    kicker: "Pack outils",
    title: "Kit Outils Premium",
    price: `${(PRODUCTS.outils.priceCents / 100).toFixed(0)}€`,
    desc: "Checklists, calculateurs et planner saisonnier pour appliquer le guide.",
    bullets: ["Calculateurs imprimables", "Planner 12 mois", "Checklists hebdo & mensuelles"],
    cta: "Voir le pack outils →",
  },
  {
    href: "/fiches",
    kicker: "Kit urgences",
    title: "12 Fiches Action Rapide",
    price: `${(PRODUCTS.fiches.priceCents / 100).toFixed(0)}€`,
    desc: "12 fiches A5 plastifiables, une par situation d'urgence piscine.",
    bullets: ["Eau verte, algues noires, mousse…", "Format prêt à imprimer", "Solutions étape par étape"],
    cta: "Voir les fiches →",
  },
  {
    href: "/bundle",
    badge: "Best value",
    kicker: "Tout-en-un",
    title: "Bundle complet",
    price: `${(PRODUCTS.bundle.priceCents / 100).toFixed(0)}€`,
    oldPrice: "98€",
    desc: "Le guide + les 4 PDFs en un seul pack. Économisez 45%.",
    bullets: [
      "Fini l'eau verte (guide principal)",
      "Kit Outils Premium",
      "12 Fiches Urgences",
      "Guide Saison Parfaite + Électrolyse Sel",
    ],
    cta: "Prendre le bundle →",
  },
];

export default function Home() {
  return (
    <>
      <style>{`
        :root{--paper:#FFFFFF;--ink:#0A2540;--ink-65:rgba(10,37,64,0.62);--ink-45:rgba(10,37,64,0.45);--aqua:#00B4D8;--gold:#E8A020;--hair:rgba(10,37,64,0.12)}
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--paper);font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased}
        .home-wrap{max-width:1180px;margin:0 auto;padding:0 32px}
        .home-hero{padding:88px 0 56px;text-align:center;border-bottom:1px solid var(--hair)}
        .home-hero .kicker{font-size:12px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:var(--aqua);margin-bottom:18px;display:block}
        .home-hero h1{font-family:'Playfair Display',serif;font-weight:800;font-size:clamp(34px,5vw,56px);line-height:1.06;letter-spacing:-0.01em;max-width:820px;margin:0 auto}
        .home-hero h1 .it{font-style:italic;font-weight:500;color:var(--aqua)}
        .home-hero p{font-size:18px;color:var(--ink-65);max-width:600px;margin:24px auto 0;line-height:1.7}
        .home-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px;padding:64px 0}
        @media(max-width:780px){.home-grid{grid-template-columns:1fr;padding:40px 0}}
        .home-card{position:relative;background:#fff;border:1px solid var(--hair);border-radius:4px;padding:38px 34px;display:flex;flex-direction:column;transition:transform 0.3s,box-shadow 0.3s}
        .home-card:hover{transform:translateY(-4px);box-shadow:0 30px 60px -28px rgba(10,37,64,0.25)}
        .home-card .kicker{font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--aqua);margin-bottom:14px}
        .home-card h3{font-family:'Playfair Display',serif;font-weight:700;font-size:30px;line-height:1.15;letter-spacing:-0.01em;margin-bottom:10px}
        .home-card .price{font-family:'Playfair Display',serif;font-weight:700;font-size:34px;color:var(--ink);margin:6px 0 16px}
        .home-card .price .old{font-size:18px;color:var(--ink-45);text-decoration:line-through;margin-right:10px;font-weight:500}
        .home-card .desc{color:var(--ink-65);margin-bottom:22px}
        .home-card ul{list-style:none;padding:0;margin:0 0 30px}
        .home-card li{padding:8px 0 8px 22px;position:relative;color:var(--ink);font-size:15px}
        .home-card li::before{content:'';position:absolute;left:0;top:14px;width:6px;height:6px;background:var(--aqua);border-radius:50%}
        .home-card .cta{margin-top:auto;display:inline-block;background:var(--gold);color:var(--ink);font-weight:700;padding:14px 22px;border-radius:2px;text-align:center;text-decoration:none;font-size:15px;letter-spacing:0.01em;transition:transform 0.2s,box-shadow 0.3s}
        .home-card .cta:hover{transform:translateY(-2px);box-shadow:0 16px 34px -14px rgba(232,160,32,0.6)}
        .home-card .badge{position:absolute;top:-12px;right:24px;background:var(--ink);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;padding:6px 14px;border-radius:2px}
        .home-footer{border-top:1px solid var(--hair);padding:40px 0;text-align:center;font-size:13px;color:var(--ink-45)}
        .home-footer a{color:var(--ink-65)}
      `}</style>
      <main>
        <header className="home-hero">
          <div className="home-wrap">
            <span className="kicker">Fini l&apos;eau verte</span>
            <h1>
              Tout ce qu&apos;il faut <span className="it">pour une piscine cristalline.</span>
            </h1>
            <p>
              Un guide complet, des outils prêts à l&apos;emploi, des fiches d&apos;urgence et un bundle qui regroupe tout. Choisis ce qui te correspond.
            </p>
          </div>
        </header>

        <section className="home-wrap">
          <div className="home-grid">
            {CARDS.map((c) => (
              <article key={c.href} className="home-card">
                {c.badge ? <div className="badge">{c.badge}</div> : null}
                <span className="kicker">{c.kicker}</span>
                <h3>{c.title}</h3>
                <div className="price">
                  {c.oldPrice ? <span className="old">{c.oldPrice}</span> : null}
                  {c.price}
                </div>
                <p className="desc">{c.desc}</p>
                <ul>
                  {c.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <Link href={c.href} className="cta">
                  {c.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <footer className="home-footer">
          <div className="home-wrap">
            <p>
              <Link href="/resume">Lire le résumé du guide</Link> · Paiement sécurisé Stripe · Livraison instantanée par email
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

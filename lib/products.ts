export type ProductId = "ebook" | "outils" | "fiches" | "bundle";

export interface ProductFile {
  filename: string;
  label: string;
}

export interface Product {
  id: ProductId;
  name: string;
  description: string;
  priceCents: number;
  files: ProductFile[];
}

export const PRODUCTS: Record<ProductId, Product> = {
  ebook: {
    id: "ebook",
    name: "Fini l'eau verte — Le guide",
    description: "Le guide complet pour une piscine cristalline",
    priceCents: 2700,
    files: [
      { filename: "fini-leau-verte.pdf", label: "Fini l'eau verte (PDF)" },
    ],
  },
  outils: {
    id: "outils",
    name: "Pack Outils Premium",
    description: "Calculateurs et outils pour gérer ta piscine",
    priceCents: 2700,
    files: [
      { filename: "kit-outils-premium.pdf", label: "Kit Outils Premium" },
    ],
  },
  fiches: {
    id: "fiches",
    name: "Kit Fiches Urgences",
    description: "Fiches d'urgence prêtes à imprimer",
    priceCents: 1700,
    files: [
      { filename: "kit-fiches-urgences.pdf", label: "Kit Fiches Urgences" },
    ],
  },
  bundle: {
    id: "bundle",
    name: "Bundle complet — Guide + 4 PDFs",
    description: "Fini l'eau verte + Outils + Fiches + Saison + Électrolyse Sel",
    priceCents: 4900,
    files: [
      { filename: "fini-leau-verte.pdf", label: "Fini l'eau verte (guide principal)" },
      { filename: "kit-outils-premium.pdf", label: "Kit Outils Premium" },
      { filename: "kit-fiches-urgences.pdf", label: "Kit Fiches Urgences" },
      { filename: "guide-saison-parfaite.pdf", label: "Guide Saison Parfaite" },
      { filename: "guide-electrolyse-sel.pdf", label: "Guide Électrolyse au Sel" },
    ],
  },
};

export function getProduct(id: string): Product | null {
  return (PRODUCTS as Record<string, Product>)[id] ?? null;
}

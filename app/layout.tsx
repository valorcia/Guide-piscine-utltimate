import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fini l'eau verte",
  description: "Le guide complet pour une piscine cristalline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

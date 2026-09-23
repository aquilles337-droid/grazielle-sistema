import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Régua do Híbrido — Simulador da Reforma Tributária para o Simples Nacional",
  description:
    "Triagem tributária para contadores: compare Simples puro × regime híbrido (IBS/CBS por fora) conforme a LC 214/2025 e gere relatórios em PDF com a sua marca.",
  authors: [{ name: "Logon Contabilidade" }],
  creator: "Logon Contabilidade",
};

// Site só no tema claro: impede que navegadores (ex.: Opera/Chrome com "modo escuro
// forçado") invertam as cores da marca.
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#066782",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

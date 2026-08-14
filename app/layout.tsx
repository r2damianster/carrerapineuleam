import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PINE — Portal de Proyectos de Investigación ULEAM",
  description: "Portal de proyectos de investigación, innovación pedagógica e internacionalización de la Universidad Laica Eloy Alfaro de Manabí (ULEAM)",
  keywords: ["ULEAM", "investigación", "innovación pedagógica", "internacionalización", "educación"],
  authors: [{ name: "Arturo Rodríguez" }, { name: "Jhonny Villafuerte" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}

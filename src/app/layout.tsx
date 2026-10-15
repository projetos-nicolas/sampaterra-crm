import type { Metadata } from "next";
import "./globals.css";
import { ToastHost } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Sampa Terra CRM",
  description: "Sistema de Gestão — Sampa Terra e Construções",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}

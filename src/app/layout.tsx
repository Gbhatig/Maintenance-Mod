import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discrete Manufacturing ERP — Maintenance Module",
  description: "Cloud Maintenance Module for Forging & Machining Discrete ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PricingProvider } from "@/context/PricingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Konfigurator Garaży 3D",
  description: "Zbuduj swój własny garaż w 3D i otrzymaj wycenę online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        {/*
          PricingProvider owinięty tutaj — działa dla CAŁEJ aplikacji,
          zarówno dla konfiguratora (/) jak i panelu admina (/admin).
        */}
        <PricingProvider>{children}</PricingProvider>
      </body>
    </html>
  );
}

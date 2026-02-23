import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { I18nProvider } from "@/lib/i18n";
import { GlowCursor } from "@/components/effects/GlowCursor";
import { PageViewTracker } from "@/components/PageViewTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "mcw999 | Developer Portfolio",
    template: "%s | mcw999",
  },
  description:
    "Solo developer building tools for crypto trading, cultural experiences, and developer productivity.",
  metadataBase: new URL("https://mcw999.github.io/mcw999-hub"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    siteName: "mcw999",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "mcw999 - Developer Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  verification: {
    google: "g-MNnounAzTlSXHWLImkUCTzN-9EtJuLddFhWF_rU_I",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <I18nProvider>
          <GlowCursor />
          <PageViewTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}

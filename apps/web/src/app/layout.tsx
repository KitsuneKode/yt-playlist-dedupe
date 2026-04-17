/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ytdedupe.kitsunelabs.xyz"),
  title: "YT Dedupe | Nuke YouTube Playlist Duplicates",
  description:
    "The definitive engineering tool to clean massive YouTube playlists. Available as a headless CLI or a native DOM-bypassing browser extension.",
  keywords: ["youtube", "playlist", "dedupe", "duplicate", "cleaner", "extension", "cli"],
  authors: [{ name: "KitsuneKode" }],
  openGraph: {
    title: "YT Dedupe | Nuke YouTube Playlist Duplicates",
    description:
      "Instantly scan and remove duplicate videos from your YouTube playlists natively in your browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "YouTube Playlist Deduplicator",
    operatingSystem: "Windows, macOS, Linux, Chrome OS",
    applicationCategory: "BrowserExtension, DeveloperApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Instantly scan and remove duplicate videos from your YouTube playlists natively in your browser or via CLI.",
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased overflow-x-hidden selection:bg-brutal-accent selection:text-white border-x-[12px] border-brutal-fg/10 md:border-none">
        {children}
      </body>
    </html>
  );
}

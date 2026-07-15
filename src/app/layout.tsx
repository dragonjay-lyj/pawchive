import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "./_components/SiteFooter";
import { PrefsBoot } from "./_components/PrefsBoot";
import { AuthProvider } from "@/lib/supabase/auth-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { detectLocaleFromRequest } from "@/lib/i18n/server";
import { SITE_NAME, SITE_TAGLINE_EN, getSiteUrl } from "@/lib/site";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Public Archive for Creators`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE_EN,
  applicationName: SITE_NAME,
  keywords: [
    "pawchive", "patreon archive", "fanbox archive", "fantia archive",
    "subscribestar", "gumroad", "discord archive", "boosty", "afdian",
    "creator content", "public archive",
  ],
  authors: [{ name: "Pawchive community" }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "zh-CN": "/",
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Public Archive for Creators`,
    description: SITE_TAGLINE_EN,
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Public Archive for Creators`,
    description: SITE_TAGLINE_EN,
  },
  icons: {
    icon: "/favicon.ico",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await detectLocaleFromRequest();
  return (
    <html lang={locale} className="dark scroll-smooth">
      <head>
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} Community RSS`} href="/rss.xml" />
      </head>
      <body className="min-h-screen bg-surface-0 text-text-primary antialiased flex flex-col">
        <I18nProvider initial={locale}>
          <AuthProvider>
            <PrefsBoot />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

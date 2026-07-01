import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "./_components/SiteFooter";
import { PrefsBoot } from "./_components/PrefsBoot";
import { I18nProvider } from "@/lib/i18n/provider";
import { detectLocaleFromRequest } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Pawchive — Public Archive for Creators",
  description:
    "Pawchive is a public archiver for Patreon, Pixiv Fanbox, Fantia, and more. Browse, search, and discover content from your favorite creators.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await detectLocaleFromRequest();
  return (
    <html lang={locale} className="dark scroll-smooth">
      <body className="min-h-screen bg-surface-0 text-text-primary antialiased flex flex-col">
        <I18nProvider initial={locale}>
          <PrefsBoot />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}

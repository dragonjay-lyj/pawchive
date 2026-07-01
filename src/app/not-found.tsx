"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-display font-bold text-text-disabled">404</p>
        <h2 className="mt-4 text-xl font-bold">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t("notFound.body")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90"
        >
          {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
}

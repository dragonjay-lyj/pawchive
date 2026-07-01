"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  title?: string;
}

export function PostNavbar({ title }: Props) {
  const { t } = useI18n();
  return (
    <nav className="mica sticky top-0 z-50 border-b border-white/5">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="shrink-0">
            <span className="font-display text-lg tracking-tight">
              <span className="text-primary">Paw</span>chive
            </span>
          </Link>
          {title && (
            <span className="truncate text-sm text-text-tertiary hidden sm:block">
              / {title}
            </span>
          )}
        </div>
        <Link
          href="/browse"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {t("nav.browse")}
        </Link>
      </div>
    </nav>
  );
}

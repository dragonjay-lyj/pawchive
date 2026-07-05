"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  active?: "browse" | "search" | "creators" | "favorites" | "settings" | "manage" | null;
  showRightLinks?: boolean;
}

export function SiteNav({ active, showRightLinks = true }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const activeKey =
    active !== undefined
      ? active
      : pathname?.startsWith("/browse")
        ? "browse"
        : pathname?.startsWith("/search")
          ? "search"
          : pathname?.startsWith("/creators")
            ? "creators"
            : pathname?.startsWith("/favorites")
              ? "favorites"
            : pathname?.startsWith("/settings")
              ? "settings"
              : pathname?.startsWith("/manage")
                ? "manage"
                : null;

  const linkCls = (key: string) =>
    activeKey === key
      ? "rounded-lg bg-white/5 px-3 py-1.5 text-sm text-text-primary"
      : "rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary";

  const smallLinkCls = (key: string) =>
    activeKey === key
      ? "rounded-lg bg-white/5 px-3 py-1.5 text-sm text-text-primary"
      : "text-sm text-text-secondary hover:text-text-primary transition-colors";

  return (
    <nav className="mica sticky top-0 z-50 border-b border-white/5">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl tracking-tight">
              <span className="text-primary">Paw</span>chive
            </span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/browse" className={linkCls("browse")}>{t("nav.browse")}</Link>
            <Link href="/search" className={linkCls("search")}>{t("nav.search")}</Link>
            <Link href="/creators" className={linkCls("creators")}>{t("nav.creators")}</Link>
          </div>
        </div>
        {showRightLinks && (
          <div className="flex items-center gap-2">
            <Link href="/manage" className={smallLinkCls("manage")}>{t("nav.manage")}</Link>
            <Link href="/favorites" className={smallLinkCls("favorites")}>{t("nav.favorites")}</Link>
            <Link href="/settings" className={smallLinkCls("settings")}>{t("nav.settings")}</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

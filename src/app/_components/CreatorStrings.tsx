"use client";

import { useI18n } from "@/lib/i18n/provider";

const MAP = {
  announcements: "creator.section.announcements",
  fancards: "creator.section.fancards",
  recentWorks: "creator.section.recentWorks",
  emptyContent: "creator.emptyContent",
  contentError: "creator.contentError",
  creatorId: "creator.creatorId",
  statsPlatform: "creator.stats.platform",
  statsLinked: "creator.stats.linked",
} as const;

export function CreatorStrings({
  which,
  vars,
}: {
  which: keyof typeof MAP;
  vars?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return <>{t(MAP[which], vars)}</>;
}

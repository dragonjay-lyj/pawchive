"use client";

import { useMemo, useState } from "react";
import type { Announcement } from "@/lib/types";
import { getServiceColor, getServiceLabel } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { renderMarkdown } from "@/lib/markdown";

interface Props {
  announcements: Announcement[];
}

interface Group {
  key: string;       // "YYYY-MM"
  year: number;
  month: number;
  items: Announcement[];
}

function groupByMonth(items: Announcement[]): Group[] {
  const buckets = new Map<string, Group>();
  const sorted = [...items].sort((a, b) => +new Date(b.added) - +new Date(a.added));
  for (const a of sorted) {
    const d = new Date(a.added);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    let g = buckets.get(key);
    if (!g) {
      g = { key, year: y, month: m, items: [] };
      buckets.set(key, g);
    }
    g.items.push(a);
  }
  return Array.from(buckets.values());
}

export function AnnouncementsTimeline({ announcements }: Props) {
  const { t, locale } = useI18n();
  const groups = useMemo(() => groupByMonth(announcements), [announcements]);
  const currentKey = groups[0]?.key;
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(currentKey ? [currentKey] : []));

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const fmtMonth = (y: number, m: number) =>
    new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "long",
    }).format(new Date(y, m, 1));

  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));

  return (
    <div className="timeline-connector relative pl-6">
      {groups.map((g) => {
        const open = openKeys.has(g.key);
        return (
          <div key={g.key} className="mb-4">
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="relative -ml-6 flex w-full items-center gap-3 pl-6 text-left"
            >
              <span
                className={
                  "absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full ring-4 ring-surface-0 transition-colors " +
                  (open ? "bg-primary" : "bg-surface-4")
                }
              />
              <span className="text-xs font-medium text-text-primary">
                {fmtMonth(g.year, g.month)}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {g.items.length}
              </span>
              <span className={"ml-auto text-xs text-text-tertiary transition-transform " + (open ? "rotate-180" : "")}>
                ▾
              </span>
            </button>

            {open && (
              <div className="mt-3 space-y-3">
                {g.items.map((ann, i) => (
                  <div
                    key={ann.hash}
                    className="glass rounded-xl p-4 fade-in-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ color: getServiceColor(ann.service) }}
                      >
                        {getServiceLabel(ann.service)}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {fmtDay(ann.added)}
                      </span>
                    </div>
                    <div
                      className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-text-secondary [&_a]:break-all"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.content) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

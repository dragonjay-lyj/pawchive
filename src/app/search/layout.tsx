import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Pawchive's archive of Patreon, Fanbox, Fantia, SubscribeStar and Discord posts and creators.",
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}

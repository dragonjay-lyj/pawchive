import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse",
  description: "Browse recently imported posts from Patreon, Fanbox, Fantia, SubscribeStar, Discord and more.",
  alternates: { canonical: "/browse" },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}

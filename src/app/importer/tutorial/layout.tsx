import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to get your session key",
  description: "Step-by-step guide to finding your session cookie for Patreon, Fanbox, Fantia, SubscribeStar, Gumroad, Boosty, 爱发电 and Discord.",
  alternates: { canonical: "/importer/tutorial" },
};

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}

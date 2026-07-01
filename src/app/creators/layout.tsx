import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creators",
  description: "Browse thousands of archived creators from Patreon, Fanbox, Fantia, SubscribeStar, Discord, Gumroad, Boosty and 爱发电.",
  alternates: { canonical: "/creators" },
};

export default function CreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

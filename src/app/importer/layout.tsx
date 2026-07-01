import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import from paysite",
  description: "Contribute paid posts to Pawchive by submitting a session key from Patreon, Fanbox, Fantia, SubscribeStar, Gumroad, Boosty, 爱发电 or Discord.",
  alternates: { canonical: "/importer" },
};

export default function ImporterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

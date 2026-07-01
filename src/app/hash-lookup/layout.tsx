import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File Hash Lookup",
  description: "Look up file information by SHA-256 hash — find matching posts and Discord messages across Pawchive.",
  alternates: { canonical: "/hash-lookup" },
};

export default function HashLookupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

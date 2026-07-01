"use client";

import { useEffect } from "react";
import { bootstrapPrefs } from "@/lib/preferences";

export function PrefsBoot() {
  useEffect(() => {
    bootstrapPrefs();
  }, []);
  return null;
}

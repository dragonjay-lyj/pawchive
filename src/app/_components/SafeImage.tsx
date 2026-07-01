"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function SafeImage({ src, alt, className, fallback }: Props) {
  const [broken, setBroken] = useState(false);
  if (broken) return <>{fallback ?? null}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ImageItem {
  url: string;
  name: string;
}

export function PostLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: ImageItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const current = images[index];
  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const prev = useCallback(() => { if (canPrev) { setIndex((i) => i - 1); setZoom(1); setPan({ x: 0, y: 0 }); } }, [canPrev]);
  const next = useCallback(() => { if (canNext) { setIndex((i) => i + 1); setZoom(1); setPan({ x: 0, y: 0 }); } }, [canNext]);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z + 0.5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(1, z - 0.5)), []);
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, zoomIn, zoomOut, resetZoom]);

  // Scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomIn, zoomOut]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className="rounded-md bg-white/5 px-2 py-1 font-mono">{index + 1} / {images.length}</span>
          <span className="truncate max-w-[240px] hidden sm:inline">{current.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} disabled={zoom <= 1} className="rounded-lg bg-white/5 px-2 py-1 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30">−</button>
          <span className="text-[10px] font-mono text-white/40 min-w-[36px] text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={zoomIn} disabled={zoom >= 4} className="rounded-lg bg-white/5 px-2 py-1 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30">+</button>
          <button onClick={onClose} className="ml-1 rounded-lg bg-white/5 px-2 py-1 text-sm text-white/60 hover:bg-white/10" title="Close (Esc)">✕</button>
        </div>
      </div>

      {/* Prev / Next */}
      {canPrev && <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-3 text-white/80 hover:bg-white/10">‹</button>}
      {canNext && <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-3 text-white/80 hover:bg-white/10">›</button>}

      {/* Image */}
      <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt={current.name}
          className="max-h-[90vh] max-w-[95vw] object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: zoom > 1 ? "grab" : "default" }}
          draggable={false}
        />
      </div>

      {/* Bottom info bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 glass-strong px-4 py-2 text-xs text-white/60" onClick={(e) => e.stopPropagation()}>
        <span className="font-medium text-white/80">{current.name}</span>
        <span className="ml-3">Click background or Esc to close · ← → to navigate · +/- to zoom</span>
      </div>
    </div>
  );
}

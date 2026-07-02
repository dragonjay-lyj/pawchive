"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { FileAttachment } from "@/lib/types";
import { getFileUrl, getThumbUrl } from "@/lib/api";

interface Props {
  images: FileAttachment[];
}

/**
 * Image gallery with lazy loading + built-in lightbox.
 * - First image renders eagerly (LCP), rest use loading="lazy"
 * - Click opens fullscreen lightbox with keyboard/touch navigation
 * - Escape / backdrop click closes; arrows navigate; +/- zoom
 */
export function ImageGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setOpenIndex(i), []);
  const close = useCallback(() => setOpenIndex(null), []);

  if (images.length === 0) {
    return (
      <div className="glass flex aspect-[4/3] items-center justify-center rounded-2xl sm:aspect-[16/10]">
        <p className="text-text-secondary">No preview available</p>
      </div>
    );
  }

  const main = images[0];
  const extras = images.slice(1);

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <button
          type="button"
          onClick={() => open(0)}
          className="block w-full overflow-hidden rounded-2xl bg-surface-1"
          aria-label="Open image"
        >
          <img
            src={getThumbUrl(main.path)}
            alt={main.name}
            className="w-full object-contain cursor-zoom-in"
            style={{ maxHeight: "80vh" }}
            loading="eager"
            decoding="async"
          />
        </button>

        {/* Thumbnail strip */}
        {extras.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {extras.map((att, i) => (
              <button
                key={att.path}
                type="button"
                onClick={() => open(i + 1)}
                className="shrink-0"
                aria-label={`Open image ${i + 2}`}
              >
                <img
                  src={getThumbUrl(att.path)}
                  alt={att.name}
                  className="h-16 w-16 rounded-lg object-cover bg-surface-2 hover:ring-1 hover:ring-primary/50 transition-all sm:h-20 sm:w-20"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {openIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={openIndex}
          onClose={close}
        />
      )}
    </>
  );
}

// ============================================================
// Lightbox modal
// ============================================================
function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: FileAttachment[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  const current = images[index];
  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  const prev = useCallback(() => {
    if (!canPrev) return;
    setIndex((i) => i - 1);
    setZoom(1); setPan({ x: 0, y: 0 }); setLoaded(false);
  }, [canPrev]);
  const next = useCallback(() => {
    if (!canNext) return;
    setIndex((i) => i + 1);
    setZoom(1); setPan({ x: 0, y: 0 }); setLoaded(false);
  }, [canNext]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z + 0.5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(1, z - 0.5)), []);
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, zoomIn, zoomOut, resetZoom]);

  // Body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Drag to pan when zoomed
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  // Wheel zoom — use a ref-based handler to set passive: false,
  // because React's onWheel is passive in React 19 (e.preventDefault is a no-op).
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomIn, zoomOut]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.panX + (e.clientX - dragStart.x),
      y: dragStart.panY + (e.clientY - dragStart.y),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="rounded-md bg-white/5 px-2 py-1 font-mono">{index + 1} / {images.length}</span>
          <span className="truncate max-w-[240px] hidden sm:inline">{current.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            className="rounded-lg bg-white/5 px-2 py-1 text-sm text-text-secondary hover:bg-white/10 disabled:opacity-40"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            −
          </button>
          <span className="text-[10px] font-mono text-text-tertiary min-w-[36px] text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 4}
            className="rounded-lg bg-white/5 px-2 py-1 text-sm text-text-secondary hover:bg-white/10 disabled:opacity-40"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            +
          </button>
          <a
            href={getFileUrl(current.path)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-2 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-text-secondary hover:bg-white/10"
            title="Open full-resolution in new tab"
          >
            ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-lg bg-white/5 px-2 py-1 text-sm text-text-secondary hover:bg-white/10"
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Prev / next */}
      {canPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-3 text-text-primary hover:bg-white/10 sm:left-4"
          aria-label="Previous"
          title="Previous (←)"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-3 text-text-primary hover:bg-white/10 sm:right-4"
          aria-label="Next"
          title="Next (→)"
        >
          ›
        </button>
      )}

      {/* Image */}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        {!loaded && (
          <div className="absolute h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
        <img
          key={current.path}
          src={getFileUrl(current.path)}
          alt={current.name}
          onLoad={() => setLoaded(true)}
          draggable={false}
          className={`max-h-full max-w-full select-none transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.15s ease",
          }}
        />
      </div>

      {/* Bottom thumb strip */}
      {images.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex justify-center overflow-x-auto bg-black/40 backdrop-blur-md py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5 px-4">
            {images.map((att, i) => (
              <button
                key={att.path}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setZoom(1); setPan({ x: 0, y: 0 }); setLoaded(false);
                }}
                className={
                  "shrink-0 overflow-hidden rounded-md border transition-all " +
                  (i === index
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-transparent opacity-60 hover:opacity-100")
                }
              >
                <img
                  src={getThumbUrl(att.path)}
                  alt=""
                  className="h-12 w-12 object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

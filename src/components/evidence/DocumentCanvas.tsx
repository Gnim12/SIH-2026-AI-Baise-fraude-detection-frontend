import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../../api/client';
import type { Size } from '../../lib/geometry';
import { fitContain } from '../../lib/geometry';
import type { ScreenedDocument, Signal } from '../../types/screening';
import type { FocusedRegion } from './RegionOverlay';
import { RegionOverlay } from './RegionOverlay';
import type { ViewKey } from './ViewToggle';
import { ViewToggle } from './ViewToggle';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DEFAULT_HEATMAP_OPACITY = 70;

interface DocumentCanvasProps {
  document: ScreenedDocument | null;
  /** Signals for this document only — regionless signals are ignored here. */
  signals: Signal[];
  activeView: ViewKey;
  onActiveViewChange: (view: ViewKey) => void;
  focusedRegion: FocusedRegion | null;
  onRegionFocus: (signal: Signal) => void;
}

/** Renders `document.imageUrl` (or the active view's image) scaled to fit,
 *  with a clickable region overlay, view toggle, heatmap blend, and
 *  scroll-to-zoom / drag-to-pan / double-click-to-fit (§5.3). */
export function DocumentCanvas({
  document,
  signals,
  activeView,
  onActiveViewChange,
  focusedRegion,
  onRegionFocus,
}: DocumentCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [heatmapOpacity, setHeatmapOpacity] = useState(DEFAULT_HEATMAP_OPACITY);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; panX: number; panY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });

  // Reset zoom/pan whenever the document (or its rendered image) changes.
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize({ width: 0, height: 0 });
  }, [document?.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Wheel-to-zoom needs a non-passive listener to call preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };

  const handlePointerUp = () => {
    dragState.current.dragging = false;
  };

  const handleDoubleClick = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  if (!document) {
    // Same height as the populated canvas below (§8: "reserve height with
    // skeletons matching final rendered size" — this placeholder IS that
    // skeleton, so the classified image arriving causes no jump).
    return (
      <div className="flex h-[420px] items-center justify-center rounded border border-shell-700 bg-canvas text-scale-3 text-canvas-ink/60">
        Awaiting document…
      </div>
    );
  }

  const baseKey: ViewKey = activeView === 'heatmap' ? 'rgb' : activeView;
  const baseSrc = document.views[baseKey] ?? document.views.rgb ?? document.imageUrl;
  const heatmapSrc = document.views.heatmap;
  const showHeatmapOverlay = activeView === 'heatmap' && Boolean(heatmapSrc);

  const fitted = fitContain(containerSize, naturalSize);
  const regionSignals = signals.filter((s) => s.region && s.region.documentId === document.id);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="relative h-[420px] touch-none overflow-hidden rounded border border-shell-700 bg-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          data-testid="document-canvas-stage"
          className="absolute cursor-grab active:cursor-grabbing"
          style={{
            left: fitted.x,
            top: fitted.y,
            width: fitted.width,
            height: fitted.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {baseSrc ? (
            <img
              src={resolveAssetUrl(baseSrc)}
              alt={`${document.type} — ${activeView} view`}
              draggable={false}
              className="block h-full w-full select-none"
              onLoad={(e) =>
                setNaturalSize({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                })
              }
            />
          ) : null}
          {showHeatmapOverlay && heatmapSrc ? (
            <img
              src={resolveAssetUrl(heatmapSrc)}
              alt="Heatmap overlay"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
              style={{ mixBlendMode: 'multiply', opacity: heatmapOpacity / 100 }}
            />
          ) : null}
          <RegionOverlay
            signals={regionSignals}
            renderBox={{ x: 0, y: 0, width: fitted.width, height: fitted.height }}
            focused={focusedRegion}
            onRegionClick={onRegionFocus}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewToggle views={document.views} active={activeView} onChange={onActiveViewChange} />
        {activeView === 'heatmap' && heatmapSrc ? (
          <label className="flex items-center gap-2 text-scale-2 text-steel-400">
            heatmap opacity
            <input
              type="range"
              min={0}
              max={100}
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
              aria-label="Heatmap opacity"
            />
            <span className="font-mono text-steel-200">{heatmapOpacity}%</span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

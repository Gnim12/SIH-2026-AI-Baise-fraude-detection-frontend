import { useEffect, useState } from 'react';
import type { Box } from '../../lib/geometry';
import { regionToPixels } from '../../lib/geometry';
import type { Signal } from '../../types/screening';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface FocusedRegion {
  signalId: string;
  /** Bumped on every focus, even re-focusing the same signal, so the pulse
   *  animation restarts instead of no-opping on an unchanged key. */
  nonce: number;
}

interface RegionOverlayProps {
  /** Signals belonging to the document currently shown, filtered to those
   *  carrying a region. */
  signals: Signal[];
  /** The local render box (image's rendered size within the canvas) — region
   *  coordinates are relative to this, not the outer container. */
  renderBox: Box;
  focused: FocusedRegion | null;
  onRegionClick: (signal: Signal) => void;
}

/** A single region box. Owns its own pulse-vs-instant transition (§4 Motion
 *  point 3) via a local mount key so re-focusing the same region restarts it. */
function RegionBox({
  signal,
  box,
  isFocused,
  focusNonce,
  onClick,
}: {
  signal: Signal;
  box: Box;
  isFocused: boolean;
  focusNonce: number;
  onClick: () => void;
}) {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setPulsing(false);
      return;
    }
    if (prefersReducedMotion()) {
      setPulsing(false);
      return;
    }
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 200);
    return () => clearTimeout(timer);
    // focusNonce intentionally in deps: re-clicking the same region must restart the pulse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, focusNonce]);

  return (
    <button
      type="button"
      data-signal-id={signal.id}
      aria-label={signal.detail}
      title={signal.detail}
      onClick={onClick}
      className={`absolute rounded-sm border-2 transition-colors ${
        isFocused ? 'border-hold' : 'border-hold/50 hover:border-hold'
      } ${pulsing ? 'region-pulse' : ''}`}
      style={{
        left: box.x,
        top: box.y,
        width: Math.max(box.width, 2),
        height: Math.max(box.height, 2),
      }}
    />
  );
}

export function RegionOverlay({ signals, renderBox, focused, onRegionClick }: RegionOverlayProps) {
  const localBox: Box = { x: 0, y: 0, width: renderBox.width, height: renderBox.height };

  return (
    <>
      {signals
        .filter((s) => s.region)
        .map((signal) => {
          const box = regionToPixels(signal.region!, localBox);
          const isFocused = focused?.signalId === signal.id;
          return (
            <RegionBox
              key={signal.id}
              signal={signal}
              box={box}
              isFocused={isFocused}
              focusNonce={focused?.nonce ?? 0}
              onClick={() => onRegionClick(signal)}
            />
          );
        })}
    </>
  );
}

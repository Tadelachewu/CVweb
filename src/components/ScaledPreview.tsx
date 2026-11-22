"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shows a full-size (mm-based) page scaled down to fit its container width,
 * while reserving the correct scaled height so nothing is clipped.
 */
export function ScaledPreview({ children, maxScale = 1 }: { children: ReactNode; maxScale?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const naturalW = i.offsetWidth;
      const naturalH = i.offsetHeight;
      if (!naturalW) return;
      const s = Math.min(maxScale, o.clientWidth / naturalW);
      setScale(s);
      setHeight(naturalH * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={outer} className="w-full overflow-hidden" style={{ height: height || undefined }}>
      <div
        ref={inner}
        className="w-max origin-top-left shadow-[0_1px_3px_rgba(0,0,0,.12),0_8px_24px_rgba(0,0,0,.08)]"
        style={{ transform: `scale(${scale || 0.0001})`, visibility: scale ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}

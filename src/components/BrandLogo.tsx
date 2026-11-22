"use client";

import { useState } from "react";

/**
 * App logo from /brand/logo.jpg. Hidden until it loads, and replaced by a text
 * mark if the file is missing, so a broken image is never shown.
 */
export function BrandLogo({ size = 36 }: { size?: number }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  return (
    <span className="inline-flex shrink-0 items-center" style={{ width: size, height: size }}>
      {state !== "missing" && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny static asset
        <img
          src="/brand/logo.jpg"
          alt=""
          width={size}
          height={size}
          onLoad={() => setState("ok")}
          onError={() => setState("missing")}
          className={`h-full w-full rounded-full object-cover ring-1 ring-gray-200 ${state === "ok" ? "" : "hidden"}`}
        />
      )}
      {state !== "ok" && (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white"
        >
          CV
        </span>
      )}
    </span>
  );
}

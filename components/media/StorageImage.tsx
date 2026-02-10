// components/media/StorageImage.tsx
"use client";

import { useMemo, useState } from "react";

type Props = {
  /**
   * NEW: Primary URL we want to try first.
   */
  primarySrc: string | null;
  /**
   * NEW: Fallback URL if the primary fails to load.
   */
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
};

export default function StorageImage({
  primarySrc,
  fallbackSrc = null,
  alt,
  className,
}: Props) {
  // NEW: Start with the primary URL (if provided)
  const initial = useMemo(() => primarySrc ?? null, [primarySrc]);
  const [src, setSrc] = useState<string | null>(initial);

  if (!src) {
    return (
      <div
        className={
          className ??
          "flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500"
        }
      >
        No thumbnail
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className ?? "h-full w-full object-cover"}
      // NEW: If the primary fails, automatically try the fallback once.
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
        } else {
          setSrc(null);
        }
      }}
    />
  );
}

"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { SOURCE_LIMIT } from "@/lib/source-model";

/** Authenticated, viewport-only raster snapshots. No external fetch or object URLs. */
export function PrivateFileThumbnail({
  url,
  org,
  mime,
  version,
  fallback,
  name,
}: {
  url: string | null;
  org: string;
  mime: string;
  version: string;
  fallback: ReactNode;
  name: string;
}) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = wrapper.current,
      surface = canvas.current;
    if (
      !root ||
      !surface ||
      !url ||
      !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mime)
    )
      return;
    let request: AbortController | null = null;
    let visible = false;
    function clear() {
      request?.abort();
      request = null;
      root!.removeAttribute("data-ready");
      surface!.getContext("2d")?.clearRect(0, 0, 64, 64);
    }
    async function load() {
      clear();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch(url!, {
          headers: { "x-organization-id": org },
          cache: "no-store",
          signal: controller.signal,
        });
        if (
          !response.ok ||
          response.headers.get("content-type")?.split(";")[0] !== mime
        )
          return;
        const blob = await response.blob();
        if (blob.size > SOURCE_LIMIT || controller.signal.aborted) return;
        // Browser decoder renders one frame to a bounded 64px raster, never HTML/SVG.
        const bitmap = await createImageBitmap(blob, {
          resizeWidth: 64,
          resizeHeight: 64,
          resizeQuality: "low",
        });
        try {
          if (controller.signal.aborted) return;
          surface!.getContext("2d")?.drawImage(bitmap, 0, 0);
          root!.setAttribute("data-ready", "true");
        } finally {
          bitmap.close();
        }
      } catch {
        /* Missing/revoked/invalid files retain the type icon. */
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) void load();
      else clear();
    });
    const visibility = () => {
      if (document.hidden) clear();
      else if (visible) void load();
    };
    observer.observe(root);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      clear();
    };
  }, [url, org, mime, version]);
  return (
    <span ref={wrapper} className="file-thumbnail">
      <span className="file-thumbnail-fallback">{fallback}</span>
      <canvas
        ref={canvas}
        width={64}
        height={64}
        role="img"
        aria-label={`Miniatura de ${name}`}
      />
    </span>
  );
}

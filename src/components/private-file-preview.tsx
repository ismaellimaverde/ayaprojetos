"use client";
import { useEffect, useRef, useState, useId } from "react";
import { SOURCE_LIMIT } from "@/lib/file-size";

export function PrivateFilePreview({
  path,
  org,
  name,
  mime,
  onClose,
}: {
  path: string;
  org: string;
  name: string;
  mime: string;
  onClose: () => void;
}) {
  const descriptionId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !dimensions) return;
    const fit = () => {
      const availableWidth = Math.max(160, window.innerWidth - 64);
      const availableHeight = Math.max(
        80,
        window.innerHeight * 0.9 -
          (controls.current?.getBoundingClientRect().height || 60) -
          48,
      );
      const scale = Math.min(
        1,
        availableWidth / dimensions.width,
        availableHeight / dimensions.height,
      );
      surface.style.width = `${Math.floor(dimensions.width * scale)}px`;
      surface.style.height = `${Math.floor(dimensions.height * scale)}px`;
      if (dialog.current)
        dialog.current.style.width = `${Math.max(208, Math.floor(dimensions.width * scale)) + 32}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    const observer = new ResizeObserver(fit);
    if (controls.current) observer.observe(controls.current);
    return () => {
      window.removeEventListener("resize", fit);
      observer.disconnect();
    };
  }, [dimensions]);
  const [state, setState] = useState("Carregando visualização…");
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const modal = dialog.current;
    modal?.showModal();
    return () => {
      modal?.close();
      opener?.focus();
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    let disposePdf: (() => void) | undefined;
    const timeout = setTimeout(() => {
      abort.abort();
      disposePdf?.();
      setState("A visualização demorou demais. Feche e tente novamente.");
    }, 15000);
    async function load() {
      try {
        const r = await fetch(path, {
          headers: { "x-organization-id": org },
          cache: "no-store",
          signal: abort.signal,
        });
        if (!r.ok)
          throw new Error("Arquivo indisponível para seu acesso atual.");
        if (r.headers.get("content-type")?.split(";")[0] !== mime)
          throw new Error("Formato indisponível para visualização.");
        const blob = await r.blob();
        if (blob.size > SOURCE_LIMIT)
          throw new Error("Arquivo excede o limite de visualização.");
        const surface = canvas.current;
        if (!surface || abort.signal.aborted) return;
        if (mime === "application/pdf") {
          const pdfjs = await import("pdfjs-dist");
          if (abort.signal.aborted) return;
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
          const task = pdfjs.getDocument({
            data: new Uint8Array(await blob.arrayBuffer()),
            enableXfa: false,
            useWorkerFetch: false,
            useSystemFonts: false,
            maxImageSize: 16000000,
            isOffscreenCanvasSupported: false,
          });
          disposePdf = () => {
            void task.destroy();
          };
          if (abort.signal.aborted) {
            void task.destroy();
            return;
          }
          const pdf = await task.promise;
          if (abort.signal.aborted) return;
          const page = await pdf.getPage(1);
          if (abort.signal.aborted) return;
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(
              1.5,
              1200 / Math.max(original.width, original.height),
            ),
          });
          surface.width = Math.ceil(viewport.width);
          surface.height = Math.ceil(viewport.height);
          // Canvas only: no annotations, hyperlinks, scripting, forms or embedded actions.
          await page.render({
            canvas: surface,
            viewport,
            annotationMode: pdfjs.AnnotationMode.DISABLE,
          }).promise;
        } else if (
          ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mime)
        ) {
          const bitmap = await createImageBitmap(blob);
          try {
            if (abort.signal.aborted) return;
            if (bitmap.width * bitmap.height > 16000000)
              throw new Error(
                "Imagem grande demais para a prévia. Use o download.",
              );
            const scale = Math.min(
              1,
              1200 / Math.max(bitmap.width, bitmap.height),
            );
            surface.width = Math.ceil(bitmap.width * scale);
            surface.height = Math.ceil(bitmap.height * scale);
            surface
              .getContext("2d")
              ?.drawImage(bitmap, 0, 0, surface.width, surface.height);
          } finally {
            bitmap.close();
          }
        } else
          throw new Error(
            "Este formato não tem visualização. Use o download ou abra o original.",
          );
        if (!abort.signal.aborted) {
          setDimensions({ width: surface.width, height: surface.height });
          setState("");
        }
      } catch (e) {
        if (!abort.signal.aborted)
          setState(
            e instanceof Error
              ? e.message
              : "Não foi possível visualizar o arquivo.",
          );
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      clearTimeout(timeout);
      abort.abort();
      disposePdf?.();
    };
  }, [path, org, mime]);
  return (
    <dialog
      ref={dialog}
      className="boss-dialog private-file-preview"
      aria-label={`Visualizar arquivo: ${name}`}
      aria-describedby={mime === "application/pdf" ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div ref={controls} className="private-preview-controls">
        <div className="heading">
          <h3>{name}</h3>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            autoFocus
          >
            Fechar visualização
          </button>
        </div>
      </div>
      {mime === "application/pdf" && (
        <p id={descriptionId} hidden>
          Visualização somente da primeira página do PDF.
        </p>
      )}
      {state && <p role="status">{state}</p>}
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Conteúdo de ${name}`}
        hidden={!!state}
      />
    </dialog>
  );
}

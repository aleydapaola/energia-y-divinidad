"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { OnlineAudioPlayer } from "@/components/newsletter/MeditationGiftPlayer";

import type { FreeFile } from "@/lib/digital-products/free-product";

function OnlinePdf({ src, title }: { src: string; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [width, setWidth] = useState(300);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    const element = container.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(120, Math.floor(entry.contentRect.width)))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setFailed(false);
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (cancelled) {
        return;
      }
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const loading = pdfjs.getDocument({ url: src, useSystemFonts: true });
      dispose = () => {
        void loading.destroy();
      };
      const pdf = await loading.promise;
      if (cancelled || !canvas.current) {
        return;
      }
      setCount(pdf.numPages);
      const documentPage = await pdf.getPage(page);
      if (cancelled || !canvas.current) {
        return;
      }
      const viewport = documentPage.getViewport({
        scale: width / documentPage.getViewport({ scale: 1 }).width,
      });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.floor(viewport.width * ratio);
      element.height = Math.floor(viewport.height * ratio);
      const context = element.getContext("2d");
      if (!context) {
        throw new Error("Canvas unavailable");
      }
      await documentPage.render({
        canvas: element,
        canvasContext: context,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      }).promise;
      const content = await documentPage.getTextContent();
      if (!cancelled) {
        setText(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
    })().catch(() => {
      if (!cancelled) {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [src, page, width]);
  return (
    <div
      ref={container}
      className="min-w-0 space-y-4"
      onContextMenu={(event) => event.preventDefault()}
    >
      {failed ? (
        <p role="alert">No se ha podido abrir el documento. Vuelve a intentarlo.</p>
      ) : (
        <>
          <canvas
            ref={canvas}
            className="max-w-full h-auto"
            aria-label={`${title}, página ${page}`}
            role="img"
          />
          <p className="sr-only">{text}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="min-h-11 rounded-lg border px-4 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span aria-live="polite">
              Página {page}
              {count > 0 && ` de ${count}`}
            </span>
            <button
              className="min-h-11 rounded-lg border px-4 disabled:opacity-40"
              disabled={!count || page >= count}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function FreeProductViewer({ productId, files }: { productId: string; files: FreeFile[] }) {
  return (
    <section className="space-y-6 print:hidden" aria-label="Contenido gratuito en línea">
      <h2 className="font-gazeta text-2xl text-[#654177]">Gratis · disfruta en línea</h2>
      <p>Lee, mira o escucha aquí. La descarga no está habilitada.</p>
      {!files.length && (
        <p role="status">El contenido está en preparación. Vuelve a visitarlo más tarde.</p>
      )}
      {files.map((file) => {
        const src = `/api/productos/${encodeURIComponent(productId)}/gratis/${encodeURIComponent(file.key)}`;
        return (
          <article key={file.key} className="min-w-0 space-y-4 rounded-2xl bg-white p-4 sm:p-6">
            <h3 className="text-xl">{file.title}</h3>
            <FreeMedia src={src} file={file} />
          </article>
        );
      })}
    </section>
  );
}

function FreeMedia({ src, file }: { src: string; file: FreeFile }) {
  if (file.contentType === "application/pdf") {
    return <OnlinePdf src={src} title={file.title} />;
  }
  if (file.contentType.startsWith("audio/")) {
    return <OnlineAudioPlayer src={src} label={`Escuchar ${file.title}`} />;
  }
  if (file.contentType.startsWith("video/")) {
    return (
      <video
        className="w-full"
        controls
        controlsList="nodownload"
        disablePictureInPicture
        preload="metadata"
        aria-label={`Ver ${file.title}`}
        src={src}
        onContextMenu={(event) => event.preventDefault()}
      />
    );
  }
  // Same-origin online response, without an external optimizer or public Drive URL.
  return (
    <Image
      unoptimized
      width={1200}
      height={800}
      className="max-w-full h-auto"
      src={src}
      alt={file.title}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

"use client";

import { useRef, useState } from "react";

import { CAMPAIGN_PDF_LIMIT, type CampaignAttachmentView } from "@/lib/campaign-attachment";

export function CampaignAttachments({
  draftId,
  attachments,
  onChange,
  onBusy,
}: {
  draftId: string | undefined;
  attachments: CampaignAttachmentView[];
  onChange: (value: CampaignAttachmentView[]) => void;
  onBusy: (value: boolean) => void;
}) {
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function call(body: Record<string, unknown>) {
    const result = await fetch(`/api/admin/communications/drafts/${draftId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await result.json();
    if (!result.ok) {
      throw new Error(data.error ?? "No se pudo gestionar el PDF en Google Drive.");
    }
    return data;
  }

  async function upload(file: File) {
    setFailedFile(null);
    setError("");
    if (
      file.size < 5 ||
      file.size > CAMPAIGN_PDF_LIMIT ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Selecciona un PDF de hasta 10 MB.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setProgress(0);
    try {
      if ((await file.slice(0, 5).text()) !== "%PDF-") {
        throw new Error("El archivo seleccionado no tiene un encabezado PDF válido.");
      }
      const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join(
        ""
      );
      const attempt = await call({ action: "start", filename: file.name, size: file.size, sha256 });
      if (!attachments.some(({ id }) => id === attempt.id)) {
        onChange([
          ...attachments,
          { id: attempt.id, filename: file.name, size: file.size, downloadUrl: null },
        ]);
      }
      if (!attempt.complete) {
        const sessionUrl = new URL(attempt.sessionUrl);
        if (
          sessionUrl.origin !== "https://www.googleapis.com" ||
          sessionUrl.pathname !== "/upload/drive/v3/files" ||
          !sessionUrl.searchParams.get("upload_id") ||
          sessionUrl.username ||
          sessionUrl.password
        ) {
          throw new Error("La sesión de subida no corresponde a Google Drive.");
        }
        let status = await call({ action: "status", id: attempt.id });
        while (!status.complete) {
          const start = status.offset;
          if (!Number.isSafeInteger(start) || start < 0 || start >= file.size) {
            throw new Error("No se pudo verificar el progreso de la subida.");
          }
          const end = Math.min(start + 4 * 1024 * 1024, file.size);
          const response = await fetch(sessionUrl, {
            method: "PUT",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            redirect: "manual",
            headers: {
              "Content-Type": "application/pdf",
              "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
            },
            body: file.slice(start, end),
            signal: AbortSignal.timeout(120_000),
          });
          if (!response.ok && response.status !== 308 && response.type !== "opaqueredirect") {
            throw new Error("La subida se interrumpió. Puedes reintentar el mismo PDF.");
          }
          status = await call({ action: "status", id: attempt.id });
          if (!status.complete && status.offset <= start) {
            throw new Error("Drive no confirmó el bloque. Puedes reintentar.");
          }
          setProgress(Math.round((status.offset * 100) / file.size));
        }
      }
      const attachment: CampaignAttachmentView = await call({ action: "finalize", id: attempt.id });
      onChange([...attachments.filter((item) => item.id !== attachment.id), attachment]);
      setProgress(100);
    } catch (error) {
      setFailedFile(file);
      setError(error instanceof Error ? error.message : "No se pudo subir el PDF.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await call({ action: "remove", id });
      onChange(attachments.filter((item) => item.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo retirar el PDF.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <fieldset className="mt-4 min-w-0 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Archivos PDF</legend>
      <p className="text-sm text-gray-600">
        {draftId
          ? "Cualquier persona que reciba el enlace podrá descargar el PDF."
          : "Guarda el borrador para adjuntar archivos PDF."}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void upload(file);
          }
        }}
      />
      <button
        type="button"
        className="mt-2 min-h-11 rounded-lg border px-3 text-sm"
        disabled={!draftId || busy}
        onClick={() => inputRef.current?.click()}
      >
        Adjuntar PDF
      </button>
      {busy && (
        <progress
          className="ml-2 max-w-full"
          aria-label="Progreso de subida"
          max={100}
          value={progress}
        />
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {failedFile && (
        <button
          type="button"
          className="ml-2 min-h-11 text-sm font-semibold"
          disabled={busy}
          onClick={() => upload(failedFile)}
        >
          Reintentar
        </button>
      )}
      <ul className="mt-2 space-y-2">
        {attachments.map(({ id, filename, downloadUrl }) => (
          <li key={id} className="flex flex-wrap items-center gap-x-3 text-sm">
            <span className="break-all">{filename}</span>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#654177]"
              >
                Descargar
              </a>
            ) : (
              <span>Pendiente de completar</span>
            )}
            <button
              type="button"
              className="min-h-11"
              disabled={busy}
              aria-label={`Retirar ${filename}`}
              onClick={() => remove(id)}
            >
              Retirar
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

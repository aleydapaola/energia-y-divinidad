type Progress = (percent: number) => void;

/** Only the scoped, expiring upload URI crosses into the browser. No Google tokens. */
export async function uploadProductDrive(file: File, productId: string, fileKey: string, token: string, progress: Progress) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/studio/product-drive", { method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, productId }),
    });
    if (!response.ok) { throw new Error("No se pudo verificar la subida privada."); }
    return response.json();
  }
  const upload = await call({ action: "start", fileKey, sha256, filename: file.name,
    contentType: file.type || "application/octet-stream", size: file.size });
  let status = upload.complete ? { complete: true, offset: file.size } : await call({ action: "status", id: upload.id });
  while (!status.complete) {
    const start = status.offset as number;
    if (!Number.isSafeInteger(start) || start < 0 || start >= file.size) { throw new Error("Estado de subida no válido."); }
    const end = Math.min(start + 4 * 1024 * 1024, file.size);
    const url = new URL(upload.sessionUrl);
    if (url.origin !== "https://www.googleapis.com" || url.pathname !== "/upload/drive/v3/files") { throw new Error("Destino no válido."); }
    const response = await fetch(url, { method: "PUT", credentials: "omit", referrerPolicy: "no-referrer", redirect: "error",
      headers: { "Content-Type": file.type || "application/octet-stream", "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      body: file.slice(start, end), signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok && response.status !== 308) { throw new Error("Se interrumpió la subida. Puedes reintentar el mismo archivo."); }
    status = await call({ action: "status", id: upload.id });
    if (!status.complete && status.offset <= start) { throw new Error("Drive no confirmó el bloque. Reintenta el mismo archivo."); }
    progress(Math.round(status.offset / file.size * 100));
  }
  const result = await call({ action: "finalize", id: upload.id });
  progress(100);
  return result as { internalFileRef: string; originalFilename: string; contentType: string; size: number };
}

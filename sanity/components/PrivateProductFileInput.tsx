import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { PatchEvent, set, useClient, useFormValue, useSource, type ObjectInputProps } from "sanity";

import { productFilePrefix, safeFilename } from "../../lib/digital-products/files";

/** Embedded Studio: reuse the editor's Sanity identity, never the site's ADMIN role. */
export function PrivateProductFileInput(props: ObjectInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const { auth } = useSource();
  const [editorToken, setEditorToken] = useState<string | null>(null);
  useEffect(() => {
    const subscription = auth.token?.subscribe(setEditorToken);
    return () => subscription?.unsubscribe();
  }, [auth]);
  const documentId = useFormValue(["_id"]) as string;
  const [storage, setStorage] = useState<{ ready: boolean; maximumSizeInBytes?: number }>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const endpoint = "/api/studio/product-files";
  useEffect(() => {
    let active = true;
    fetch(endpoint).then((response) => response.json()).then((data) => {
      if (active) { setStorage(data); }
    }).catch(() => { if (active) { setStorage({ ready: false }); } });
    return () => { active = false; };
  }, []);
  async function select(file: File) {
    setError("");
    const { dataset, token: configuredToken } = client.config();
    const token = editorToken || configuredToken;
    if (!token || !dataset || !documentId) {
      setError("Inicia sesión en Sanity y espera a que se guarde el borrador.");
      return;
    }
    if (!storage?.maximumSizeInBytes || file.size > storage.maximumSizeInBytes) {
      setError("El archivo supera el tamaño permitido por el almacenamiento de este entorno.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const pathname = `${productFilePrefix(dataset, documentId)}${crypto.randomUUID()}/${encodeURIComponent(safeFilename(file.name))}`;
      const result = await upload(pathname, file, {
        access: "private", multipart: true, handleUploadUrl: endpoint,
        contentType: file.type || "application/octet-stream",
        clientPayload: JSON.stringify({ productId: documentId }),
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      props.onChange(PatchEvent.from([
        set(result.pathname, ['pathname']),
        set(safeFilename(file.name), ['originalFilename']),
        set(file.type || "application/octet-stream", ['contentType']),
        set(file.size, ['size']),
      ]));
    } catch {
      setError("No se pudo subir el archivo. Comprueba la conexión, el almacenamiento y tu permiso de edición; puedes volver a intentarlo.");
    } finally { setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {props.renderDefault(props)}
      <p>Archivo privado: cualquier formato admitido por el almacenamiento. La compra permite descargarlo aunque el navegador no pueda abrirlo.</p>
      {props.value?.originalFilename && <p>{props.value.originalFilename} · {(Number(props.value.size || 0) / 1024 / 1024).toFixed(1)} MB</p>}
      {!storage && <p role="status">Comprobando almacenamiento…</p>}
      {storage?.ready === false && <p role="alert">Falta configurar el almacenamiento privado. Utiliza el Studio integrado en la web de este entorno y contacta con administración.</p>}
      {storage?.ready && <p>Máximo por archivo: {(Number(storage.maximumSizeInBytes) / 1_000_000).toLocaleString("es-CO")} MB.</p>}
      <label>
        {props.value?.pathname ? "Reemplazar archivo" : "Subir archivo"}
        <input type="file" disabled={busy || !storage?.ready || props.readOnly} style={{ display: "block", maxWidth: "100%", padding: "12px 0" }} onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) { void select(file); }
          event.target.value = "";
        }} />
      </label>
      {busy && <p role="status">Subiendo archivo… {progress}% · Mantén esta ventana abierta.</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import { PatchEvent, set, useClient, useFormValue, type ObjectInputProps } from "sanity";

import { productFilePrefix, safeFilename } from "../../lib/digital-products/files";
import { uploadProductDrive } from "../lib/upload-product-drive";

const studioClientOptions = { apiVersion: "2024-01-01" };

/** Embedded Studio: reuse the editor's Sanity identity, never the site's ADMIN role. */
export function PrivateProductFileInput(props: ObjectInputProps) {
  const client = useClient(studioClientOptions);
  const documentId = useFormValue(["_id"]) as string;
  const drive = useFormValue(["digitalDeliveryVersion"]) === 2;
  const [storage, setStorage] = useState<{ ready: boolean; maximumSizeInBytes?: number }>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const internalFileRef = props.value?.internalFileRef as string | undefined;
  const [fileState, setFileState] = useState<string>();
  const checkFile = useCallback(async () => {
    if (!drive || !internalFileRef) { return; }
    const { token } = client.config();
    if (!token) { setFileState("unavailable"); return; }
    setFileState("checking");
    try {
      const response = await fetch("/api/studio/product-drive", { method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "check", productId: documentId, id: internalFileRef }),
      });
      if (!response.ok) { throw new Error("No se pudo comprobar el archivo."); }
      const data = await response.json();
      setFileState(["valid", "missing", "moved", "changed"].includes(data.state) ? data.state : "unavailable");
    } catch { setFileState("unavailable"); }
  }, [client, documentId, drive, internalFileRef]);
  useEffect(() => { void checkFile(); }, [checkFile]);
  const endpoint = drive ? "/api/studio/product-drive" : "/api/studio/product-files";
  useEffect(() => {
    let active = true;
    fetch(endpoint).then((response) => response.json()).then((data) => {
      if (active) { setStorage(data); }
    }).catch(() => { if (active) { setStorage({ ready: false }); } });
    return () => { active = false; };
  }, [endpoint]);
  async function select(file: File) {
    setError("");
    const { token, dataset } = client.config();
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
      if (drive) {
        if (!props.value?._key) { throw new Error("Guarda primero el archivo en el borrador."); }
        const result = await uploadProductDrive(file, documentId, props.value._key, token, setProgress);
        props.onChange(PatchEvent.from([
          set(result.internalFileRef, ['internalFileRef']),
          set(result.originalFilename, ['originalFilename']),
          set(result.contentType, ['contentType']),
          set(result.size, ['size']),
        ]));
        return;
      }
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
      <p>{drive ? "Los archivos de este producto se guardan juntos en su carpeta privada de Google Drive. Tras confirmar el pago, el servidor concede acceso de lector solo al correo verificado del comprador." : "Archivo privado: cualquier formato admitido por el almacenamiento. La compra permite descargarlo aunque el navegador no pueda abrirlo."}</p>
      {props.value?.originalFilename && <p>{props.value.originalFilename} · {Number(props.value.size || 0) < 1024 ? `${props.value.size || 0} bytes` : `${(Number(props.value.size || 0) / 1024 / 1024).toFixed(1)} MB`}</p>}
      {drive && internalFileRef && <>
        {fileState === "checking" && <p role="status">Comprobando el archivo en Drive…</p>}
        {fileState === "valid" && <p role="status">Archivo verificado en su carpeta privada de Drive.</p>}
        {fileState === "moved" && <p role="alert">El archivo se ha movido fuera de la carpeta de este producto. Devuélvelo a esa carpeta antes de vender.</p>}
        {fileState === "missing" && <p role="alert">El archivo se ha eliminado o no es accesible en Drive. Restáuralo o añade una nueva entrada antes de vender.</p>}
        {fileState === "changed" && <p role="alert">El archivo ha cambiado y no coincide con el original verificado. Revisa su contenido antes de vender.</p>}
        {fileState === "unavailable" && <p role="alert">No se pudo comprobar el archivo. Revisa la conexión y los permisos de Drive y vuelve a comprobarlo.</p>}
        <button type="button" disabled={busy || fileState === "checking" || props.readOnly} style={{ padding: 12 }} onClick={() => void checkFile()}>Comprobar archivo en Drive</button>
      </>}
      {!storage && <p role="status">Comprobando almacenamiento…</p>}
      {storage?.ready === false && <p role="alert">Falta configurar el almacenamiento privado. Utiliza el Studio integrado en la web de este entorno y contacta con administración.</p>}
      {storage?.ready && <p>Máximo por archivo: {(Number(storage.maximumSizeInBytes) / 1_000_000).toLocaleString("es-CO")} MB.</p>}
      <label>
        {props.value?.pathname || props.value?.internalFileRef ? "Reemplazar archivo" : "Subir archivo"}
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

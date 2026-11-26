import { get } from "@vercel/blob";

import { auth } from "@/lib/auth";
import {
  attachmentHeader,
  productFilePrefix,
  type PrivateProductFile,
} from "@/lib/digital-products/files";
import { ownedProductFiles } from "@/lib/digital-products/owned-files";
import { productStorageConfig } from "@/lib/digital-products/storage";
import { client } from "@/sanity/lib/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const unavailable = () => new Response("Archivo no disponible", { status: 404, headers });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; key: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unavailable();
  }
  const { id, key } = await context.params;
  const access = await ownedProductFiles(session.user.id, id);
  if (!access) {
    return unavailable();
  }
  let file = access.snapshots.flatMap(({ files }) => files.privateDigitalFiles ?? []).find((item) => item._key === key);
  if (!file && access.allowCatalogFiles) {
    const product = await client.withConfig({ useCdn: false }).fetch<{
      privateDigitalFiles?: PrivateProductFile[];
    } | null>('*[_type == "product" && _id == $id][0]{privateDigitalFiles[]{_key,pathname,originalFilename}}', { id }, { cache: "no-store" });
    file = product?.privateDigitalFiles?.find((item) => item._key === key);
  }
  if (!file?.pathname) {
    return unavailable();
  }
  try {
    const config = productStorageConfig();
    if (
      !file.pathname.startsWith(productFilePrefix(config.dataset, id)) ||
      file.pathname.includes("..")
    ) {
      return unavailable();
    }
    const blob = await get(file.pathname, { access: "private", token: config.token });
    if (!blob || blob.statusCode !== 200) {
      return unavailable();
    }
    // Stream rather than buffering videos. Never disclose the storage URL/token.
    return new Response(blob.stream, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentHeader(file.originalFilename || "archivo"),
        "Content-Length": String(blob.blob.size),
      },
    });
  } catch {
    return new Response("No se pudo descargar el archivo. Inténtalo de nuevo.", {
      status: 503,
      headers,
    });
  }
}

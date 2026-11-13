import { createClient } from "@sanity/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { productFilePrefix, validProductId } from "@/lib/digital-products/files";
import { productStorageConfig } from "@/lib/digital-products/storage";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { maxRequests: 30, windowMs: 60000 });
  if (limited) {
    return limited;
  }
  try {
    const config = productStorageConfig();
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      token: config.token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, payload) => {
        const authorization = request.headers.get("authorization") || "";
        if (!authorization.startsWith("Bearer ")) {
          throw new Error("Inicia sesión en Sanity para subir archivos.");
        }
        const data = JSON.parse(payload || "{}") as { productId?: string };
        if (!validProductId(data.productId)) {
          throw new Error("Producto no válido.");
        }
        const productId = data.productId.replace(/^drafts\./, "");
        const prefix = productFilePrefix(config.dataset, productId);
        if (!pathname.startsWith(prefix) || pathname.includes("..") || pathname.length > 500) {
          throw new Error("Ruta de archivo no válida.");
        }
        const editor = createClient({
          projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
          dataset: config.dataset,
          apiVersion: "2024-01-01",
          useCdn: false,
          token: authorization.slice(7),
          perspective: "raw",
        });
        const draftId = `drafts.${productId}`;
        const draft = await editor.getDocument<{ _id: string; _type: string }>(draftId);
        if (draft?._type !== "product") {
          throw new Error("Guarda primero el borrador del producto.");
        }
        // Sanity itself checks write permission on this exact product/dataset.
        // A public read or a viewer session cannot mint an upload token.
        await editor.patch(draftId).setIfMissing({ privateDigitalFiles: [] }).commit();
        return {
          maximumSizeInBytes: config.maximumSizeInBytes,
          validUntil: Date.now() + 2 * 60 * 60 * 1000,
          addRandomSuffix: true,
          allowOverwrite: false,
          // No allowedContentTypes: files of any storage-supported format are accepted.
        };
      },
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo autorizar la carga. Comprueba el almacenamiento privado, tu sesión de Sanity y el permiso de edición del producto.",
      },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}

/** Public readiness contains no credentials or store URL. */
export function GET() {
  try {
    const { maximumSizeInBytes } = productStorageConfig();
    return NextResponse.json(
      { ready: true, maximumSizeInBytes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

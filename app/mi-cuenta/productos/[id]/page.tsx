import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

import type { PrivateProductFile } from "@/lib/digital-products/files";
export default async function OwnedProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/mi-cuenta/productos/${id}`)}`);
  }
  const access = await prisma.entitlement.findFirst({
    where: {
      userId: session.user.id,
      type: "PRODUCT",
      resourceId: id,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (!access) {
    notFound();
  }
  const product = await client.fetch(
    `*[_type == "product" && _id == $id][0]{title,digitalFiles[]{_key,title,description,asset->{url,originalFilename}},privateDigitalFiles[]{_key,title,description,originalFilename,size}}`,
    { id }
  );
  if (!product) {
    notFound();
  }
  return (
    <section className="bg-white p-6 rounded-2xl space-y-5">
      <h1 className="text-3xl font-gazeta">{product.title}</h1>
      <p>Tu pago está verificado. Estos son los archivos de tu compra:</p>
      {product.privateDigitalFiles?.map((file: PrivateProductFile) => (
        <article key={file._key} className="p-4 rounded-xl border space-y-2 break-words">
          <h2 className="font-semibold">
            {file.title || file.originalFilename || "Archivo digital"}
          </h2>
          {file.description && <p>{file.description}</p>}
          <a
            className="underline inline-block py-3"
            href={`/api/productos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(file._key)}`}
          >
            Descargar archivo
          </a>
        </article>
      ))}
      {product.digitalFiles?.map(
        (file: {
          _key: string;
          title?: string;
          description?: string;
          asset?: { url?: string; originalFilename?: string };
        }) =>
          file.asset?.url && (
            <article key={file._key} className="p-4 rounded-xl border">
              <h2 className="font-semibold">
                {file.title || file.asset.originalFilename || "Archivo digital"}
              </h2>
              <p>{file.description}</p>
              <a
                className="underline inline-block py-3"
                href={file.asset.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir / descargar archivo
              </a>
            </article>
          )
      )}
      {!product.digitalFiles?.length && !product.privateDigitalFiles?.length && (
        <p>
          Los archivos de este producto todavía no están disponibles. Conserva la confirmación de tu
          pedido.
        </p>
      )}
      <Link className="underline" href="/mi-cuenta/compras">
        Volver a Mis compras
      </Link>
    </section>
  );
}

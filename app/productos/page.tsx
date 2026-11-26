
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { DigitalCartButton } from "@/components/products/DigitalCartButton";
import { auth } from "@/lib/auth";
import {
  PRODUCT_CATALOG_QUERY,
  type CatalogProduct,
  productHref,
  productPrices,
} from "@/lib/digital-products/catalog";
import { client } from "@/sanity/lib/client";
export const dynamic = "force-dynamic";
export default async function Products() {
  const products = await client.fetch<CatalogProduct[]>(PRODUCT_CATALOG_QUERY);
  return (
    <>
      <Header session={await auth()} />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="font-gazeta text-4xl text-[#654177] mb-4">Productos digitales</h1>
        <DigitalCartButton />
        <p className="mb-8">
          Audios, vídeos, libros, guías y otros recursos digitales. Los productos comprados se
          descargan desde tu cuenta tras confirmar el pago. Los gratuitos se disfrutan en línea,
          sin descarga habilitada.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {products.map((p) => (
            <article key={p._id} className="p-6 rounded-2xl border space-y-4">
              {p.coverUrl && (
                <Image
                  src={p.coverUrl}
                  alt={p.coverAlt || p.title}
                  width={720}
                  height={480}
                  className="w-full h-auto rounded-xl"
                />
              )}
              <h2 className="text-2xl">{p.title}</h2>
              <p>{p.shortDescription}</p>
              {productPrices(p).map((price) => (
                <p key={price}>{price}</p>
              ))}
              <Link
                className="inline-block bg-[#4944a4] text-white rounded-xl py-3 px-5"
                href={productHref(p)}
              >
                {p.isFree ? "Ver contenido gratuito" : "Ver producto y opciones de pago"}
              </Link>
            </article>
          ))}
        </div>
        {!products.length && (
          <p className="p-6 bg-purple-50 rounded-xl">
            Próximamente encontrarás aquí nuevos productos digitales.
          </p>
        )}
        <Link href="/academia" className="block underline mt-8">
          Ver también los cursos de la Academia
        </Link>
      </main>
      <Footer />
    </>
  );
}

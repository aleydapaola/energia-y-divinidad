import Link from "next/link";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { pricingProjection } from "@/sanity/lib/projections";
export const dynamic = "force-dynamic";
export default async function Products() {
  const products = await client.fetch<
    {
      _id: string;
      title: string;
      slug: { current: string };
      shortDescription?: string;
      price?: number;
      priceUSD?: number;
    }[]
  >(
    `*[_type == "product" && published == true && status == "active" && productType in ["digital","ebook","audio","course"]]{_id,title,slug,shortDescription,${pricingProjection}}`
  );
  return (
    <>
      <Header session={await auth()} />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="font-gazeta text-4xl text-[#654177] mb-4">Productos digitales</h1>
        <p className="mb-8">
          Audios, vídeos, libros, guías y otros recursos digitales. Accede desde tu cuenta después
          de confirmar el pago.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {products.map((p) => (
            <article key={p._id} className="p-6 rounded-2xl border space-y-4">
              <h2 className="text-2xl">{p.title}</h2>
              <p>{p.shortDescription}</p>
              <p>{p.price ? `${p.price.toLocaleString("es-CO")} COP · Bre-B / Global66` : ""}</p>
              <p>{p.priceUSD ? `${p.priceUSD} USD · PayPal` : ""}</p>
              <Link
                className="inline-block bg-[#4944a4] text-white rounded-xl py-3 px-5"
                href={`/productos/${encodeURIComponent(p.slug?.current || p._id)}`}
              >
                Ver producto y opciones de pago
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

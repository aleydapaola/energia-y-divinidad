import Image from "next/image";
import Link from "next/link";

import {
  type CatalogProduct,
  productFormat,
  productHref,
  productPrices,
} from "@/lib/digital-products/catalog";

export function HomeProducts({ products }: { products: CatalogProduct[] }) {
  if (!products.length) {
    return null;
  }

  return (
    <section aria-labelledby="productos-home" className="bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 id="productos-home" className="font-gazeta text-3xl text-[#654177] sm:text-4xl">
            Productos digitales
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#674c6a]">
            Guías, audios y recursos de Aleyda para acompañarte a tu ritmo.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product._id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#8A4BAF]/20 bg-white"
            >
              {product.coverUrl ? (
                <Image
                  src={product.coverUrl}
                  alt={product.coverAlt || product.title}
                  width={720}
                  height={480}
                  sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
                  className="aspect-[3/2] w-full bg-[#f8f0f5] object-contain"
                />
              ) : (
                <div
                  className="flex aspect-[3/2] items-center justify-center bg-[#f8f0f5] px-6 text-center text-[#654177]"
                  aria-hidden="true"
                >
                  Energía y Divinidad
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="text-sm font-medium text-[#654177]">{productFormat(product)}</p>
                <h3 className="break-words font-gazeta text-2xl text-[#654177]">{product.title}</h3>
                <p className="text-[#674c6a]">
                  {product.whatYouGet?.find((item) => item.trim()) ||
                    product.shortDescription ||
                    "Un recurso de Aleyda para acompañar tu camino espiritual."}
                </p>
                <div className="mt-auto space-y-1 pt-2 text-sm text-[#654177]">
                  {productPrices(product).map((price) => (
                    <p key={price}>{price}</p>
                  ))}
                </div>
                <Link
                  href={productHref(product)}
                  aria-label={`Ver producto: ${product.title}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#654177] px-5 py-3 text-center font-medium text-white transition-colors hover:bg-[#8A4BAF]"
                >
                  Ver producto
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/productos"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#654177] px-6 py-3 text-[#654177] transition-colors hover:bg-[#f8f0f5]"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    </section>
  );
}

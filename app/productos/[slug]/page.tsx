import { PortableText } from "@portabletext/react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DigitalCartButton } from "@/components/products/DigitalCartButton";
import { FreeProductViewer } from "@/components/products/FreeProductViewer";
import { auth } from "@/lib/auth";
import { activeProductEntitlement } from "@/lib/digital-products/drive-delivery";
import { freeProductFiles } from "@/lib/digital-products/free-product";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { pricingProjection } from "@/sanity/lib/projections";

import { DigitalProductCheckout } from "./DigitalProductCheckout";
export const dynamic = "force-dynamic";
export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await client.fetch(
    `*[_type == "product" && (slug.current == $slug || _id == $slug) && published == true && status == "active" && productType in ["digital","ebook","audio","course"]][0]{_id,title,shortDescription,description,digitalDeliveryVersion,"coverUrl": images[0].asset->url,"coverAlt": images[0].alt,${pricingProjection},whatYouGet}`,
    { slug }
  );
  if (!product) {
    notFound();
  }
  const session = !product.isFree ? await auth() : null;
  const owned = session?.user?.id && await prisma.entitlement.findFirst({
    where: activeProductEntitlement(session.user.id, product._id), select: { id: true },
  });
  const cartItem = {
    id: product._id, title: product.title, slug,
    price: product.price, priceUSD: product.priceUSD, driveDelivery: product.digitalDeliveryVersion === 2,
  };
  return (
    <main className="bg-[#f8f0f5] min-h-screen p-4 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/productos" className="underline">
          ← Productos digitales
        </Link>
        <section className="bg-white p-6 rounded-2xl space-y-4">
          {product.coverUrl && (
            <Image
              src={product.coverUrl}
              alt={product.coverAlt || product.title}
              width={960}
              height={640}
              className="w-full h-auto rounded-xl"
            />
          )}
          <h1 className="font-gazeta text-3xl text-[#654177]">{product.title}</h1>
          <p>{product.shortDescription}</p>
          {product.description && <PortableText value={product.description} />}
          {product.whatYouGet?.length > 0 && (
            <ul className="list-disc pl-5">
              {product.whatYouGet.map((text: string) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </section>
        {product.isFree ? (
          <FreeProductViewer productId={product._id} files={await freeProductFiles(product._id)} />
        ) : owned ? (
          <Link href="/mi-cuenta/compras" className="inline-block min-h-11 py-3 underline">
            Ya tienes este producto en Mis compras
          </Link>
        ) : (
          <>
            <DigitalCartButton product={cartItem} />
            <DigitalProductCheckout driveDelivery={cartItem.driveDelivery} products={[cartItem]} />
          </>
        )}
      </div>
    </main>
  );
}

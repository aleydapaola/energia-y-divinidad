import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { client } from "@/sanity/lib/client";
import { pricingProjection } from "@/sanity/lib/projections";

import { DigitalProductCheckout } from "./DigitalProductCheckout";
export const dynamic = "force-dynamic";
export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await client.fetch(
    `*[_type == "product" && (slug.current == $slug || _id == $slug) && published == true && status == "active" && productType in ["digital","ebook","audio","course"]][0]{_id,title,shortDescription,description,${pricingProjection},whatYouGet}`,
    { slug }
  );
  if (!product) {
    notFound();
  }
  return (
    <main className="bg-[#f8f0f5] min-h-screen p-4 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/productos" className="underline">
          ← Productos digitales
        </Link>
        <section className="bg-white p-6 rounded-2xl space-y-4">
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
        <DigitalProductCheckout
          product={{
            id: product._id,
            title: product.title,
            price: product.price,
            priceUSD: product.priceUSD,
          }}
        />
      </div>
    </main>
  );
}

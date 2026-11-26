"use client";

import Link from "next/link";

import { useDigitalCartStore } from "@/lib/stores/digital-cart-store";

import { DigitalProductCheckout } from "../[slug]/DigitalProductCheckout";

export default function DigitalCartPage() {
  const items = useDigitalCartStore((state) => state.items);
  const removeItem = useDigitalCartStore((state) => state.removeItem);
  return (
    <main className="min-h-screen bg-[#f8f0f5] p-4 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="font-gazeta text-3xl text-[#654177]">Carrito de productos digitales ({items.length})</h1>
        <Link href="/productos" className="inline-block min-h-11 py-3 underline">Seguir comprando</Link>
        {items.length ? (
          <DigitalProductCheckout products={items} removeItem={removeItem} driveDelivery={items.some((item) => item.driveDelivery)} />
        ) : <p>El carrito está vacío.</p>}
      </div>
    </main>
  );
}

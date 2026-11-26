"use client";

import Link from "next/link";

import { productPaymentMethods } from "@/lib/digital-products/prices";
import { type DigitalCartItem, useDigitalCartStore } from "@/lib/stores/digital-cart-store";

export function DigitalCartButton({ product }: { product?: DigitalCartItem }) {
  const items = useDigitalCartStore((state) => state.items);
  const addItem = useDigitalCartStore((state) => state.addItem);
  const added = product && items.some(({ id }) => id === product.id);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {product && productPaymentMethods(product).length > 0 && (
        <button type="button" disabled={added} onClick={() => addItem(product)}
          className="min-h-11 rounded-xl bg-[#4944a4] px-4 py-3 text-white disabled:opacity-60">
          {added ? "Añadido al carrito" : "Añadir al carrito"}
        </button>
      )}
      <Link href="/productos/carrito" className="inline-block min-h-11 px-2 py-3 underline">
        Carrito digital ({items.length})
      </Link>
    </div>
  );
}

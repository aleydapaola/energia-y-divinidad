"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { PurchasePolicy } from "@/components/checkout/PurchasePolicy";
import { purchaseMethods } from "@/lib/purchase-methods";
export function DigitalProductCheckout({
  product,
}: {
  product: { id: string; title: string; price?: number; priceUSD?: number };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [method, setMethod] = useState("paypal_direct");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = method === "breb_manual" ? "COP" : "USD";
  const amount = currency === "COP" ? product.price : product.priceUSD;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/checkout/${method === "breb_manual" ? "breb" : "paypal"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "product",
            productId: product.id,
            currency,
            amount,
            guestEmail: session?.user?.email || email,
            guestName: session?.user?.name || name,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      if (data.approvalUrl) {
        window.location.assign(data.approvalUrl);
      } else {
        router.push(data.redirectUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-2xl space-y-5">
      <h2 className="text-2xl">Comprar {product.title}</h2>
      <fieldset className="space-y-3">
        <legend className="mb-2">Método de pago</legend>
        {purchaseMethods("colombia").map((option) => (
          <label key={option.method} className="flex items-start gap-3 p-4 rounded-xl border">
            <input
              type="radio"
              name="payment"
              value={option.method}
              checked={method === option.method}
              onChange={() => setMethod(option.method)}
            />
            <span>
              <strong>{option.label}</strong>
              <span className="block text-sm">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-2xl font-semibold">
        {amount
          ? `${amount.toLocaleString("es-CO")} ${currency}`
          : `Precio en ${currency} no disponible`}
      </p>
      {!session?.user?.email && (
        <>
          <label className="block">
            Nombre
            <input
              required
              maxLength={120}
              className="block w-full border p-3 rounded-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block">
            Correo para recibir tu compra
            <input
              required
              type="email"
              className="block w-full border p-3 rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        </>
      )}
      <p>
        Después de verificar el pago encontrarás los archivos y las instrucciones en Mis compras.
        Recibirás un correo con el acceso a tu cuenta.
      </p>
      <PurchasePolicy kind="product" />
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy || !amount}
        className="w-full py-3 rounded-xl bg-[#4944a4] text-white disabled:opacity-50"
      >
        {busy
          ? "Preparando pedido…"
          : method === "breb_manual"
            ? "Continuar con Bre-B"
            : "Continuar con PayPal"}
      </button>
    </form>
  );
}

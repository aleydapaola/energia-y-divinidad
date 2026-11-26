"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";

import { PurchasePolicy } from "@/components/checkout/PurchasePolicy";
import { digitalCartPaymentMethods } from "@/lib/digital-products/prices";
import { purchaseMethods } from "@/lib/purchase-methods";
type Product = { id: string; title: string; price?: number; priceUSD?: number };

export function DigitalProductCheckout({
  products,
  cart = false,
  driveDelivery = false,
}: {
  products: Product[];
  cart?: boolean;
  driveDelivery?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const available = digitalCartPaymentMethods(products);
  const [selectedMethod, setMethod] = useState<string>(available[0] || "");
  const method = available.find((value) => value === selectedMethod) || available[0] || "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = method === "breb_manual" ? "COP" : "USD";
  const price = (product: Product) => currency === "COP" ? product.price : product.priceUSD;
  const amount = products.reduce((total, product) => total + Math.round((price(product) ?? 0) * 100), 0) / 100;
  const submitting = useRef(false);
  const guestCheckoutKey = useRef("");
  const formatAmount = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency, currencyDisplay: "code" }).format(value);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!method || submitting.current) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const customerEmail = (session?.user?.email || email).trim().toLowerCase();
      const storageKey = `digital-checkout:${method}:${products.map(({ id }) => id).sort().join(",")}`;
      try {
        guestCheckoutKey.current = localStorage.getItem(storageKey) || crypto.randomUUID();
        localStorage.setItem(storageKey, guestCheckoutKey.current);
      } catch {
        guestCheckoutKey.current ||= crypto.randomUUID();
      }
      const response = await fetch(
        `/api/checkout/${method === "breb_manual" ? "breb" : "paypal"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "product",
            ...(cart ? { products: products.map((product) => ({ id: product.id, amount: price(product) })) } : { productId: products[0].id }),
            checkoutKey: guestCheckoutKey.current,
            currency,
            amount,
            guestEmail: customerEmail,
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
      submitting.current = false;
      setBusy(false);
    }
  }
  const paymentLabel = method === "breb_manual" ? "Continuar con Bre-B" : "Continuar con PayPal";
  if (driveDelivery && !session?.user?.id) {
    return <section className="bg-white p-6 rounded-2xl space-y-4">
      <p>El acceso a Drive es exclusivo del titular. Inicia sesión con una cuenta de correo verificado y usa esa misma cuenta en Google Drive.</p>
      <Link className="inline-block min-h-11 py-3 underline" href={`/auth/signin?callbackUrl=${encodeURIComponent(cart ? "/productos/carrito" : `/productos/${products[0].id}`)}`}>Iniciar sesión para comprar</Link>
    </section>;
  }
  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-2xl space-y-5 min-w-0 break-words">
      <h2 className="text-2xl">{cart ? "Completar pedido" : `Comprar ${products[0].title}`}</h2>
      <fieldset className="space-y-3 min-w-0">
        <legend className="mb-2">Método de pago</legend>
        {purchaseMethods("colombia")
          .filter((option) => available.some((method) => method === option.method))
          .map((option) => (
            <label
              key={option.method}
              className="flex items-start gap-3 p-4 rounded-xl border min-w-0"
            >
              <input
                className="shrink-0 mt-1"
                type="radio"
                name="payment"
                value={option.method}
                checked={method === option.method}
                onChange={() => setMethod(option.method)}
              />
              <span className="min-w-0 break-words">
                <strong>{option.label}</strong>
                <span className="block text-sm">{option.description}</span>
              </span>
            </label>
          ))}
      </fieldset>
      {cart && method && <ul className="space-y-2">
        {products.map((product) => <li key={product.id} className="flex flex-wrap justify-between gap-x-3">
          <span>{product.title}</span><span>{formatAmount(price(product) ?? 0)}</span>
        </li>)}
      </ul>}
      <p className="text-2xl font-semibold">
        {method && amount ? `${cart ? "Total: " : ""}${formatAmount(amount)}`
          : cart ? "Los productos del carrito no comparten una moneda de pago."
          : "Este producto todavía no tiene un precio de venta configurado."}
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
              autoCapitalize="none"
              autoCorrect="off"
              onBlur={(event) => setEmail(event.target.value.trim().toLowerCase())}
              className="block w-full border p-3 rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        </>
      )}
      <p>
        {driveDelivery ? "Después de verificar el pago, el servidor concede permiso de lector solo al correo verificado de tu cuenta. El nombre del producto en Mis compras abrirá la carpeta cuando Drive confirme el acceso. Si falla la entrega, puedes reintentarla sin volver a pagar." : "Después de verificar el pago encontrarás los archivos y las instrucciones en Mis compras."}
        Recibirás un correo con el acceso a tu cuenta.
      </p>
      <PurchasePolicy kind="product" />
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy || !method || !amount}
        className="w-full py-3 rounded-xl bg-[#4944a4] text-white disabled:opacity-50"
      >
        {busy ? "Preparando pedido…" : paymentLabel}
      </button>
    </form>
  );
}

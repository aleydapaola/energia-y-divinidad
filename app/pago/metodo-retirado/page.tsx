import Link from "next/link";

export default function RetiredPaymentPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 space-y-5">
      <h1 className="text-3xl">Este método de pago se ha retirado</h1>
      <p>Las nuevas compras se realizan con PayPal o Bre-B · Global66.</p>
      <p>
        Si ya realizaste un pago, consulta Mis Compras o contacta con Aleyda indicando la
        referencia. No vuelvas a pagar para resolver un pedido anterior.
      </p>
      <div className="flex flex-wrap gap-5">
        <Link className="underline" href="/mi-cuenta/compras">
          Mis Compras
        </Link>
        <Link className="underline" href="/">
          Volver a la web
        </Link>
        <a className="underline" href="mailto:contacto@energiaydivinidad.com">
          Contactar con Aleyda
        </a>
      </div>
    </main>
  );
}

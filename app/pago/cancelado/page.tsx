import Link from "next/link";

import { CancelUnpaidReservation } from "@/components/pago/CancelUnpaidReservation";

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f8f0f5] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-2xl">Has vuelto del proceso de pago</h1>
        <p>
          Si no has completado el pago, puedes volver a consultar la disponibilidad. Una reserva
          temporal sin pagar se libera al terminar su plazo.
        </p>
        {ref && <CancelUnpaidReservation reference={ref} />}
        <Link className="block underline" href="/sesiones">
          Ver sesiones
        </Link>
        <Link className="block underline" href="/eventos">
          Ver eventos
        </Link>
        <Link className="block underline" href="/mi-cuenta/compras">
          Consultar mis compras
        </Link>
      </div>
    </main>
  );
}

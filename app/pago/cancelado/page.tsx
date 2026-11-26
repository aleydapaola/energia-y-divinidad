import Link from "next/link";

import { CancelUnpaidReservation } from "@/components/pago/CancelUnpaidReservation";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const order = ref
    ? await prisma.order.findUnique({
        where: { orderNumber: ref },
        select: {
          userId: true,
          orderNumber: true,
          paymentStatus: true,
          paymentMethod: true,
          metadata: true,
          checkoutHold: { select: { state: true } },
          manualPayment: { select: { id: true } },
        },
      })
    : null;
  const allowed = order && (await canAccessOrder(order));
  const digital = allowed && order.paymentMethod === "PAYPAL_DIRECT" &&
    !!(order.metadata as { digitalProductOrder?: boolean } | null)?.digitalProductOrder;
  const canCancel = digital && order.paymentStatus === "PENDING";
  const canRelease =
    allowed &&
    order.paymentStatus === "PENDING" &&
    order.checkoutHold?.state === "HELD" &&
    !order.manualPayment;
  return (
    <main className="min-h-screen bg-[#f8f0f5] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-2xl">Has vuelto del proceso de pago</h1>
        {!digital && <p>
          Si no has completado el pago, puedes volver a consultar la disponibilidad. Una reserva
          temporal sin pagar se libera al terminar su plazo.
        </p>}
        {ref && canCancel && <CancelUnpaidReservation reference={ref} digital />}
        {ref && canRelease && <CancelUnpaidReservation reference={ref} />}
        {allowed &&
          (order.checkoutHold?.state === "CAPTURING" ||
            order.checkoutHold?.state === "REPORTED") && (
            <p>
              El pago está en comprobación. No hagas otro pago ni liberes la reserva; consulta tu
              pedido o contacta con Aleyda.
            </p>
          )}
        {digital && <Link className="block underline" href="/productos/carrito">Volver al carrito digital</Link>}
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

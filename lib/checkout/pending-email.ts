import { deliverEmail } from "@/lib/email-delivery";
import { getAppUrl } from "@/lib/utils";

export async function notifyBrebReport(
  order: {
    id: string;
    orderNumber: string;
    itemName: string;
    amount: unknown;
    guestEmail: string | null;
  },
  email?: string | null
) {
  const from = process.env.EMAIL_FROM || "Energía y Divinidad <noreply@energiaydivinidad.com>";
  const admin =
    process.env.ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "contacto@energiaydivinidad.com";
  const adminResult = await deliverEmail({
    from,
    to: admin,
    subject: `Pago por revisar — ${order.orderNumber}`,
    text: `El cliente ha comunicado una transferencia Bre-B para ${order.itemName}, ${Number(order.amount)} COP. Comprueba el ingreso en Global66 antes de confirmar. No es una confirmación de cobro.\n${getAppUrl()}/admin/orders/${order.id}`,
  });
  if (adminResult.error) {
    throw new Error("No se pudo enviar el aviso administrativo.");
  }
  if (email || order.guestEmail) {
    const customerResult = await deliverEmail({
      from,
      to: (email || order.guestEmail)!,
      subject: `Pago pendiente de verificación — ${order.orderNumber}`,
      text: `Hemos recibido el aviso de tu transferencia para ${order.itemName}. Revisaremos el ingreso antes de activar tu compra. No vuelvas a pagar. Puedes consultar el pedido en el navegador donde compraste:\n${getAppUrl()}/pago/breb-pending?ref=${order.orderNumber}`,
    });
    if (customerResult.error) {
      throw new Error("No se pudo enviar el aviso al cliente.");
    }
  }
}

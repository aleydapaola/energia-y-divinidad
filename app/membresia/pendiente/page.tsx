import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getPendingMembership } from "@/lib/membership-pending";

export const dynamic = "force-dynamic";
export default async function PendingMembershipPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=%2Fmembresia%2Fpendiente");
  }
  let pending;
  let failed = false;
  try {
    pending = await getPendingMembership(session.user.id);
  } catch {
    failed = true;
  }
  const date = (value: Date | string) =>
    new Date(value).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "long",
      timeStyle: "short",
    });
  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-5">
      <h1 className="text-3xl">Tu autorización de membresía pendiente</h1>
      {pending ? (
        <>
          <h2 className="text-2xl">{pending.name}</h2>
          <p>Referencia: {pending.orderNumber}</p>
          <p>Creada el {date(pending.createdAt)} (hora de Colombia, UTC−5).</p>
          <p>
            Renovación: {pending.amount.toFixed(2)} {pending.currency} cada{" "}
            {pending.interval === "yearly" ? "año" : "mes"}.
          </p>
          {pending.freeTrial && pending.firstChargeAt && (
            <p>
              Esta autorización conserva su fecha original del primer cobro:{" "}
              {date(pending.firstChargeAt)} (hora de Colombia, UTC−5). Retomarla no inicia otros 30
              días de prueba. Revisa la misma fecha en PayPal antes de aprobar.
            </p>
          )}
          <p>
            Consultar esta página no realiza un cobro ni activa el acceso. No contrates otra
            membresía para resolver este intento.
          </p>
          {pending.action ? (
            <a
              className="inline-block rounded-xl bg-[#4944a4] px-5 py-4 text-white"
              href={pending.action.href}
            >
              {pending.action.label}
            </a>
          ) : (
            <p>
              Esta autorización necesita revisión con Aleyda. No se abrirá otra ni se anunciará una
              cancelación sin comprobarla en PayPal.
            </p>
          )}
        </>
      ) : (
        <p>
          {failed
            ? "No se ha podido verificar la autorización en PayPal. Vuelve a intentarlo o contacta con Aleyda; no abras otro plan."
            : "No tienes una autorización de membresía pendiente en esta cuenta."}
        </p>
      )}
      <div className="flex flex-wrap gap-5">
        <Link className="underline" href="/mi-cuenta/compras">
          Mis Compras
        </Link>
        <a className="underline" href="mailto:contacto@energiaydivinidad.com">
          Contactar con Aleyda
        </a>
      </div>
    </main>
  );
}

import Link from "next/link";

import {
  COURSE_REFUND_POLICY,
  DIGITAL_REFUND_POLICY,
  EVENT_REFUND_POLICY,
  MEMBERSHIP_CANCELLATION_POLICY,
} from "@/lib/commercial-policy";

export function PurchasePolicy({ kind }: { kind: "course" | "product" | "event" | "membership" }) {
  const text = {
    course: COURSE_REFUND_POLICY,
    product: DIGITAL_REFUND_POLICY,
    event: EVENT_REFUND_POLICY,
    membership: MEMBERSHIP_CANCELLATION_POLICY,
  }[kind];
  return (
    <div className="rounded-xl border border-[#8A4BAF]/15 bg-[#F8F0F5]/60 p-4 text-sm text-[#654177]">
      <p className="font-semibold mb-2">Cambios y devoluciones</p>
      <p>{text}</p>
      <p className="mt-2">
        Se respetan los derechos legales aplicables.{" "}
        <Link href="/terminos" className="underline">
          Consulta las condiciones completas
        </Link>
        .
      </p>
    </div>
  );
}

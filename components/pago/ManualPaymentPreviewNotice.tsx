import Link from "next/link";

import { MANUAL_PAYMENT_PREVIEW_MESSAGE } from "@/lib/preview-safety";

export function ManualPaymentPreviewNotice() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold">PRUEBAS — No realizar pagos reales</h1>
      <p className="mb-6">{MANUAL_PAYMENT_PREVIEW_MESSAGE}</p>
      <Link href="/sesiones" className="underline">
        Volver a las sesiones
      </Link>
    </main>
  );
}

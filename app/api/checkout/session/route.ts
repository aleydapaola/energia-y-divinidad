import { NextResponse } from "next/server";

/** The supported session checkout is PayPal/Bre-B through one-time-checkout. */
export async function POST() {
  return NextResponse.json(
    { error: "Este flujo de reserva ya no está disponible. Vuelve a Sesiones para reservar." },
    { status: 410 }
  );
}

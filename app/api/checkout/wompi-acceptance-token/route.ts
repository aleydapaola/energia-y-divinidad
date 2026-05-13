import { NextResponse } from "next/server";

import { getWompiAcceptanceToken, getWompiApiUrl, WOMPI_CONFIG } from "@/lib/wompi";

/**
 * GET /api/checkout/wompi-acceptance-token
 * Retorna el acceptance token y la public key para tokenización de tarjeta en el cliente.
 * El acceptance token caduca cada ~30 minutos, por eso se solicita en cada checkout.
 */
export async function GET() {
  try {
    const acceptanceToken = await getWompiAcceptanceToken();
    return NextResponse.json({
      acceptanceToken,
      publicKey: WOMPI_CONFIG.publicKey,
      apiUrl: getWompiApiUrl(),
    });
  } catch (error) {
    console.error("[WOMPI-TOKEN] Error obteniendo acceptance token:", error);
    return NextResponse.json({ error: "Error obteniendo token de pago" }, { status: 500 });
  }
}

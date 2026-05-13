import { NextRequest, NextResponse } from "next/server";

import { processRenewalBatch } from "@/lib/services/subscription-renewal";

/**
 * POST /api/cron/process-renewals
 *
 * Cron job diario que procesa cobros recurrentes de membresías Wompi.
 * Corre a las 6 AM UTC (1 AM Colombia) — configurado en vercel.json.
 *
 * Solo cobra las suscripciones cuyo nextChargeDate llegó hoy.
 * Si el período es mensual, cobra una vez al mes.
 * Si el período es anual, cobra una vez al año.
 *
 * Secured con CRON_SECRET authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV !== "development") {
      if (!cronSecret) {
        console.error("[CRON/RENEWALS] CRON_SECRET no configurado");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[CRON/RENEWALS] Solicitud no autorizada");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[CRON/RENEWALS] Iniciando proceso de renovaciones...");
    const startTime = Date.now();

    const result = await processRenewalBatch();

    const duration = Date.now() - startTime;
    console.log(
      `[CRON/RENEWALS] Completado en ${duration}ms — procesadas: ${result.processed}, exitosas: ${result.successful}, fallidas: ${result.failed}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
    });
  } catch (error) {
    console.error("[CRON/RENEWALS] Error inesperado:", error);
    return NextResponse.json({ error: "Error procesando renovaciones" }, { status: 500 });
  }
}

// GET disponible para pruebas en desarrollo
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return POST(request);
}

import { NextResponse } from "next/server";

import { SESSION_PACK_PRICES } from "@/lib/checkout/catalog-quote";
import { getActiveSession } from "@/lib/sanity/queries/sessionConfig";
export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no disponible" }, { status: 404 });
  }
  return NextResponse.json({
    single: { COP: session.price, USD: session.priceUSD || 0 },
    pack: SESSION_PACK_PRICES,
  });
}

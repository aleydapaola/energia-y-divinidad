import { NextRequest, NextResponse } from "next/server";

import { convertInternationalToCOP, type InternationalCurrency } from "@/lib/currency-conversion";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Number(searchParams.get("amount"));
    const from = searchParams.get("from") as InternationalCurrency | null;
    const to = searchParams.get("to") || "COP";

    if (!from || !["USD", "EUR"].includes(from) || to !== "COP") {
      return NextResponse.json({ error: "Conversión no soportada" }, { status: 400 });
    }

    const conversion = await convertInternationalToCOP(amount, from);

    return NextResponse.json(conversion);
  } catch (error) {
    console.error("[CURRENCY-CONVERT] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al convertir moneda" },
      { status: 500 }
    );
  }
}

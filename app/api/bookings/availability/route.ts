import { NextRequest, NextResponse } from "next/server";

import { sessionAvailability, SessionSchedulingError } from "@/lib/session-scheduling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const slug = request.nextUrl.searchParams.get("slug");
  if (!date || !slug) {
    return NextResponse.json({ error: "Faltan fecha y sesión" }, { status: 400 });
  }
  try {
    return NextResponse.json(await sessionAvailability(date));
  } catch (error) {
    if (error instanceof SessionSchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "La agenda no está disponible temporalmente" },
      { status: 503 }
    );
  }
}

import { NextResponse } from "next/server";

// Only verified provider callbacks or an authenticated administrator may settle orders.
export async function POST() {
  return NextResponse.json(
    { error: "El pago debe verificarse con el proveedor o desde administración." },
    { status: 403 }
  );
}

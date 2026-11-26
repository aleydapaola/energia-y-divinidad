import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { assertDriveOrigin, driveNoStore } from "@/lib/digital-products/drive-admin";
import { deliverPaidDriveOrder } from "@/lib/digital-products/drive-auto-delivery";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) { return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: driveNoStore }); }
  const limited = applyRateLimit(request, { maxRequests: 6, windowMs: 60_000 });
  if (limited) { return limited; }
  try {
    assertDriveOrigin(request);
    // The order and optional product select a delivery; recipient and folder come from server records.
    const result = await deliverPaidDriveOrder((await params).id, session.user.id, new URL(request.url).searchParams.get("producto") ?? undefined);
    return NextResponse.json(result, { status: result.reason === "NOT_FOUND" ? 404 : 200, headers: driveNoStore });
  } catch {
    return NextResponse.json({ delivered: false }, { status: 403, headers: driveNoStore });
  }
}

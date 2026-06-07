import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getCommunicationAudienceOptions } from "@/lib/email-audiences";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const options = await getCommunicationAudienceOptions();
  return NextResponse.json(options);
}

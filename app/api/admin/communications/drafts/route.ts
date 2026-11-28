import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignDraft } from "@/lib/campaign-content";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = campaignDraft.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { blocks, ...draft } = parsed.data;
  const saved = await prisma.emailCampaign.create({
    data: {
      ...draft,
      contentBlocks: blocks,
      audienceType: "SELECTED_USERS",
      status: "DRAFT",
      createdById: session.user.id,
      createdByEmail: session.user.email,
    },
    select: { id: true, updatedAt: true },
  });
  return NextResponse.json(saved, { status: 201 });
}

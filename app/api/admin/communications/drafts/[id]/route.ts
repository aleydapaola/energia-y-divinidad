import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignDraft } from "@/lib/campaign-content";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
const updateDraft = campaignDraft.extend({ updatedAt: z.iso.datetime() });

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await context.params;
  const draft = await prisma.emailCampaign.findFirst({
    where: { id, status: "DRAFT" },
    select: {
      id: true,
      updatedAt: true,
      title: true,
      subject: true,
      body: true,
      contentBlocks: true,
      kind: true,
    },
  });
  if (!draft) {
    return NextResponse.json({ error: "Borrador no disponible" }, { status: 404 });
  }
  return NextResponse.json(draft, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const parsed = updateDraft.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { id } = await context.params;
  const { blocks, updatedAt, ...draft } = parsed.data;
  const updated = await prisma.emailCampaign.updateManyAndReturn({
    where: { id, status: "DRAFT", updatedAt: new Date(updatedAt) },
    data: { ...draft, contentBlocks: blocks },
    select: { id: true, updatedAt: true },
  });
  if (!updated.length) {
    return NextResponse.json(
      { error: "El borrador cambió. Vuelve a abrirlo antes de guardar." },
      { status: 409 }
    );
  }
  return NextResponse.json(updated[0]);
}

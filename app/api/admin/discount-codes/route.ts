import { NextResponse } from "next/server";
import { createClient } from "next-sanity";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  });
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const writeClient = getWriteClient();
  const codes = await writeClient.fetch(
    `*[_type == "discountCode"] | order(_createdAt desc) {
      _id,
      code,
      description,
      active,
      discountType,
      discountValue,
      currency,
      usageType,
      maxUses,
      validFrom,
      validUntil,
      minPurchaseAmount,
      _createdAt
    }`
  );

  // Enrich with usage counts from Prisma
  const enriched = await Promise.all(
    codes.map(async (code: { _id: string; [key: string]: unknown }) => {
      const usageCount = await prisma.discountUsage.count({
        where: { discountCodeId: code._id },
      });
      return { ...code, usageCount };
    })
  );

  return NextResponse.json({ codes: enriched });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    code,
    description,
    discountType,
    discountValue,
    currency,
    usageType,
    maxUses,
    validFrom,
    validUntil,
    minPurchaseAmount,
  } = body;

  if (!code || !discountType || !discountValue || !usageType) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const upperCode = String(code).toUpperCase().trim();
  if (!/^[A-Z0-9_-]+$/.test(upperCode)) {
    return NextResponse.json(
      { error: "El código solo puede contener letras, números, guiones y guiones bajos" },
      { status: 400 }
    );
  }

  const writeClient = getWriteClient();

  // Check for duplicate
  const existing = await writeClient.fetch(`*[_type == "discountCode" && code == $code][0]._id`, {
    code: upperCode,
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un código con ese nombre" }, { status: 409 });
  }

  const doc: { _type: string; [key: string]: unknown } = {
    _type: "discountCode",
    code: upperCode,
    active: true,
    discountType,
    discountValue: Number(discountValue),
    usageType,
  };

  if (description) {
    doc.description = description;
  }
  if (discountType === "fixed_amount" && currency) {
    doc.currency = currency;
  }
  if (usageType === "multi_use" && maxUses) {
    doc.maxUses = Number(maxUses);
  }
  if (validFrom) {
    doc.validFrom = validFrom;
  }
  if (validUntil) {
    doc.validUntil = validUntil;
  }
  if (minPurchaseAmount) {
    doc.minPurchaseAmount = Number(minPurchaseAmount);
  }

  const created = await writeClient.create(doc as Parameters<typeof writeClient.create>[0]);
  return NextResponse.json({ code: created }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const writeClient = getWriteClient();
  await writeClient.delete(id);
  return NextResponse.json({ success: true });
}

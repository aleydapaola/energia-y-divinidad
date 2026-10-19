import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { auth } from "@/lib/auth";

const cookieName = (reference: string) => `eyd-order-${reference}`;
function signature(reference: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Falta la configuración de acceso a pedidos.");
  }
  return createHmac("sha256", secret).update(`order-access:${reference}`).digest("hex");
}
export async function allowOrderInBrowser(reference: string) {
  (await cookies()).set(cookieName(reference), signature(reference), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function canAccessOrder(order: { userId: string | null; orderNumber: string }) {
  const session = await auth();
  if (session?.user?.id && session.user.id === order.userId) {
    return true;
  }
  const provided = (await cookies()).get(cookieName(order.orderNumber))?.value || "";
  const expected = signature(order.orderNumber);
  return (
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  );
}

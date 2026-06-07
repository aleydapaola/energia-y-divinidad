import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (user?.role !== "ADMIN") {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

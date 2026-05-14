import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// Usar NextAuth v5 directamente como middleware (Edge-compatible, sin Prisma)
// La cookie se descifra usando el mismo secreto que en lib/auth.ts
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/mi-cuenta/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/auth/signin",
    "/auth/signup",
    "/auth/set-password",
  ],
};

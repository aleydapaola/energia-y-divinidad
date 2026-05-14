import Credentials from "next-auth/providers/credentials";

import type { NextAuthConfig } from "next-auth";

// Configuración mínima para el middleware (Edge Runtime — sin Prisma)
// La autenticación real (con Prisma) ocurre en lib/auth.ts
export const authConfig = {
  providers: [Credentials({})],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isAuthPage =
        pathname.startsWith("/auth/signin") ||
        pathname.startsWith("/auth/signup") ||
        pathname.startsWith("/auth/set-password");

      if (isAuthPage && auth?.user) {
        if (pathname.startsWith("/auth/set-password")) {
          const resetToken = request.nextUrl.searchParams.get("token");
          if (resetToken) {
            return true;
          }
          return Response.redirect(new URL("/mi-cuenta/configuracion", request.nextUrl));
        }
        return Response.redirect(new URL("/mi-cuenta", request.nextUrl));
      }

      if (isAuthPage) {
        return true;
      }

      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;

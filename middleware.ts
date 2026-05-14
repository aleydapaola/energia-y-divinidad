import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // NextAuth v5 cambió el prefijo de la cookie de "next-auth.*" a "authjs.*"
  // Es necesario especificar el nombre correcto o getToken siempre retorna null
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

  // NextAuth v5 usa AUTH_SECRET; mantener NEXTAUTH_SECRET como fallback
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  const token = await getToken({
    req: request,
    secret,
    cookieName,
  });

  const isAuth = !!token;

  if (process.env.NODE_ENV !== "production") {
    const allCookieNames = request.cookies.getAll().map((c) => c.name);
    console.warn(
      `[MIDDLEWARE] ${pathname} | cookie="${cookieName}" presente=${allCookieNames.includes(cookieName)} | auth=${isAuth}`
    );
  }

  const isAuthPage =
    pathname.startsWith("/auth/signin") ||
    pathname.startsWith("/auth/signup") ||
    pathname.startsWith("/auth/set-password");

  if (isAuthPage) {
    if (isAuth) {
      if (pathname.startsWith("/auth/set-password")) {
        const resetToken = request.nextUrl.searchParams.get("token");
        if (resetToken) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/mi-cuenta/configuracion", request.url));
      }
      return NextResponse.redirect(new URL("/mi-cuenta", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuth) {
    let from = pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, request.url)
    );
  }

  return NextResponse.next();
}

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

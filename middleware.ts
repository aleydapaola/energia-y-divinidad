import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  const isAuth = !!token
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/auth/signin") ||
    request.nextUrl.pathname.startsWith("/auth/signup")

  // Si está en página de auth y ya está autenticado, redirigir a mi-cuenta
  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL("/mi-cuenta", request.url))
    }
    return NextResponse.next()
  }

  // Si no está autenticado y quiere acceder a rutas protegidas
  if (!isAuth) {
    let from = request.nextUrl.pathname
    if (request.nextUrl.search) {
      from += request.nextUrl.search
    }

    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/mi-cuenta/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/auth/signin",
    "/auth/signup",
  ],
}

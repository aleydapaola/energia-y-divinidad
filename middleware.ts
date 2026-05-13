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
    request.nextUrl.pathname.startsWith("/auth/signup") ||
    request.nextUrl.pathname.startsWith("/auth/set-password")

  // Si está en página de auth y ya está autenticado, redirigir
  if (isAuthPage) {
    if (isAuth) {
      // Si está en set-password con token de recuperación, permitir acceso
      if (request.nextUrl.pathname.startsWith("/auth/set-password")) {
        const resetToken = request.nextUrl.searchParams.get('token')
        if (resetToken) {
          // Permitir acceso si tiene un token de recuperación válido
          return NextResponse.next()
        }
        // Sin token, redirigir a configuracion
        return NextResponse.redirect(new URL("/mi-cuenta/configuracion", request.url))
      }
      // Si está en signin o signup, redirigir a mi-cuenta
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
    "/auth/set-password",
  ],
}

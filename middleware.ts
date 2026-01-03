import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/auth/signin") ||
    req.nextUrl.pathname.startsWith("/auth/signup")

  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL("/mi-cuenta", req.url))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    let from = req.nextUrl.pathname
    if (req.nextUrl.search) {
      from += req.nextUrl.search
    }

    return NextResponse.redirect(
      new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/mi-cuenta/:path*",
    "/mis-sesiones/:path*",
    "/mis-eventos/:path*",
    "/mi-membresia/:path*",
    "/admin/:path*",
    "/auth/signin",
    "/auth/signup",
  ],
}

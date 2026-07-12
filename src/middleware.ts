import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const useSecureCookies = process.env.NODE_ENV === "production";
const userCookie = useSecureCookies
  ? "__Secure-vertax.user-session"
  : "vertax.user-session";
const adminCookie = useSecureCookies
  ? "__Secure-vertax.admin-session"
  : "vertax.admin-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.AUTH_SECRET;

  if (pathname.startsWith("/admin")) {
    if (
      pathname.startsWith("/admin/login") ||
      pathname.startsWith("/api/admin/auth")
    ) {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret,
      cookieName: adminCookie,
      salt: adminCookie,
    });

    if (!token?.sub) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const needsUserAuth =
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    (pathname.startsWith("/pay/") && !pathname.startsWith("/pay/success"));

  if (needsUserAuth) {
    const token = await getToken({
      req: request,
      secret,
      cookieName: userCookie,
      salt: userCookie,
    });

    if (!token?.sub) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*", "/pay/:path*"],
};

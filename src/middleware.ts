import { NextRequest, NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "revshield2026";

export function middleware(request: NextRequest) {
  // Skip password check for API routes and static assets
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/auth"
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("revshield_auth");
  if (authCookie?.value === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Check for password in query param (for easy sharing: ?pw=revshield2026)
  const pw = request.nextUrl.searchParams.get("pw");
  if (pw === SITE_PASSWORD) {
    const response = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.set("revshield_auth", SITE_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Redirect to auth page
  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set("redirect", pathname);
  return NextResponse.rewrite(authUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

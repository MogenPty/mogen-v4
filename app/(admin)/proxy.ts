import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes requiring authentication
    '/account/:path*',
  ],
};

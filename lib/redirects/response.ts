import { NextRequest, NextResponse } from "next/server";
import { redirectLocation, type RouteResolution } from "./engine";

export function responseForRouteResolution(
  request: NextRequest,
  resolution: RouteResolution,
): NextResponse | null {
  if (resolution.kind === "redirect") {
    return NextResponse.redirect(redirectLocation(request.nextUrl, resolution), resolution.statusCode);
  }
  if (resolution.kind === "gone") {
    return new NextResponse(null, {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}


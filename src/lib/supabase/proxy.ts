import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/tokens";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // API handlers authorize themselves; retired auth URLs stay reachable.
  if (path === "/api" || path.startsWith("/api/") || path === "/auth" || path.startsWith("/auth/") ||
      ["/signup", "/forgot-password", "/reset-password"].includes(path)) {
    return NextResponse.next();
  }
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const response = !user && path !== "/login"
    ? NextResponse.redirect(new URL("/login", request.url))
    : user && path === "/login"
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

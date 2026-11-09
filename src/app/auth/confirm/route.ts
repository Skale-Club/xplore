import { NextResponse, type NextRequest } from "next/server";

// Legacy Supabase email links cannot establish application sessions.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

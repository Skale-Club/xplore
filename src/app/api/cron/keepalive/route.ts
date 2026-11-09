import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("games").select("id").limit(1);

  if (error) {
    console.error("[cron/keepalive] Supabase ping failed:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 502 }
    );
  }

  const { error: cleanupError } = await supabase.from("app_sessions")
    .delete().lt("expires_at", new Date().toISOString());
  if (cleanupError) {
    return NextResponse.json({ ok: false, error: "Session cleanup failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseRealtimeToken } from "@/lib/auth/supabaseRealtime";

export const dynamic = "force-dynamic";

/** Provides an authority/admin browser with a short-lived Realtime-only JWT. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["authority", "admin"]);
  if (auth.errorResponse) return auth.errorResponse;

  const token = await createSupabaseRealtimeToken(auth.session);
  if (!token) {
    return NextResponse.json(
      { error: "Realtime is not configured on this deployment." },
      { status: 503 }
    );
  }

  return NextResponse.json({ token, expiresAt: new Date(Date.now() + 15 * 60 * 1_000).toISOString() });
}

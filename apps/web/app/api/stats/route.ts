import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";
import { requireAuth } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ['authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const stats = await getDashboardStats();
    if (!stats) {
      // Supabase unreachable/unconfigured — report zeros rather than inventing numbers.
      return NextResponse.json({
        success: false,
        stats: { activeTourists: 0, liveIncidents: 0, highRiskZones: 0, respondersAvailable: 0, respondersTotal: 0 },
      });
    }
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

